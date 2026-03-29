"""
VideoProcessor — frame extraction, ByteTrack tracking, unique person counting,
and annotated video reconstruction.

Design decisions
----------------
* FRAME_SKIP  — only every Nth frame is sent for inference; intermediate frames
  keep their previous detections for rendering so the output video is smooth.
* Unique IDs  — ByteTrack assigns stable IDs across frames.  We collect the full
  set of unique IDs seen in the video = unique persons.
* Progress    — yields (progress_pct, frame_counts_so_far) tuples so the
  endpoint can stream SSE updates without blocking.
"""
from __future__ import annotations

import uuid
import asyncio
from pathlib import Path
from typing import Generator
from loguru import logger

import cv2
import numpy as np

from app.core.config import settings
from app.services.model_service import model_service, BoundingBox


# ── Drawing helpers ───────────────────────────────────────────────────────────
_PALETTE: list[tuple[int, int, int]] = [
    (0, 255, 120), (0, 180, 255), (255, 80,  0),  (200, 0, 255),
    (255, 220, 0), (0, 240, 200), (255, 60, 120), (80, 255, 0),
]

def _id_color(track_id: int) -> tuple[int, int, int]:
    return _PALETTE[track_id % len(_PALETTE)]


def _draw_tracked_boxes(frame: np.ndarray, boxes: list[BoundingBox]) -> np.ndarray:
    overlay = frame.copy()
    for box in boxes:
        x1, y1, x2, y2 = int(box.x1), int(box.y1), int(box.x2), int(box.y2)
        tid = box.track_id or 0
        color = _id_color(tid)

        cv2.rectangle(overlay, (x1, y1), (x2, y2), color, 2)

        label = f"#{tid}  {box.confidence:.0%}"
        (tw, th), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_DUPLEX, 0.5, 1)
        label_y = max(y1 - 4, th + 4)
        cv2.rectangle(overlay, (x1, label_y - th - 4), (x1 + tw + 8, label_y + baseline), color, cv2.FILLED)
        cv2.putText(overlay, label, (x1 + 4, label_y), cv2.FONT_HERSHEY_DUPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)

    return cv2.addWeighted(overlay, 0.85, frame, 0.15, 0)


def _draw_hud(frame: np.ndarray, frame_idx: int, frame_count: int, unique_count: int) -> np.ndarray:
    """Heads-up display bar at the top of the frame."""
    h, w = frame.shape[:2]
    bar_h = 40
    bar = np.zeros((bar_h, w, 3), dtype=np.uint8)
    texts = [
        (f"Frame {frame_idx}/{frame_count}", (10, 26)),
        (f"Unique persons: {unique_count}", (w // 2 - 80, 26)),
    ]
    for text, pos in texts:
        cv2.putText(bar, text, pos, cv2.FONT_HERSHEY_DUPLEX, 0.6, (0, 255, 120), 1, cv2.LINE_AA)

    return np.vstack([bar, frame])


# ── Processor ─────────────────────────────────────────────────────────────────

class VideoProcessor:
    """Synchronous video pipeline (run inside threadpool from async endpoint)."""

    def process(
        self,
        input_path: Path,
        progress_callback=None,
    ) -> dict:
        """
        Process *input_path*, write annotated output video.

        Args:
            input_path:        Path to the uploaded video file.
            progress_callback: Optional callable(progress: float, unique: int).
                               Called after each processed frame.

        Returns:
            Dict matching the VideoResponse schema.
        """
        logger.info("Starting video processing: {}", input_path.name)

        cap = cv2.VideoCapture(str(input_path))
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {input_path}")

        # ── Video metadata ────────────────────────────────────────────────────
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        out_h = orig_h + 40  # Extra HUD bar

        logger.info("Video: {}x{} @ {}fps — {} frames", orig_w, orig_h, fps, total_frames)

        # ── Output writer ─────────────────────────────────────────────────────
        out_name = f"{uuid.uuid4().hex}_result.mp4"
        out_path = settings.OUTPUT_DIR / out_name

        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(out_path), fourcc, fps, (orig_w, out_h))

        # ── Per-frame state ───────────────────────────────────────────────────
        unique_ids: set[int] = set()
        frame_counts: list[int] = []          # Count per written frame
        last_boxes: list[BoundingBox] = []    # Reused on skipped frames

        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_idx += 1
            should_infer = (frame_idx % settings.FRAME_SKIP == 0) or frame_idx == 1

            if should_infer:
                boxes = model_service.track_frame(frame)
                last_boxes = boxes
                # Collect unique track IDs
                for b in boxes:
                    if b.track_id is not None:
                        unique_ids.add(b.track_id)
            else:
                boxes = last_boxes   # Render previous detections on skipped frames

            unique_count = len(unique_ids)
            frame_counts.append(len(boxes))   # People visible in this frame

            # ── Annotate & write ──────────────────────────────────────────────
            annotated = _draw_tracked_boxes(frame, boxes)
            annotated = _draw_hud(annotated, frame_idx, total_frames, unique_count)
            writer.write(annotated)

            # ── Progress ──────────────────────────────────────────────────────
            if progress_callback and frame_idx % 10 == 0:
                pct = round(frame_idx / max(total_frames, 1) * 100, 1)
                progress_callback(pct, unique_count)

        cap.release()
        writer.release()

        logger.info(
            "Video done: {} unique persons across {} frames → {}",
            len(unique_ids), frame_idx, out_name,
        )

        return {
            "unique_count": len(unique_ids),
            "total_frames": frame_idx,
            "fps": round(fps, 2),
            "processed_video_url": f"/outputs/{out_name}",
            "frame_counts": frame_counts,
        }


video_processor = VideoProcessor()
