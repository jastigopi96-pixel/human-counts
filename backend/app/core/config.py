"""
Application configuration loaded from environment variables.
All secrets and tuneable values live here — never hard-coded.
"""
from pydantic_settings import BaseSettings
from pathlib import Path
import os


class Settings(BaseSettings):
    # ── Server ────────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    API_VERSION: str = "v1"

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    # ── File handling ─────────────────────────────────────────────────────────
    UPLOAD_DIR: Path = Path("/tmp/humancount/uploads")
    OUTPUT_DIR: Path = Path("/tmp/humancount/outputs")
    MAX_IMAGE_SIZE_MB: int = 20
    MAX_VIDEO_SIZE_MB: int = 500

    @property
    def max_image_bytes(self) -> int:
        return self.MAX_IMAGE_SIZE_MB * 1024 * 1024

    @property
    def max_video_bytes(self) -> int:
        return self.MAX_VIDEO_SIZE_MB * 1024 * 1024

    # ── Model ─────────────────────────────────────────────────────────────────
    YOLO_MODEL: str = "yolov8n.pt"        # nano for speed; swap to yolov8m.pt for accuracy
    CONFIDENCE_THRESHOLD: float = 0.35
    IOU_THRESHOLD: float = 0.45
    DEVICE: str = "cpu"                    # "cuda:0" for GPU
    FRAME_SKIP: int = 3                    # Process every N-th frame for video

    # ── Rate limiting ─────────────────────────────────────────────────────────
    RATE_LIMIT_IMAGE: str = "30/minute"
    RATE_LIMIT_VIDEO: str = "5/minute"

    # ── Cleanup ───────────────────────────────────────────────────────────────
    FILE_TTL_SECONDS: int = 3600           # Delete temp files after 1 hour

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Ensure directories exist at import time
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
