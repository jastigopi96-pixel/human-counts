"""
HumanCount API - Production-grade human detection service.
Entry point for the FastAPI application.
"""
import uvicorn
from app.core.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=1,  # Single worker because YOLO model is loaded once
        log_level="info",
    )
