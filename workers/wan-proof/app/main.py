from __future__ import annotations

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
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse

PROTOCOL_VERSION = "creatorvault-wan-animate-2-proof/v1"
MODEL_KEY = "Wan-AI/Wan2.2-Animate-2-14B:distillation"
REFERENCE_URL = "https://creatorvault.live/images/kingcam-profile/kingcam-crown-lounge-reference.png"
DRIVER_URL = "https://creatorvault.live/uploads/content-vault/e46fd473-3bfb-45da-bbb8-47f8e03e26bf/kingcam-controlled-performance-0135-0147.mov"
WAN_ROOT = Path(os.getenv("WAN_ROOT", "/opt/Wan-Animate-2"))
WAN_MODEL_DIR = Path(os.getenv("WAN_MODEL_DIR", "/models/Wan-AI/Wan2.2-Animate-2-14B"))
WAN_WORK_DIR = Path(os.getenv("WAN_WORK_DIR", "/workspace"))
WORKER_TOKEN = os.getenv("CREATORVAULT_WAN_PROOF_WORKER_TOKEN", "").strip()
DOWNLOAD_TIMEOUT_SECONDS = 180
INFERENCE_TIMEOUT_SECONDS = 13_800
FPS = 24
CLIP_LEN = 121
WIDTH = 480
HEIGHT = 640
SEED = 2142026
STEPS = 10

PROMPT = "一名成年男性，戴金色王冠和黑色墨镜，穿深红色刺绣西装、金色项链和黑金鞋。他完整地执行驱动视频中的自然全身动作。保留稳定的全身构图、暖色室内环境和自然身体比例。"
PROMPT_REF = "深红色刺绣西装、金色王冠、黑色墨镜、金色项链、黑金鞋的成年男性，暖色室内深色皮质沙发环境，全身可见。"
NEGATIVE_PROMPT = "字幕，文字，静止，冻结，额外手臂，额外腿，重复肢体，手指融合，损坏手部，损坏脸部，身体变形，服装融化，身份改变，裁切，旋转，闪烁，低质量。"

app = FastAPI(title="CreatorVault Wan-Animate-2 Proof Worker", version=PROTOCOL_VERSION)
job_state: dict[str, dict[str, Any]] = {}
execution_lock = threading.Lock()


def require_worker_token(x_creatorvault_worker_token: str = Header(default="")) -> None:
    if not WORKER_TOKEN or x_creatorvault_worker_token != WORKER_TOKEN:
        raise HTTPException(status_code=401, detail="CreatorVault Wan proof worker authentication failed")


def safe_creatorvault_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.netloc != "creatorvault.live":
        raise RuntimeError("The Wan proof worker accepts only locked CreatorVault HTTPS assets")
    return url


def download_locked(url: str, destination: Path) -> str:
    safe_creatorvault_url(url)
    response = requests.get(url, stream=True, timeout=DOWNLOAD_TIMEOUT_SECONDS)
    response.raise_for_status()
    destination.parent.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    with destination.open("wb") as handle:
        for chunk in response.iter_content(chunk_size=1024 * 1024):
            if chunk:
                digest.update(chunk)
                handle.write(chunk)
    return digest.hexdigest()


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
    corrected = "with torch.device('meta'):\n                torch.set_default_dtype(torch.bfloat16)\n                model = build_object_from_dict(cfg.model.transformer)"
    return corrected in source


def model_ready() -> bool:
    return WAN_MODEL_DIR.exists() and any(WAN_MODEL_DIR.iterdir()) and (WAN_ROOT / "infer" / "wan_animate_2_demo.py").is_file() and official_bf16_patch_present()


def inspect_video(path: Path) -> dict[str, Any]:
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "format=duration:stream=width,height,codec_name", "-of", "json", str(path)],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    if probe.returncode != 0:
        raise RuntimeError("Wan proof produced an unreadable video container")
    payload = json.loads(probe.stdout or "{}")
    stream = (payload.get("streams") or [])[0]
    duration = float((payload.get("format") or {}).get("duration") or 0)
    width = int(stream.get("width") or 0)
    height = int(stream.get("height") or 0)
    if duration <= 0 or width <= 0 or height <= 0:
        raise RuntimeError("Wan proof output has no readable visual stream")
    sample_times = sorted({min(max(duration * fraction, 0.05), max(duration - 0.05, 0.05)) for fraction in (0.2, 0.5, 0.8)})
    luminance: list[float] = []
    for sample_time in sample_times:
        frame = subprocess.run(
            ["ffmpeg", "-v", "error", "-ss", f"{sample_time:.3f}", "-i", str(path), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "pipe:1"],
            capture_output=True,
            timeout=120,
            check=False,
        )
        if frame.returncode != 0 or not frame.stdout:
            raise RuntimeError("Wan proof output has an unreadable sampled frame")
        luminance.append(round(sum(frame.stdout) / len(frame.stdout), 3))
    if max(luminance, default=0) < 4:
        raise RuntimeError("Wan proof output is visually empty and is rejected before review")
    return {"durationSeconds": round(duration, 3), "width": width, "height": height, "codec": stream.get("codec_name"), "sampleLuminance": luminance}


