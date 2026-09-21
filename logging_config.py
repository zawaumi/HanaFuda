"""Central logging configuration for local and hosted API processes."""

import logging
import logging.config
from typing import Any


def configure_logging(level: str) -> None:
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "standard": {
                    "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "standard",
                    "stream": "ext://sys.stdout",
                }
            },
            "root": {"level": level.upper(), "handlers": ["console"]},
        }
    )


def request_log_extra(request_id: str, status_code: int, duration_ms: float) -> dict[str, Any]:
    return {
        "request_id": request_id,
        "status_code": status_code,
        "duration_ms": round(duration_ms, 2),
    }
