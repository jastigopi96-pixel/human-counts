"""
/api/v1/process-video endpoint.

Uses a background thread for the heavy CV work and SSE
(Server-Sent Events) so the browser gets real-time progress.
"""
from __future__ import annotations

import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from loguru import logger

from app.models.schemas import VideoResponse
from app.services.video_processor import video_processor
from app.utils.file_utils import validate_and_save_video, cleanup

router = APIRouter()

# Dedicated thread pool for video — keeps image requests responsive
_video_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="video-worker")


@router.post(
    "/process-video",
    summary="Detect and track persons in an uploaded video",
    description=(
        "Upload an MP4 / MOV / AVI video. "
        "Returns SSE events with progress updates, "
        "followed by a final JSON result."
    ),
)
async def process_video(file: UploadFile = File(...)):
    input_path = None
    try:
        input_path = await validate_and_save_video(file)
        logger.info("Video upload saved → {}", input_path.name)

        # We'll push progress via a queue fed from the worker thread
        queue: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_event_loop()

        def progress_cb(pct: float, unique: int) -> None:
            """Called from worker thread — thread-safe queue.put_nowait via loop."""
            loop.call_soon_threadsafe(
                queue.put_nowait,
                json.dumps({"type": "progress", "progress": pct, "unique_count": unique}),
            )

        def run_in_thread():
            try:
                result = video_processor.process(input_path, progress_callback=progress_cb)
                loop.call_soon_threadsafe(
                    queue.put_nowait,
                    json.dumps({"type": "result", **result}),
                )
            except Exception as exc:
                logger.exception("Video processing failed")
                loop.call_soon_threadsafe(
                    queue.put_nowait,
                    json.dumps({"type": "error", "detail": str(exc)}),
                )
            finally:
                # Signal the generator to stop
                loop.call_soon_threadsafe(queue.put_nowait, None)

        # Start worker
        loop.run_in_executor(_video_pool, run_in_thread)

        async def event_generator():
            """Yield SSE-formatted messages until sentinel None arrives."""
            try:
                while True:
                    msg = await asyncio.wait_for(queue.get(), timeout=600)
                    if msg is None:
                        break
                    yield f"data: {msg}\n\n"
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'type':'error','detail':'Processing timed out'})}\n\n"
            finally:
                cleanup(input_path)

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",   # Disable Nginx buffering
            },
        )

    except HTTPException:
        cleanup(input_path)
        raise
    except Exception as exc:
        cleanup(input_path)
        logger.exception("Failed to start video processing")
        raise HTTPException(status_code=500, detail="Internal server error") from exc