def execute_proof(job_id: str) -> None:
    job_dir = WAN_WORK_DIR / "jobs" / job_id
    output_dir = WAN_WORK_DIR / "results" / job_id
    reference_path = job_dir / "kingcam-reference.png"
    driver_path = job_dir / "kingcam-driving-performance.mov"
    silent_path = output_dir / "kingcam-wan-animate-2-proof-silent.mp4"
    try:
        job_state[job_id] = {"state": "downloading_locked_creatorvault_assets", "modelKey": MODEL_KEY}
        reference_sha256 = download_locked(REFERENCE_URL, reference_path)
        driver_sha256 = download_locked(DRIVER_URL, driver_path)
        if not model_ready():
            raise RuntimeError("Official Wan model package or required BF16 correction is not ready on this worker")
        gpu = gpu_snapshot()
        if not gpu["available"]:
            raise RuntimeError("No compatible NVIDIA GPU is available on this worker")
        job_state[job_id] = {"state": "running_official_wan_animate_2", "modelKey": MODEL_KEY, "gpu": gpu["detail"], "seed": SEED}
        output_dir.mkdir(parents=True, exist_ok=True)
        command = [
            "python3.11", str(WAN_ROOT / "infer" / "wan_animate_2_demo.py"),
            "--config", "/app/wan_animate_2_proof.yaml",
            "--refer-img-file", str(reference_path),
            "--refer-video-file", str(driver_path),
            "--save-dir", str(output_dir),
            "--width", str(WIDTH),
            "--height", str(HEIGHT),
            "--fps", str(FPS),
            "--clip_len", str(CLIP_LEN),
            "--step", str(STEPS),
            "--sample_guide_scale", "1.0",
            "--seed", str(SEED),
            "--prompt", PROMPT,
            "--prompt_ref", PROMPT_REF,
        ]
        completed = subprocess.run(command, cwd=str(WAN_ROOT), capture_output=True, text=True, timeout=INFERENCE_TIMEOUT_SECONDS, check=False)
        (output_dir / "inference.stdout.log").write_text(completed.stdout[-12_000:])
        (output_dir / "inference.stderr.log").write_text(completed.stderr[-12_000:])
        generated_candidates = sorted(output_dir.glob("session_*/results.mp4"), key=lambda path: path.stat().st_mtime, reverse=True)
        generated_path = generated_candidates[0] if generated_candidates else None
        if completed.returncode != 0 or not generated_path or not generated_path.is_file():
            raise RuntimeError(f"Official Wan inference failed: {completed.stderr[-1500:] or completed.stdout[-1500:]}")
        silent = subprocess.run(
            ["ffmpeg", "-y", "-i", str(generated_path), "-map", "0:v:0", "-an", "-c:v", "copy", str(silent_path)],
            capture_output=True,
            text=True,
            timeout=300,
            check=False,
        )
        if silent.returncode != 0 or not silent_path.is_file():
            raise RuntimeError(f"Silent technical packaging failed: {silent.stderr[-1000:]}")
        proof = inspect_video(silent_path)
        job_state[job_id] = {
            "state": "completed_requires_visual_quality_review",
            "modelKey": MODEL_KEY,
            "referenceSha256": reference_sha256,
            "driverSha256": driver_sha256,
            "outputSha256": hashlib.sha256(silent_path.read_bytes()).hexdigest(),
            "outputBytes": silent_path.stat().st_size,
            "visualProof": proof,
            "outputPath": str(silent_path),
            "noAutomaticRetry": True,
        }
    except Exception as error:
        job_state[job_id] = {"state": "failed", "modelKey": MODEL_KEY, "reason": str(error)[:3000], "noAutomaticRetry": True}


@app.get("/health", dependencies=[Depends(require_worker_token)])
def health() -> dict[str, Any]:
    gpu = gpu_snapshot()
    ready = gpu["available"] and model_ready()
    return {
        "protocolVersion": PROTOCOL_VERSION,
        "modelKey": MODEL_KEY,
        "gpu": gpu,
        "modelReady": model_ready(),
        "bf16MemoryCorrection": official_bf16_patch_present(),
        "state": "ready" if ready else "not_ready",
    }


@app.post("/v1/kingcam-proof/run", dependencies=[Depends(require_worker_token)])
def create_proof(background_tasks: BackgroundTasks) -> dict[str, Any]:
    if not execution_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="A Wan proof job is already active")
    if any(state.get("state") == "completed_requires_visual_quality_review" for state in job_state.values()):
        execution_lock.release()
        raise HTTPException(status_code=409, detail="A completed Wan proof requires visual quality review before another run")
    job_id = str(uuid.uuid4())
    job_state[job_id] = {"state": "queued", "modelKey": MODEL_KEY, "noAutomaticRetry": True}

    def run_and_release() -> None:
        try:
            execute_proof(job_id)
        finally:
            execution_lock.release()

    background_tasks.add_task(run_and_release)
    return {"workerJobId": job_id, "state": "queued", "modelKey": MODEL_KEY, "noAutomaticRetry": True}


@app.get("/v1/kingcam-proof/jobs/{worker_job_id}", dependencies=[Depends(require_worker_token)])
def get_proof(worker_job_id: str) -> dict[str, Any]:
    state = job_state.get(worker_job_id)
    if not state:
        raise HTTPException(status_code=404, detail="Unknown CreatorVault Wan proof job")
    return {key: value for key, value in state.items() if key != "outputPath"}


@app.get("/v1/kingcam-proof/jobs/{worker_job_id}/output", dependencies=[Depends(require_worker_token)])
def get_output(worker_job_id: str) -> FileResponse:
    state = job_state.get(worker_job_id)
    output_path = Path(str(state.get("outputPath", ""))) if state else None
    if not state or state.get("state") != "completed_requires_visual_quality_review" or not output_path or not output_path.is_file():
        raise HTTPException(status_code=404, detail="Completed CreatorVault Wan proof output is not available")
    return FileResponse(output_path, media_type="video/mp4", filename="KingCam-Wan-Animate-2-Proof.mp4")
