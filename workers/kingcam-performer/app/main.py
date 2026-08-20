import hashlib
import json
import os
import shutil
import subprocess
import threading
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests
import yaml
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

PROTOCOL_VERSION = "creatorvault-kingcam-full-body-performer/v1"
WAN_MODEL_KEY = "Wan-AI/Wan2.2-Animate-2-14B:distillation"
MUSE_MODEL_KEY = "TMElyralab/MuseTalk:1.5"
WAN_ROOT = Path(os.getenv("WAN_ROOT", "/opt/Wan-Animate-2"))
MUSE_ROOT = Path(os.getenv("MUSE_ROOT", "/opt/MuseTalk"))
WAN_MODEL_DIR = Path(os.getenv("WAN_MODEL_DIR", "/models/Wan-AI/Wan2.2-Animate-2-14B"))
MUSE_MODEL_DIR = Path(os.getenv("MUSE_MODEL_DIR", "/models/MuseTalk/models"))
WORK_DIR = Path(os.getenv("KINGCAM_WORK_DIR", "/workspace"))
WORKER_TOKEN = os.getenv("CREATORVAULT_KINGCAM_PERFORMER_WORKER_TOKEN", "").strip()
DOWNLOAD_TIMEOUT_SECONDS = 180
WAN_TIMEOUT_SECONDS = 13_800
MUSE_TIMEOUT_SECONDS = 3_600
FPS = 24
CLIP_LEN = 177
WIDTH = 720
HEIGHT = 1280
STEPS = 10

PROMPT = (
    "一名成年男性，戴金色王冠和黑色墨镜，穿深红色刺绣西装、金色项链和黑金鞋。"
    "他完整地执行驱动视频中的自然全身动作，保持完整身体比例、手部、脚部、暖色室内环境和稳定身份。"
)
PROMPT_REF = "深红色刺绣西装、金色王冠、黑色墨镜、金色项链、黑金鞋的成年男性，暖色室内深色皮质沙发环境，全身可见。"
NEGATIVE_PROMPT = "字幕，文字，静止，冻结，额外手臂，额外腿，重复肢体，手指融合，损坏手部，损坏脸部，身体变形，服装融化，身份改变，裁切，旋转，闪烁，低质量。"


class PerformerRunRequest(BaseModel):
    identity_url: str = Field(min_length=20, max_length=2048)
    motion_url: str = Field(min_length=20, max_length=2048)
    voice_url: str = Field(min_length=20, max_length=2048)
    benchmark_key: str = Field(min_length=3, max_length=80)
    prompt: str = Field(default=PROMPT, min_length=20, max_length=2000)
    prompt_ref: str = Field(default=PROMPT_REF, min_length=20, max_length=2000)


app = FastAPI(title="CreatorVault KingCam Full-Body Performer Worker", version=PROTOCOL_VERSION)
job_state: dict[str, dict[str, Any]] = {}
execution_lock = threading.Lock()


def require_worker_token(x_creatorvault_worker_token: str = Header(default="")) -> None:
    if not WORKER_TOKEN or x_creatorvault_worker_token != WORKER_TOKEN:
        raise HTTPException(status_code=401, detail="CreatorVault KingCam performer worker authentication failed")


def safe_creatorvault_url(url: str) -> str:
    try:
        parsed = urlparse(str(url))
    except Exception as error:
        raise RuntimeError("KingCam performer received an invalid source URL") from error
    if parsed.scheme != "https" or parsed.netloc != "creatorvault.live" or not parsed.path.startswith(("/uploads/", "/images/", "/api/media/")):
        raise RuntimeError("KingCam performer accepts only approved CreatorVault HTTPS source assets")
    return url


def download_locked(url: str, destination: Path) -> str:
    source = safe_creatorvault_url(url)
    response = requests.get(source, stream=True, timeout=DOWNLOAD_TIMEOUT_SECONDS)
    response.raise_for_status()
    destination.parent.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    with destination.open("wb") as handle:
        for chunk in response.iter_content(chunk_size=1024 * 1024):
            if chunk:
                digest.update(chunk)
                handle.write(chunk)
    if destination.stat().st_size <= 0:
        raise RuntimeError("KingCam performer downloaded an empty approved source")
    return digest.hexdigest()


def run(command: list[str], *, cwd: Path, timeout: int, label: str) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(command, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, check=False)
    if completed.returncode != 0:
        raise RuntimeError(f"{label} failed: {(completed.stderr or completed.stdout)[-1800:]}")
    return completed


def gpu_snapshot() -> dict[str, Any]:
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader"],
            check=True,
            capture_output=True,
            text=True,
            timeout=15,
        )
        return {"available": True, "detail": result.stdout.strip()}
    except Exception:
        return {"available": False, "detail": "nvidia-smi unavailable"}


