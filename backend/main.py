from fastapi import FastAPI

from config import get_settings
from db.client import check_supabase_connection

settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0")


@app.get("/")
async def root():
    return {"name": settings.app_name, "status": "ok"}


@app.get("/health", tags=["health"])
async def health():
    """Return process health and non-sensitive Supabase connectivity status."""

    database = check_supabase_connection(settings)
    return {"status": "ok" if database["connected"] else "degraded", "database": database}
