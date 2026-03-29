# HumanCount 🎯

> Production-grade human detection and counting from images and videos.  
> Powered by **YOLOv8** (detection) + **ByteTrack** (multi-object tracking).

![Stack](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square)
![Stack](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square)
![Stack](https://img.shields.io/badge/CV-YOLOv8%20%2B%20ByteTrack-FF6B35?style=flat-square)
![Stack](https://img.shields.io/badge/Deploy-Docker%20%2F%20Vercel-2496ED?style=flat-square)

---

## Features

| Feature | Details |
|---|---|
| **Image detection** | YOLOv8 inference, bounding boxes, confidence scores |
| **Video tracking** | ByteTrack multi-object tracking, unique person IDs across all frames |
| **Unique counting** | Counts each real person once — no per-frame duplication |
| **Real-time progress** | SSE stream delivers live frame progress and running unique count |
| **Live webcam** | WebSocket stream for realtime person detection from the browser camera |
| **Annotated outputs** | Download processed image or video with overlays |
| **Per-frame chart** | Interactive area chart showing person density over time |
| **GPU support** | CUDA acceleration via `DEVICE=cuda:0` env variable |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (React + Vite)                                       │
│  DropZone → FilePreview → ProgressPanel → ResultPanel        │
└────────────────────┬─────────────────────────────────────────┘
                     │  HTTP / SSE
┌────────────────────▼─────────────────────────────────────────┐
│  FastAPI (Python 3.11)                                        │
│  POST /api/v1/process-image  →  ImageProcessor               │
│  POST /api/v1/process-video  →  VideoProcessor (SSE stream)  │
│  WS   /api/v1/ws/realtime    →  LiveDetector (WebSocket)     │
│  GET  /outputs/{file}        →  StaticFiles                  │
│  GET  /health                →  model status                 │
└────────────────────┬─────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────┐
│  ModelService (singleton)                                     │
│  YOLOv8n  ──►  detect_image()                                │
│             ──►  track_frame()  ──►  ByteTrack               │
└──────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
humancount/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── image_router.py      # POST /process-image
│   │   │   └── video_router.py      # POST /process-video (SSE)
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic settings from .env
│   │   │   └── logging.py           # Loguru setup
│   │   ├── models/
│   │   │   └── schemas.py           # Pydantic request/response types
│   │   ├── services/
│   │   │   ├── model_service.py     # YOLOv8 singleton + detect/track
│   │   │   ├── image_processor.py   # Image pipeline + box drawing
│   │   │   └── video_processor.py   # Video pipeline + ByteTrack
│   │   ├── utils/
│   │   │   └── file_utils.py        # Upload validation + cleanup
│   │   └── main.py                  # FastAPI app factory + lifespan
│   ├── main.py                      # Uvicorn entry point
│   ├── requirements.txt
│   ├── Dockerfile                   # CPU build
│   ├── Dockerfile.gpu               # CUDA build
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx           # Logo + model health indicator
│   │   │   ├── DropZone.tsx         # Drag-and-drop file input
│   │   │   ├── FilePreview.tsx      # Image/video thumbnail + analyse btn
│   │   │   ├── ProgressPanel.tsx    # Upload bar + processing bar + live count
│   │   │   ├── ImageResultPanel.tsx # Annotated image + detection table
│   │   │   ├── VideoResultPanel.tsx # Video player + stats + frame chart
│   │   │   └── ErrorBanner.tsx      # Error display with retry
│   │   ├── hooks/
│   │   │   └── useHumanCount.ts     # State machine (useReducer)
│   │   ├── services/
│   │   │   └── api.ts               # processImage, processVideo, checkHealth
│   │   ├── types/
│   │   │   └── index.ts             # Shared TypeScript interfaces
│   │   ├── App.tsx                  # Root component
│   │   ├── main.tsx                 # React entry point
│   │   └── index.css                # Tailwind + CSS variables
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vercel.json
│   └── .env.example
│
├── nginx/
│   └── nginx.conf                   # Reverse proxy for production
├── docker-compose.yml
├── setup.sh                         # One-shot local setup
└── README.md
```

---

## Quick Start — Local Development

### 1. Automated setup (recommended)

```bash
git clone https://github.com/yourorg/humancount.git
cd humancount
chmod +x setup.sh && ./setup.sh
```

### 2. Start backend

```bash
cd backend
source venv/bin/activate
python main.py
# API available at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### 3. Start frontend (new terminal)

```bash
cd frontend
npm run dev
# App available at http://localhost:5173
```

---

## Docker Deployment

### CPU (default)

```bash
# Build and run backend + nginx
docker-compose up --build

# With dev frontend server
docker-compose --profile dev up --build
```

### GPU (NVIDIA)

```bash
# Requires NVIDIA Container Toolkit
# https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/

docker-compose --profile gpu up --build
```

### Production (nginx + static frontend)

```bash
# Build frontend first
cd frontend && npm run build && cd ..

# Start with nginx profile
docker-compose --profile prod up --build -d
```

---

## Frontend Deployment — Vercel

```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Set your backend URL as an environment variable in Vercel dashboard:
# VITE_API_URL = https://your-backend-domain.com

vercel --prod
```

The `vercel.json` in the frontend directory handles SPA routing automatically.

---

## Backend Deployment — Cloud VPS / Railway / Render

### Environment variables to set in production:

```env
ALLOWED_ORIGINS=https://yourfrontend.vercel.app
DEVICE=cpu                    # or cuda:0
YOLO_MODEL=yolov8n.pt         # yolov8s.pt for better accuracy
CONFIDENCE_THRESHOLD=0.35
MAX_VIDEO_SIZE_MB=500
DEBUG=false
```

### Railway / Render

1. Point to `./backend` as the root directory
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `python main.py`
4. Add all environment variables above

---

## API Reference

### `POST /api/v1/process-image`

Upload an image for person detection.

**Request:** `multipart/form-data` with field `file` (JPG / PNG / WebP, max 20 MB)

**Response:**
```json
{
  "count": 4,
  "boxes": [
    { "x1": 0.12, "y1": 0.05, "x2": 0.31, "y2": 0.89, "confidence": 0.921 }
  ],
  "processed_image_url": "/outputs/abc123_result.jpg",
  "original_width": 1920,
  "original_height": 1080
}
```

Box coordinates are normalised `[0, 1]` — multiply by image dimensions for pixels.

---

### `POST /api/v1/process-video`

Upload a video for person tracking. Returns an **SSE stream**.

**Request:** `multipart/form-data` with field `file` (MP4 / MOV / AVI, max 500 MB)

**SSE Events:**

```
data: {"type": "progress", "progress": 42.5, "unique_count": 7}

data: {"type": "result", "unique_count": 12, "total_frames": 1800,
       "fps": 30.0, "processed_video_url": "/outputs/xyz_result.mp4",
       "frame_counts": [3, 4, 4, 5, ...]}

data: {"type": "error", "detail": "Cannot open video"}
```

---

### `GET /health`

```json
{ "status": "ok", "model_loaded": true, "version": "1.0.0" }
```

---

### `WS /api/v1/ws/realtime`

Send JPEG frames as binary messages. Receive JSON results:

```json
{
  "type": "result",
  "count": 2,
  "boxes": [{ "x1": 0.12, "y1": 0.08, "x2": 0.32, "y2": 0.9, "confidence": 0.94 }],
  "width": 1280,
  "height": 720,
  "timestamp": 1710000000.123
}
```

---

## Configuration Reference

All settings live in `backend/.env`:

| Variable | Default | Description |
|---|---|---|
| `YOLO_MODEL` | `yolov8n.pt` | Model size: n/s/m/l/x (speed ↔ accuracy) |
| `CONFIDENCE_THRESHOLD` | `0.35` | Min detection confidence (0–1) |
| `IOU_THRESHOLD` | `0.45` | NMS overlap threshold |
| `DEVICE` | `cpu` | `cpu` or `cuda:0` |
| `FRAME_SKIP` | `3` | Infer every Nth frame (1 = every frame) |
| `MAX_IMAGE_SIZE_MB` | `20` | Max image upload size |
| `MAX_VIDEO_SIZE_MB` | `500` | Max video upload size |
| `RATE_LIMIT_IMAGE` | `30/minute` | Per-IP rate limit for images |
| `RATE_LIMIT_VIDEO` | `5/minute` | Per-IP rate limit for videos |

### Tuning accuracy vs. speed

| Goal | Config |
|---|---|
| Fastest (edge/CPU) | `YOLO_MODEL=yolov8n.pt`, `FRAME_SKIP=5`, `CONFIDENCE_THRESHOLD=0.4` |
| Balanced | `YOLO_MODEL=yolov8s.pt`, `FRAME_SKIP=3`, `CONFIDENCE_THRESHOLD=0.35` |
| Best accuracy | `YOLO_MODEL=yolov8m.pt`, `FRAME_SKIP=1`, `CONFIDENCE_THRESHOLD=0.25` |

---

## Production Checklist

- [ ] Set `DEBUG=false` in backend `.env`
- [ ] Set `ALLOWED_ORIGINS` to your exact frontend domain
- [ ] Configure `client_max_body_size` in nginx to match `MAX_VIDEO_SIZE_MB`
- [ ] Set up a cron job or systemd timer to purge `/tmp/humancount/outputs` older than 1 hour
- [ ] Add TLS via Let's Encrypt (certbot) to the nginx container
- [ ] Set `YOLO_MODEL=yolov8s.pt` for better accuracy if CPU allows
- [ ] Add Prometheus metrics endpoint for monitoring (`/metrics`)
- [ ] Configure log aggregation (e.g. Loki, Datadog) pointing at `/tmp/humancount/humancount.log`

---

## License

MIT
