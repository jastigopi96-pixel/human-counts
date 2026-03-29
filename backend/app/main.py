"""
FastAPI application factory.

Responsibilities
----------------
* Lifespan: load/unload the YOLO model around the server lifetime.
* Middleware: CORS, request logging, global error handler.
* Routes: image, video, health, static outputs.
"""
from __future__ import annotations

import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from loguru import logger

from app.core.config import settings
from app.core.logging import setup_logging
from app.services.model_service import model_service
from app.api import image_router, video_router, realtime_router
from app.models.schemas import HealthResponse


# ── Logging setup (before anything else) ─────────────────────────────────────
setup_logging()


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load expensive resources once; release them cleanly on shutdown."""
    logger.info("Starting HumanCount API…")
    model_service.load()
    yield
    logger.info("Shutting down HumanCount API…")
    model_service.unload()


# ── App factory ───────────────────────────────────────────────────────────────
def create_app() -> FastAPI:
    app = FastAPI(
        title="HumanCount API",
        description="Production-grade human detection from images and videos.",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Content-Disposition"],
    )

    # ── Request timing middleware ─────────────────────────────────────────────
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = (time.perf_counter() - start) * 1000
        logger.info(
            "{} {} → {} ({:.0f}ms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed,
        )
        return response

    # ── Global exception handler ──────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled exception on {} {}", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "An unexpected error occurred.", "code": "INTERNAL_SERVER_ERROR"},
        )

    # ── Health check ──────────────────────────────────────────────────────────
    @app.get("/health", response_model=HealthResponse, tags=["Health"])
    async def health():
        return HealthResponse(
            status="ok",
            model_loaded=model_service._model is not None,
        )

    # ── API routes ────────────────────────────────────────────────────────────
    prefix = f"/api/{settings.API_VERSION}"
    app.include_router(image_router.router, prefix=prefix, tags=["Detection"])
    app.include_router(video_router.router, prefix=prefix, tags=["Detection"])
    app.include_router(realtime_router.router, prefix=prefix, tags=["Detection"])

    # ── Static output files (processed images / videos) ───────────────────────
    app.mount(
        "/outputs",
        StaticFiles(directory=str(settings.OUTPUT_DIR)),
        name="outputs",
    )

    return app


app = create_app()
