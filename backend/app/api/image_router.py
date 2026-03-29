"""
/api/v1/process-image endpoint.
"""
from __future__ import annotations

import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException
from loguru import logger

from app.models.schemas import ImageResponse
from app.services.image_processor import image_processor
from app.utils.file_utils import validate_and_save_image, cleanup

router = APIRouter()


@router.post(
    "/process-image",
    response_model=ImageResponse,
    summary="Detect persons in an uploaded image",
    description=(
        "Upload a JPEG / PNG / WebP image. "
        "Returns bounding boxes and a URL to the annotated image."
    ),
)
async def process_image(file: UploadFile = File(...)):
    input_path = None
    try:
        # Validate + persist the upload
        input_path = await validate_and_save_image(file)
        logger.info("Image upload saved → {}", input_path.name)

        # Run CPU-bound inference in threadpool so event loop stays free
        result = await asyncio.get_event_loop().run_in_executor(
            None, image_processor.process, input_path
        )

        return ImageResponse(**result)

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error during image processing")
        raise HTTPException(status_code=500, detail="Internal server error") from exc
    finally:
        cleanup(input_path)
