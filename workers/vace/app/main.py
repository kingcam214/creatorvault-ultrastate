from __future__ import annotations

import asyncio
import hashlib
import json
import os
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Any, Literal
from urllib.parse import urlparse

import requests
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, HttpUrl, field_validator

PROTOCOL_VERSION = "creatorvault-vace-worker/v1"
MODEL_KEY = "wan/wan2.1-vace-14b-masked-video-edit"
MAX_SEGMENT_MS = 5_000
VACE_ROOT = Path(os.getenv("VACE_ROOT", "/opt/VACE"))
VACE_MODEL_DIR = Path(os.getenv("VACE_MODEL_DIR", "/models/Wan2.1-VACE-14B"))
VACE_WORK_DIR = Path(os.getenv("VACE_WORK_DIR", "/workspace"))
WORKER_TOKEN = os.getenv("CREATORVAULT_VACE_WORKER_TOKEN", "").strip()
CALLBACK_TIMEOUT_SECONDS = 30
DOWNLOAD_TIMEOUT_SECONDS = 120

app = FastAPI(title="CreatorVault VACE Worker", version=PROTOCOL_VERSION)
job_state: dict[str, dict[str, Any]] = {}


class ProtectedSource(BaseModel):
    sourceUrl: HttpUrl
    sourceChecksum: str = Field(pattern=r"^[a-f0-9]{64}$")
    evidenceId: str = Field(min_length=1)
    sourceMapId: str = Field(min_length=1)
    editBlueprintId: str = Field(min_length=1)
    clipStartMs: int = Field(ge=0)
    clipEndMs: int = Field(gt=0)
    referenceFrameUrls: list[HttpUrl] = Field(min_length=1, max_length=3)
    temporalSubjectMaskUrl: HttpUrl
    depthControlUrl: HttpUrl
    opticalFlowUrl: HttpUrl

    @field_validator("clipEndMs")
    @classmethod
    def limit_segment_length(cls, value: int, info):
        start = info.data.get("clipStartMs", 0)
        if value <= start or value - start > MAX_SEGMENT_MS:
            raise ValueError("VACE worker accepts only a verified source segment of five seconds or less")
        return value


class VaceContract(BaseModel):
    protocolVersion: Literal[PROTOCOL_VERSION]
    jobKey: str = Field(min_length=1, max_length=120)
    modelKey: Literal[MODEL_KEY]
    output: dict[str, Any]
    source: ProtectedSource
    changeSet: dict[str, Any]
    preservation: dict[str, bool]
    noPromptExtension: Literal[True]
    noAutomaticRetry: Literal[True]

    @field_validator("changeSet")
    @classmethod
    def accept_only_lighting_change_set(cls, value: dict[str, Any]):
        if value.get("kind") != "lighting_only":
            raise ValueError("Only the explicit lighting-only Body Cinema VACE change set is accepted")
        prohibited = set(value.get("prohibitedChanges") or [])
        expected = {
            "identity_or_face_change",
            "body_or_anatomy_change",
            "skin_smoothing_or_body_reshaping",
            "wardrobe_change",
            "prop_change",
            "environment_geometry_change",
            "invented_motion_or_camera_path",
            "framing_or_timing_change",
            "audio_replacement_or_removal",
        }
        if not expected.issubset(prohibited):
            raise ValueError("The CreatorVault VACE protection map is incomplete")
        return value


class VaceExecutionRequest(BaseModel):
    contract: VaceContract
    outputUploadUrl: HttpUrl
    callbackUrl: HttpUrl
    callbackToken: str = Field(min_length=32, max_length=512)


def require_worker_token(x_creatorvault_worker_token: str = Header(default="")) -> None:
    if not WORKER_TOKEN or x_creatorvault_worker_token != WORKER_TOKEN:
        raise HTTPException(status_code=401, detail="CreatorVault VACE worker authentication failed")


