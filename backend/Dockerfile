# ── Stage 1: builder ─────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# System deps for OpenCV headless
RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libgl1-mesa-glx \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

LABEL maintainer="HumanCount <team@humancount.ai>"
LABEL description="HumanCount API — YOLOv8 human detection service"

# System runtime libs
RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libgl1-mesa-glx \
        libgomp1 \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /install /usr/local

WORKDIR /app

# App source
COPY . .

# Create directories
RUN mkdir -p /tmp/humancount/uploads /tmp/humancount/outputs

# Pre-download YOLO model at build time (avoids first-request latency)
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

# Non-root user for security
RUN useradd -m -u 1001 appuser && chown -R appuser /app /tmp/humancount
USER appuser

EXPOSE 8000

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose Render port
EXPOSE 10000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
