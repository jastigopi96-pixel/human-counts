"""
Realtime detection over WebSocket.

Client sends JPEG frames (binary). Server responds with JSON results:
{
  "type": "result",
  "count": 3,
  "boxes": [{x1,y1,x2,y2,confidence}],
  "width": 1280,
  "height": 720,
  "timestamp": 1710000000.123
}
"""
from __future__ import annotations

import time
from typing import Any

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from loguru import logger

from app.services.model_service import model_service


router = APIRouter()


@router.websocket("/ws/realtime")
async def realtime_ws(ws: WebSocket) -> None:
    await ws.accept()
    logger.info("Realtime WS connected: {}", ws.client)

    try:
        while True:
            message = await ws.receive()

            # Ignore text control frames (optional pings)
            if message.get("text"):
                if message["text"] == "ping":
                    await ws.send_json({"type": "pong"})
                continue

            data: bytes | None = message.get("bytes")
            if not data:
                continue

            # Decode JPEG -> BGR
            np_buf = np.frombuffer(data, dtype=np.uint8)
            frame = cv2.imdecode(np_buf, cv2.IMREAD_COLOR)
            if frame is None:
                await ws.send_json({"type": "error", "detail": "Invalid frame"})
                continue

            h, w = frame.shape[:2]
            boxes = model_service.detect_image(frame)

            payload_boxes: list[dict[str, Any]] = []
            for box in boxes:
                payload_boxes.append(
                    {
                        "x1": round(box.x1 / w, 3),
                        "y1": round(box.y1 / h, 3),
                        "x2": round(box.x2 / w, 3),
                        "y2": round(box.y2 / h, 3),
                        "confidence": round(box.confidence, 3),
                    }
                )

            await ws.send_json(
                {
                    "type": "result",
                    "count": len(payload_boxes),
                    "boxes": payload_boxes,
                    "width": w,
                    "height": h,
                    "timestamp": time.time(),
                }
            )
    except WebSocketDisconnect:
        logger.info("Realtime WS disconnected: {}", ws.client)
    except Exception:
        logger.exception("Realtime WS error")
        try:
            await ws.send_json({"type": "error", "detail": "Server error"})
        except Exception:
            pass