def safe_https(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("CreatorVault VACE worker accepts secure signed asset URLs only")
    return url


def download_verified(url: str, destination: Path) -> None:
    safe_https(url)
    response = requests.get(url, stream=True, timeout=DOWNLOAD_TIMEOUT_SECONDS)
    response.raise_for_status()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("wb") as handle:
        for chunk in response.iter_content(chunk_size=1024 * 1024):
            if chunk:
                handle.write(chunk)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def gpu_snapshot() -> dict[str, Any]:
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader"],
            check=True,
            capture_output=True,
            text=True,
            timeout=10,
        )
        return {"available": True, "detail": result.stdout.strip()}
    except Exception:
        return {"available": False, "detail": "nvidia-smi unavailable"}


def model_ready() -> bool:
    return VACE_MODEL_DIR.exists() and any(VACE_MODEL_DIR.iterdir()) and (VACE_ROOT / "vace" / "vace_wan_inference.py").exists()


def submit_callback(url: str, token: str, payload: dict[str, Any]) -> None:
    safe_https(url)
    response = requests.post(
        url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=payload,
        timeout=CALLBACK_TIMEOUT_SECONDS,
    )
    response.raise_for_status()


def upload_output(url: str, path: Path) -> None:
    safe_https(url)
    with path.open("rb") as handle:
        response = requests.put(url, data=handle, headers={"Content-Type": "video/mp4"}, timeout=DOWNLOAD_TIMEOUT_SECONDS)
    response.raise_for_status()


def assert_preservation_flags(contract: VaceContract) -> None:
    required = {
        "identity", "face", "bodyAnatomy", "naturalSkin", "wardrobe", "originalPerformance",
        "originalMotionTiming", "cameraMovement", "framing", "environmentGeometry", "originalAudio",
    }
    if any(contract.preservation.get(flag) is not True for flag in required):
        raise ValueError("The CreatorVault VACE preservation flags are incomplete")
    if contract.output.get("resolution") != "720p" or contract.output.get("preserveSourceAudio") is not True:
        raise ValueError("The worker only accepts the reviewed 720p source-audio-preserving VACE output contract")