def official_bf16_patch_present() -> bool:
    pipeline = WAN_ROOT / "pipelines" / "wan_animate_2_pipeline.py"
    if not pipeline.is_file():
        return False
    source = pipeline.read_text()
    return "with torch.device('meta'):\n                torch.set_default_dtype(torch.bfloat16)\n                model = build_object_from_dict(cfg.model.transformer)" in source


def wan_ready() -> bool:
    return WAN_MODEL_DIR.exists() and any(WAN_MODEL_DIR.iterdir()) and (WAN_ROOT / "infer" / "wan_animate_2_demo.py").is_file() and official_bf16_patch_present()


def muse_ready() -> bool:
    required = [
        MUSE_MODEL_DIR / "musetalkV15" / "unet.pth",
        MUSE_MODEL_DIR / "musetalkV15" / "musetalk.json",
        MUSE_MODEL_DIR / "sd-vae" / "diffusion_pytorch_model.bin",
        MUSE_MODEL_DIR / "whisper" / "pytorch_model.bin",
        MUSE_MODEL_DIR / "dwpose" / "dw-ll_ucoco_384.pth",
        MUSE_MODEL_DIR / "syncnet" / "latentsync_syncnet.pt",
        MUSE_MODEL_DIR / "face-parse-bisent" / "79999_iter.pth",
    ]
    return (MUSE_ROOT / "scripts" / "inference.py").is_file() and all(path.is_file() for path in required)


def inspect_video(path: Path) -> dict[str, Any]:
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height,codec_name", "-select_streams", "v:0", "-of", "json", str(path)],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    if probe.returncode != 0:
        raise RuntimeError("KingCam performer created an unreadable video container")
    payload = json.loads(probe.stdout or "{}")
    stream = (payload.get("streams") or [{}])[0]
    duration = float((payload.get("format") or {}).get("duration") or 0)
    width = int(stream.get("width") or 0)
    height = int(stream.get("height") or 0)
    if duration <= 0 or width <= 0 or height <= 0:
        raise RuntimeError("KingCam performer output has no readable visual stream")
    if height < width:
        raise RuntimeError("KingCam performer output violated the required vertical delivery framing")
    return {"durationSeconds": round(duration, 3), "width": width, "height": height, "codec": stream.get("codec_name")}


def newest_video(root: Path, excluded: set[Path]) -> Path:
    candidates = [path for path in root.rglob("*.mp4") if path.is_file() and path not in excluded]
    if not candidates:
        raise RuntimeError("KingCam performer stage did not create a video output")
    return max(candidates, key=lambda path: path.stat().st_mtime)


def render_performance(job_id: str, request: PerformerRunRequest) -> None:
    job_dir = WORK_DIR / "jobs" / job_id
    result_dir = WORK_DIR / "results" / job_id
    identity_path = job_dir / "kingcam-identity.png"
    motion_path = job_dir / "kingcam-motion.mov"
    voice_path = job_dir / "kingcam-voice.mp3"
    wan_dir = result_dir / "wan"
    muse_dir = result_dir / "musetalk"
    final_path = result_dir / "kingcam-full-body-talking-performance.mp4"
    try:
        job_state[job_id] = {"state": "downloading_approved_creatorvault_inputs", "benchmarkKey": request.benchmark_key}
        source_hashes = {
            "identitySha256": download_locked(request.identity_url, identity_path),
            "motionSha256": download_locked(request.motion_url, motion_path),
            "voiceSha256": download_locked(request.voice_url, voice_path),
        }
        if not wan_ready():
            raise RuntimeError("Official Wan Animate-2 model or BF16 correction is not ready on this worker")
        if not muse_ready():
            raise RuntimeError("Official MuseTalk model package is not ready on this worker")
        gpu = gpu_snapshot()
        if not gpu["available"]:
            raise RuntimeError("No compatible NVIDIA GPU is available on this worker")

        job_state[job_id] = {"state": "rendering_full_body_identity_motion", "benchmarkKey": request.benchmark_key, "gpu": gpu["detail"], **source_hashes}
        wan_dir.mkdir(parents=True, exist_ok=True)
        wan_command = [
            "python3.11", str(WAN_ROOT / "infer" / "wan_animate_2_demo.py"),
            "--config", "/app/wan_animate_2_performer.yaml",
            "--refer-img-file", str(identity_path),
            "--refer-video-file", str(motion_path),
            "--save-dir", str(wan_dir),
            "--width", str(WIDTH),
            "--height", str(HEIGHT),
            "--fps", str(FPS),
            "--clip_len", str(CLIP_LEN),
            "--step", str(STEPS),
            "--sample_guide_scale", "1.0",
            "--seed", "2142026",
            "--prompt", request.prompt,
            "--prompt_ref", request.prompt_ref,
        ]
        completed = run(wan_command, cwd=WAN_ROOT, timeout=WAN_TIMEOUT_SECONDS, label="KingCam Wan full-body stage")
        (wan_dir / "inference.stdout.log").write_text(completed.stdout[-12_000:])
        (wan_dir / "inference.stderr.log").write_text(completed.stderr[-12_000:])
        motion_output = newest_video(wan_dir, set())
        wan_proof = inspect_video(motion_output)

        job_state[job_id] = {"state": "synchronizing_real_kingcam_voice", "benchmarkKey": request.benchmark_key, "wanProof": wan_proof, **source_hashes}
        muse_dir.mkdir(parents=True, exist_ok=True)
        muse_config = muse_dir / "inference.yaml"
        muse_config.write_text(yaml.safe_dump({"task_0": {"video_path": str(motion_output), "audio_path": str(voice_path), "bbox_shift": -7}}, sort_keys=False))
        existing = set(muse_dir.rglob("*.mp4"))
        muse_command = [
            "python3.11", "-m", "scripts.inference",
            "--inference_config", str(muse_config),
            "--result_dir", str(muse_dir),
            "--unet_model_path", str(MUSE_MODEL_DIR / "musetalkV15" / "unet.pth"),
            "--unet_config", str(MUSE_MODEL_DIR / "musetalkV15" / "musetalk.json"),
            "--version", "v15",
            "--ffmpeg_path", "ffmpeg",
        ]
        completed = run(muse_command, cwd=MUSE_ROOT, timeout=MUSE_TIMEOUT_SECONDS, label="KingCam real-voice mouth-performance stage")
        (muse_dir / "inference.stdout.log").write_text(completed.stdout[-12_000:])
        (muse_dir / "inference.stderr.log").write_text(completed.stderr[-12_000:])
        talking_output = newest_video(muse_dir, existing)
        shutil.copyfile(talking_output, final_path)
        final_proof = inspect_video(final_path)
        job_state[job_id] = {
            "state": "completed_requires_five_gate_review",
            "benchmarkKey": request.benchmark_key,
            "models": {"motion": WAN_MODEL_KEY, "mouthPerformance": MUSE_MODEL_KEY},
            "sourceUrls": {"identity": request.identity_url, "motion": request.motion_url, "voice": request.voice_url},
            **source_hashes,
            "wanProof": wan_proof,
            "finalProof": final_proof,
            "outputSha256": hashlib.sha256(final_path.read_bytes()).hexdigest(),
            "outputBytes": final_path.stat().st_size,
            "outputPath": str(final_path),
            "noAutomaticRetry": True,
        }
    except Exception as error:
        job_state[job_id] = {"state": "failed", "benchmarkKey": request.benchmark_key, "reason": str(error)[:3000], "noAutomaticRetry": True}


