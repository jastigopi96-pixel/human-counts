"""
Upload validation helpers — centralised so both routers share the same rules.
"""
from __future__ import annotations

import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException, status

from app.core.config import settings

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo", "video/avi"}

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi"}


def _ext(filename: str) -> str:
    return Path(filename).suffix.lower()


async def validate_and_save_image(file: UploadFile) -> Path:
    """Validate an image upload and persist it; return the saved path."""
    # Extension check (don't trust Content-Type alone)
    if _ext(file.filename or "") not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported image format. Allowed: {ALLOWED_IMAGE_EXTENSIONS}",
        )

    content = await file.read()

    if len(content) > settings.max_image_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image too large (max {settings.MAX_IMAGE_SIZE_MB} MB)",
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    # Save with random name to avoid path traversal / collisions
    suffix = _ext(file.filename or ".jpg")
    dest = settings.UPLOAD_DIR / f"{uuid.uuid4().hex}{suffix}"
    dest.write_bytes(content)
    return dest


async def validate_and_save_video(file: UploadFile) -> Path:
    """Validate a video upload and persist it; return the saved path."""
    if _ext(file.filename or "") not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported video format. Allowed: {ALLOWED_VIDEO_EXTENSIONS}",
        )

    content = await file.read()

    if len(content) > settings.max_video_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Video too large (max {settings.MAX_VIDEO_SIZE_MB} MB)",
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    suffix = _ext(file.filename or ".mp4")
    dest = settings.UPLOAD_DIR / f"{uuid.uuid4().hex}{suffix}"
    dest.write_bytes(content)
    return dest


def cleanup(*paths: Path) -> None:
    """Delete one or more temp files silently."""
    for p in paths:
        try:
            if p and p.exists():
                p.unlink()
        except Exception:
            pass