async def execute_vace(job_id: str, request: VaceExecutionRequest) -> None:
    job_dir = VACE_WORK_DIR / "jobs" / job_id
    result_dir = VACE_WORK_DIR / "results" / job_id
    source_path = job_dir / "source.mp4"
    mask_path = job_dir / "temporal-subject-mask.mp4"
    depth_path = job_dir / "depth-control.mp4"
    flow_path = job_dir / "optical-flow.mp4"
    refs_dir = job_dir / "references"
    output_path = result_dir / "vace-output.mp4"
    contract = request.contract
    try:
        job_state[job_id] = {"state": "downloading_guarded_inputs", "jobKey": contract.jobKey}
        download_verified(str(contract.source.sourceUrl), source_path)
        if sha256(source_path) != contract.source.sourceChecksum:
            raise RuntimeError("Source checksum mismatch: refusing VACE inference")
        download_verified(str(contract.source.temporalSubjectMaskUrl), mask_path)
        download_verified(str(contract.source.depthControlUrl), depth_path)
        download_verified(str(contract.source.opticalFlowUrl), flow_path)
        reference_paths: list[Path] = []
        for index, url in enumerate(contract.source.referenceFrameUrls):
            path = refs_dir / f"reference-{index}.png"
            download_verified(str(url), path)
            reference_paths.append(path)

        if not model_ready():
            raise RuntimeError("VACE model package is not present on this GPU worker")
        if not gpu_snapshot()["available"]:
            raise RuntimeError("No compatible NVIDIA GPU is available on this worker")

        job_state[job_id] = {"state": "running_vace", "jobKey": contract.jobKey}
        result_dir.mkdir(parents=True, exist_ok=True)
        instruction = "Improve only existing scene lighting and tonal separation. Preserve the exact same person, face, body, skin texture, hair, wardrobe, props, room, camera, framing, motion timing, and original performance."
        command = [
            "python3.10", str(VACE_ROOT / "vace" / "vace_wan_inference.py"),
            "--size", "720p",
            "--model_name", "vace-14B",
            "--ckpt_dir", str(VACE_MODEL_DIR),
            "--src_video", str(source_path),
            "--src_mask", str(mask_path),
            "--src_ref_images", ",".join(str(path) for path in reference_paths),
            "--prompt", instruction,
        ]
        completed = subprocess.run(command, cwd=str(VACE_ROOT), capture_output=True, text=True, timeout=7200)
        if completed.returncode != 0:
            raise RuntimeError(f"VACE inference failed: {completed.stderr[-1500:]}")

        generated = sorted((VACE_ROOT / "results").glob("*.mp4"), key=lambda path: path.stat().st_mtime, reverse=True)
        if not generated:
            raise RuntimeError("VACE completed without a video output")
        shutil.copy2(generated[0], output_path)
        # VACE outputs visual frames only. Audio restoration is technical packaging, not a creative edit.
        muxed_path = result_dir / "vace-output-with-original-audio.mp4"
        mux = subprocess.run(
            ["ffmpeg", "-y", "-i", str(output_path), "-i", str(source_path), "-map", "0:v:0", "-map", "1:a?", "-c:v", "copy", "-c:a", "copy", "-shortest", str(muxed_path)],
            capture_output=True,
            text=True,
            timeout=300,
        )
        if mux.returncode != 0:
            raise RuntimeError(f"Original-audio packaging failed: {mux.stderr[-1000:]}")
        upload_output(str(request.outputUploadUrl), muxed_path)
        job_state[job_id] = {"state": "completed", "jobKey": contract.jobKey}
        submit_callback(str(request.callbackUrl), request.callbackToken, {
            "jobKey": contract.jobKey,
            "state": "completed",
            "workerJobId": job_id,
            "sourceChecksum": contract.source.sourceChecksum,
            "outputSha256": sha256(muxed_path),
            "outputBytes": muxed_path.stat().st_size,
        })
    except Exception as error:
        job_state[job_id] = {"state": "failed", "jobKey": contract.jobKey, "reason": str(error)[:1500]}
        try:
            submit_callback(str(request.callbackUrl), request.callbackToken, {
                "jobKey": contract.jobKey,
                "state": "failed",
                "workerJobId": job_id,
                "reason": str(error)[:1500],
            })
        except Exception:
            pass


@app.get("/health", dependencies=[Depends(require_worker_token)])
def health() -> dict[str, Any]:
    gpu = gpu_snapshot()
    return {
        "protocolVersion": PROTOCOL_VERSION,
        "modelKey": MODEL_KEY,
        "gpu": gpu,
        "modelReady": model_ready(),
        "state": "ready" if gpu["available"] and model_ready() else "not_ready",
    }


@app.post("/v1/body-cinema/jobs", dependencies=[Depends(require_worker_token)])
async def create_job(request: VaceExecutionRequest, background_tasks: BackgroundTasks) -> dict[str, Any]:
    assert_preservation_flags(request.contract)
    for candidate in [str(request.outputUploadUrl), str(request.callbackUrl)]:
        safe_https(candidate)
    job_id = str(uuid.uuid4())
    job_state[job_id] = {"state": "queued", "jobKey": request.contract.jobKey}
    background_tasks.add_task(execute_vace, job_id, request)
    return {"workerJobId": job_id, "state": "queued", "noAutomaticRetry": True}


@app.get("/v1/body-cinema/jobs/{worker_job_id}", dependencies=[Depends(require_worker_token)])
def get_job(worker_job_id: str) -> dict[str, Any]:
    state = job_state.get(worker_job_id)
    if not state:
        raise HTTPException(status_code=404, detail="Unknown CreatorVault VACE worker job")
    return state
