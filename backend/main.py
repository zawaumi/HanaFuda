import logging
import time
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from api.routes import router
from config import get_settings
from db.client import check_supabase_connection
from errors import register_exception_handlers
from logging_config import configure_logging, request_log_extra

settings = get_settings()
configure_logging(settings.log_level)
logger = logging.getLogger("hanafuda.api")
app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_methods,
    allow_headers=settings.cors_headers,
)
app.include_router(router)
register_exception_handlers(app)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid4()))
    started = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "%s %s",
        request.method,
        request.url.path,
        extra=request_log_extra(request_id, response.status_code, duration_ms),
    )
    return response


@app.get("/")
async def root():
    return {"name": settings.app_name, "status": "ok"}


@app.get("/health", tags=["health"])
async def health():
    """Return process health and non-sensitive Supabase connectivity status."""

    database = check_supabase_connection(settings)
    return {"status": "ok" if database["connected"] else "degraded", "database": database}


@app.get("/health/live", tags=["health"])
async def liveness():
    """Process-only health check suitable for a basic process monitor."""

    return {"status": "ok"}


@app.get("/health/ready", tags=["health"])
async def readiness():
    """Readiness check that verifies the configured database is reachable."""

    database = check_supabase_connection(settings)
    if not database["connected"]:
        raise HTTPException(status_code=503, detail="データベースへ接続できません。")
    return {"status": "ok", "database": database}
