"""
Structured logging setup using Loguru.
Produces JSON-friendly logs in production, pretty logs in dev.
"""
import sys
from loguru import logger
from app.core.config import settings


def setup_logging() -> None:
    logger.remove()  # Remove default handler

    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level>"
    )

    log_level = "DEBUG" if settings.DEBUG else "INFO"

    logger.add(
        sys.stdout,
        format=log_format,
        level=log_level,
        colorize=not settings.DEBUG,  # No color in production
        backtrace=settings.DEBUG,
        diagnose=settings.DEBUG,
    )

    # Rotating file log for production
    logger.add(
        "/tmp/humancount/humancount.log",
        rotation="100 MB",
        retention="7 days",
        compression="gz",
        level="INFO",
        format=log_format,
    )

    logger.info("Logging initialised — level={}", log_level)
