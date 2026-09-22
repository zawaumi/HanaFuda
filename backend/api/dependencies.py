"""FastAPI dependency providers."""

from functools import lru_cache
from typing import Optional
from uuid import UUID

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from auth import SupabaseAuthError, SupabaseAuthVerifier
from config import get_settings
from db.client import DatabaseConfigurationError
from db.repository import Repository, SupabaseRepository
from services.deck import DeckService

bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def get_repository() -> Repository:
    try:
        return SupabaseRepository()
    except DatabaseConfigurationError as error:
        raise HTTPException(status_code=503, detail="データベースが設定されていません。") from error


@lru_cache(maxsize=1)
def get_deck_service() -> DeckService:
    return DeckService()


@lru_cache(maxsize=1)
def get_auth_verifier() -> SupabaseAuthVerifier:
    return SupabaseAuthVerifier(ttl_seconds=get_settings().auth_cache_ttl_seconds)


def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    x_user_id: Optional[str] = Header(default=None),
) -> str:
    if credentials is not None:
        try:
            return get_auth_verifier().verify(credentials.credentials)
        except SupabaseAuthError as error:
            raise HTTPException(
                status_code=401,
                detail="認証トークンが無効です。",
                headers={"WWW-Authenticate": "Bearer"},
            ) from error

    settings = get_settings()
    if settings.auth_mode == "jwt":
        raise HTTPException(
            status_code=401,
            detail="Bearer認証トークンが必要です。",
            headers={"WWW-Authenticate": "Bearer"},
        )

    value = x_user_id or settings.default_user_id
    try:
        return str(UUID(value))
    except ValueError as error:
        raise HTTPException(status_code=400, detail="X-User-IDがUUID形式ではありません。") from error
