"""
ImageProcessor — handles image detection and overlay rendering.
"""
from __future__ import annotations

import uuid
import cv2
import numpy as np
from pathlib import Path
from loguru import logger

from app.core.config import settings
from app.services.model_service import model_service, BoundingBox


# ── Drawing constants ─────────────────────────────────────────────────────────
BOX_COLOR = (0, 255, 120)       # Vivid green
TEXT_COLOR = (255, 255, 255)    # White label text
BOX_THICKNESS = 2
FONT = cv2.FONT_HERSHEY_DUPLEX
FONT_SCALE = 0.55
LABEL_PAD = 4


def _draw_boxes(image: np.ndarray, boxes: list[BoundingBox]) -> np.ndarray:
    """Render bounding boxes and confidence labels onto the image (in-place)."""
    overlay = image.copy()

    for box in boxes:
        x1, y1, x2, y2 = int(box.x1), int(box.y1), int(box.x2), int(box.y2)

        # Box
        cv2.rectangle(overlay, (x1, y1), (x2, y2), BOX_COLOR, BOX_THICKNESS)

        # Label background
        label = f"{box.confidence:.0%}"
        (tw, th), baseline = cv2.getTextSize(label, FONT, FONT_SCALE, 1)
        label_y = max(y1 - LABEL_PAD, th + LABEL_PAD)
        cv2.rectangle(
            overlay,
            (x1, label_y - th - LABEL_PAD),
            (x1 + tw + LABEL_PAD * 2, label_y + baseline),
            BOX_COLOR,
            cv2.FILLED,
        )
        cv2.putText(
            overlay,
            label,
            (x1 + LABEL_PAD, label_y),
            FONT,
            FONT_SCALE,
            TEXT_COLOR,
            1,
            cv2.LINE_AA,
        )

    # Semi-transparent blend so the boxes don't obliterate detail
    return cv2.addWeighted(overlay, 0.85, image, 0.15, 0)


def _draw_count_badge(image: np.ndarray, count: int) -> np.ndarray:
    """Render a 'People: N' badge in the top-left corner."""
    text = f"People detected: {count}"
    (tw, th), _ = cv2.getTextSize(text, FONT, 0.75, 2)
    pad = 10
    cv2.rectangle(image, (pad, pad), (pad + tw + pad, pad + th + pad), (0, 0, 0), cv2.FILLED)
    cv2.putText(
        image,
        text,
        (pad * 2, pad + th),
        FONT,
        0.75,
        (0, 255, 120),
        2,
        cv2.LINE_AA,
    )
    return image


class ImageProcessor:
    """Runs detection on an uploaded image and writes the annotated result."""

    def process(self, input_path: Path) -> dict:
        """
        Detect persons in *input_path*, save annotated copy to output dir.

        Returns a dict matching the ImageResponse schema.
        """
        logger.info("Processing image: {}", input_path.name)

        # ── Load ──────────────────────────────────────────────────────────────
        image = cv2.imread(str(input_path))
        if image is None:
            raise ValueError(f"Cannot decode image: {input_path}")

        h, w = image.shape[:2]

        # ── Detect ───────────────────────────────────────────────────────────
        boxes = model_service.detect_image(image)
        count = len(boxes)
        logger.info("Detected {} person(s) in {}", count, input_path.name)

        # ── Draw ─────────────────────────────────────────────────────────────
        annotated = _draw_boxes(image, boxes)
        annotated = _draw_count_badge(annotated, count)

        # ── Save ─────────────────────────────────────────────────────────────
        out_name = f"{uuid.uuid4().hex}_result.jpg"
        out_path = settings.OUTPUT_DIR / out_name
        cv2.imwrite(str(out_path), annotated, [cv2.IMWRITE_JPEG_QUALITY, 92])

        # ── Build response payload ────────────────────────────────────────────
        # Normalise box coords to [0,1] so the frontend is resolution-agnostic
        norm_boxes = []
        for b in boxes:
            norm_boxes.append({
                "x1": round(b.x1 / w, 4),
                "y1": round(b.y1 / h, 4),
                "x2": round(b.x2 / w, 4),
                "y2": round(b.y2 / h, 4),
                "confidence": round(b.confidence, 3),
            })

        return {
            "count": count,
            "boxes": norm_boxes,
            "processed_image_url": f"/outputs/{out_name}",
            "original_width": w,
            "original_height": h,
        }


image_processor = ImageProcessor()
