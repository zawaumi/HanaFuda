"""FastAPI dependency providers."""

from functools import lru_cache
from typing import Optional
from uuid import UUID

from fastapi import Header, HTTPException

from config import get_settings
from db.client import DatabaseConfigurationError
from db.repository import Repository, SupabaseRepository
from services.deck import DeckService


@lru_cache(maxsize=1)
def get_repository() -> Repository:
    try:
        return SupabaseRepository()
    except DatabaseConfigurationError as error:
        raise HTTPException(status_code=503, detail="データベースが設定されていません。") from error


@lru_cache(maxsize=1)
def get_deck_service() -> DeckService:
    return DeckService()


def get_current_user_id(x_user_id: Optional[str] = Header(default=None)) -> str:
    value = x_user_id or get_settings().default_user_id
    try:
        return str(UUID(value))
    except ValueError as error:
        raise HTTPException(status_code=400, detail="X-User-IDがUUID形式ではありません。") from error
