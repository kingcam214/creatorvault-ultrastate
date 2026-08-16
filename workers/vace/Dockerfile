FROM nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    VACE_ROOT=/opt/VACE \
    VACE_MODEL_DIR=/models/Wan2.1-VACE-14B \
    VACE_WORK_DIR=/workspace \
    PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 python3.10-venv python3-pip git ffmpeg curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN python3.10 -m pip install --no-cache-dir --upgrade pip \
    && python3.10 -m pip install --no-cache-dir \
      torch==2.5.1 torchvision==0.20.1 --index-url https://download.pytorch.org/whl/cu124 \
    && python3.10 -m pip install --no-cache-dir huggingface_hub

RUN git clone --depth 1 https://github.com/ali-vilab/VACE.git ${VACE_ROOT} \
    && python3.10 -m pip install --no-cache-dir -r ${VACE_ROOT}/requirements.txt \
    && python3.10 -m pip install --no-cache-dir wan@git+https://github.com/Wan-Video/Wan2.1

COPY requirements.txt /tmp/creatorvault-worker-requirements.txt
RUN python3.10 -m pip install --no-cache-dir -r /tmp/creatorvault-worker-requirements.txt

COPY app /app
RUN mkdir -p /workspace/jobs /workspace/results /models \
    && useradd --create-home --uid 10001 creatorvault \
    && chown -R creatorvault:creatorvault /workspace /app /models

USER creatorvault
WORKDIR /app
EXPOSE 8080
CMD ["python3.10", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