@app.get("/health", dependencies=[Depends(require_worker_token)])
def health() -> dict[str, Any]:
    gpu = gpu_snapshot()
    ready = gpu["available"] and wan_ready() and muse_ready()
    return {
        "protocolVersion": PROTOCOL_VERSION,
        "models": {"motion": WAN_MODEL_KEY, "mouthPerformance": MUSE_MODEL_KEY},
        "gpu": gpu,
        "wanReady": wan_ready(),
        "museReady": muse_ready(),
        "bf16MemoryCorrection": official_bf16_patch_present(),
        "state": "ready" if ready else "not_ready",
    }


@app.post("/v1/kingcam-performer/runs", dependencies=[Depends(require_worker_token)])
def create_performance_run(request: PerformerRunRequest, background_tasks: BackgroundTasks) -> dict[str, Any]:
    if not execution_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="A KingCam performer job is already active")
    if any(state.get("state") == "completed_requires_five_gate_review" for state in job_state.values()):
        execution_lock.release()
        raise HTTPException(status_code=409, detail="A completed KingCam performer job requires five-gate review before another run")
    job_id = str(uuid.uuid4())
    job_state[job_id] = {"state": "queued", "benchmarkKey": request.benchmark_key, "noAutomaticRetry": True}

    def run_and_release() -> None:
        try:
            render_performance(job_id, request)
        finally:
            execution_lock.release()

    background_tasks.add_task(run_and_release)
    return {"workerJobId": job_id, "state": "queued", "benchmarkKey": request.benchmark_key, "noAutomaticRetry": True}


@app.get("/v1/kingcam-performer/runs/{worker_job_id}", dependencies=[Depends(require_worker_token)])
def get_performance_run(worker_job_id: str) -> dict[str, Any]:
    state = job_state.get(worker_job_id)
    if not state:
        raise HTTPException(status_code=404, detail="Unknown KingCam performer job")
    return {key: value for key, value in state.items() if key != "outputPath"}


@app.get("/v1/kingcam-performer/runs/{worker_job_id}/output", dependencies=[Depends(require_worker_token)])
def get_performance_output(worker_job_id: str) -> FileResponse:
    state = job_state.get(worker_job_id)
    output_path = Path(str(state.get("outputPath", ""))) if state else None
    if not state or state.get("state") != "completed_requires_five_gate_review" or not output_path or not output_path.is_file():
        raise HTTPException(status_code=404, detail="Completed KingCam performer output is not available")
    return FileResponse(output_path, media_type="video/mp4", filename="KingCam-Full-Body-Talking-Performer.mp4")
