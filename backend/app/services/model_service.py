"""
ModelService — singleton that owns the YOLO model lifecycle.

Loaded once at application startup via FastAPI lifespan; never reloaded
between requests, so GPU/CPU memory stays hot.
"""
from __future__ import annotations

import cv2
import numpy as np
from pathlib import Path
from typing import Optional
from loguru import logger
from ultralytics import YOLO

from app.core.config import settings


class BoundingBox:
    """Normalised bounding box with detection metadata."""

    __slots__ = ("x1", "y1", "x2", "y2", "confidence", "track_id")

    def __init__(
        self,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        confidence: float,
        track_id: Optional[int] = None,
    ) -> None:
        self.x1 = x1
        self.y1 = y1
        self.x2 = x2
        self.y2 = y2
        self.confidence = confidence
        self.track_id = track_id

    def to_dict(self) -> dict:
        return {
            "x1": round(self.x1, 2),
            "y1": round(self.y1, 2),
            "x2": round(self.x2, 2),
            "y2": round(self.y2, 2),
            "confidence": round(self.confidence, 3),
            "track_id": self.track_id,
        }


class ModelService:
    """Wraps Ultralytics YOLOv8 — thread-safe for concurrent async calls."""

    # COCO class index for 'person'
    PERSON_CLASS_ID = 0

    def __init__(self) -> None:
        self._model: Optional[YOLO] = None

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    def load(self) -> None:
        """Download (first run) and load the YOLO model into memory."""
        logger.info("Loading YOLO model: {}", settings.YOLO_MODEL)
        self._model = YOLO(settings.YOLO_MODEL)
        # Warm-up pass so the first real request isn't slow
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        self._model.predict(
            dummy,
            classes=[self.PERSON_CLASS_ID],
            device=settings.DEVICE,
            verbose=False,
        )
        logger.info("YOLO model ready on device={}", settings.DEVICE)

    def unload(self) -> None:
        self._model = None
        logger.info("YOLO model unloaded")

    # ── Image detection ───────────────────────────────────────────────────────

    def detect_image(self, image_bgr: np.ndarray) -> list[BoundingBox]:
        """
        Run person detection on a single BGR image.
        Returns a list of BoundingBox objects (pixel coordinates).
        """
        assert self._model is not None, "Model not loaded"

        results = self._model.predict(
            image_bgr,
            classes=[self.PERSON_CLASS_ID],
            conf=settings.CONFIDENCE_THRESHOLD,
            iou=settings.IOU_THRESHOLD,
            device=settings.DEVICE,
            verbose=False,
        )

        boxes: list[BoundingBox] = []
        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                boxes.append(BoundingBox(x1, y1, x2, y2, conf))

        return boxes

    # ── Video tracking ────────────────────────────────────────────────────────

    def track_frame(self, frame_bgr: np.ndarray, tracker: str = "bytetrack.yaml") -> list[BoundingBox]:
        """
        Run detection + ByteTrack tracking on a single frame.
        Each BoundingBox gets a unique track_id that persists across frames.
        """
        assert self._model is not None, "Model not loaded"

        results = self._model.track(
            frame_bgr,
            classes=[self.PERSON_CLASS_ID],
            conf=settings.CONFIDENCE_THRESHOLD,
            iou=settings.IOU_THRESHOLD,
            device=settings.DEVICE,
            tracker=tracker,
            persist=True,   # Keep tracker state between calls
            verbose=False,
        )

        boxes: list[BoundingBox] = []
        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                track_id = int(box.id[0]) if box.id is not None else None
                boxes.append(BoundingBox(x1, y1, x2, y2, conf, track_id))

        return boxes


# Module-level singleton — imported by the app
model_service = ModelService()
