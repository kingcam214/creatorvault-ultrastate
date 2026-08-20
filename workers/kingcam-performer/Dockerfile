FROM nvidia/cuda:12.8.1-cudnn-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    WAN_ROOT=/opt/Wan-Animate-2 \
    MUSE_ROOT=/opt/MuseTalk \
    WAN_MODEL_DIR=/models/Wan-AI/Wan2.2-Animate-2-14B \
    MUSE_MODEL_DIR=/models/MuseTalk \
    KINGCAM_WORK_DIR=/workspace \
    PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3.11-venv python3-pip git ffmpeg curl ca-certificates ninja-build build-essential libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN python3.11 -m venv /opt/kingcam-venv
ENV PATH="/opt/kingcam-venv/bin:${PATH}"

RUN python3.11 -m pip install --no-cache-dir --upgrade pip setuptools wheel \
    && python3.11 -m pip install --no-cache-dir \
      torch==2.7.0 torchvision==0.22.0 torchaudio==2.7.0 --index-url https://download.pytorch.org/whl/cu126

RUN git clone --depth 1 https://github.com/Wan-Video/Wan-Animate-2.git ${WAN_ROOT}
COPY app/patch_wan_bf16.py /tmp/patch_wan_bf16.py
RUN python3.11 /tmp/patch_wan_bf16.py \
    && python3.11 -m pip install --no-cache-dir -r ${WAN_ROOT}/requirements.txt \
    && python3.11 -m pip install --no-cache-dir -e ${WAN_ROOT}

RUN git clone --depth 1 https://github.com/TMElyralab/MuseTalk.git ${MUSE_ROOT} \
    && python3.11 -m pip install --no-cache-dir -r ${MUSE_ROOT}/requirements.txt \
    && python3.11 -m pip install --no-cache-dir openmim \
    && mim install mmengine \
    && mim install "mmcv==2.0.1" \
    && mim install "mmdet==3.1.0" \
    && mim install "mmpose==1.1.0"

COPY requirements.txt /tmp/creatorvault-kingcam-performer-requirements.txt
RUN python3.11 -m pip install --no-cache-dir -r /tmp/creatorvault-kingcam-performer-requirements.txt

COPY app /app
RUN mkdir -p /workspace/jobs /workspace/results /models \
    && useradd --create-home --uid 10001 creatorvault \
    && chown -R creatorvault:creatorvault /workspace /app /models

USER creatorvault
WORKDIR /app
EXPOSE 8080
CMD ["python3.11", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
