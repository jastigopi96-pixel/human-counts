"""
Pydantic models for API request/response validation.
Strict typing ensures the frontend always gets predictable shapes.
"""
from __future__ import annotations
from pydantic import BaseModel, Field


class BoundingBoxSchema(BaseModel):
    x1: float = Field(..., description="Left edge (normalised 0-1)")
    y1: float = Field(..., description="Top edge (normalised 0-1)")
    x2: float = Field(..., description="Right edge (normalised 0-1)")
    y2: float = Field(..., description="Bottom edge (normalised 0-1)")
    confidence: float = Field(..., ge=0.0, le=1.0)


class ImageResponse(BaseModel):
    count: int = Field(..., description="Number of persons detected")
    boxes: list[BoundingBoxSchema]
    processed_image_url: str
    original_width: int
    original_height: int


class VideoResponse(BaseModel):
    unique_count: int = Field(..., description="Unique persons across all frames")
    total_frames: int
    fps: float
    processed_video_url: str
    frame_counts: list[int] = Field(..., description="Person count per frame")


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str = "1.0.0"


class ErrorResponse(BaseModel):
    detail: str
    code: str = "UNKNOWN_ERROR"
