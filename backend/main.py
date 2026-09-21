from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import router
from config import get_settings
from db.client import check_supabase_connection
from errors import register_exception_handlers

settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "X-User-ID"],
)
app.include_router(router)
register_exception_handlers(app)


@app.get("/")
async def root():
    return {"name": settings.app_name, "status": "ok"}


@app.get("/health", tags=["health"])
async def health():
    """Return process health and non-sensitive Supabase connectivity status."""

    database = check_supabase_connection(settings)
    return {"status": "ok" if database["connected"] else "degraded", "database": database}
