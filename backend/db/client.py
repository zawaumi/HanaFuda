"""Supabase client construction and connectivity checks."""

from functools import lru_cache
from typing import Any, Optional

from config import Settings, get_settings
from supabase import Client, create_client


class DatabaseConfigurationError(RuntimeError):
    """Raised when Supabase credentials are not configured."""


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    settings = get_settings()
    if not settings.supabase_configured:
        raise DatabaseConfigurationError(
            "SUPABASE_URL と SUPABASE_KEY または SUPABASE_SERVICE_ROLE_KEY が必要です。"
        )
    return create_client(settings.supabase_url or "", settings.database_key.get_secret_value())


def check_supabase_connection(settings: Optional[Settings] = None) -> dict[str, Any]:
    """Run a minimal read-only query used by health checks and setup verification."""

    resolved = settings or get_settings()
    if not resolved.supabase_configured:
        return {"configured": False, "connected": False, "detail": "credentials_missing"}

    try:
        # A lightweight request against the public schema. The table is created by
        # the migration and no application data is returned.
        get_supabase_client().table("users").select("id").limit(1).execute()
    except Exception:
        return {"configured": True, "connected": False, "detail": "connection_failed"}
    return {"configured": True, "connected": True, "detail": "ok"}
