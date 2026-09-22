"""Supabase Auth bearer-token verification with a short-lived local cache."""

from collections import OrderedDict
from hashlib import sha256
from threading import Lock
from time import monotonic
from typing import Callable, Tuple
from uuid import UUID

from db.client import get_supabase_client
from supabase import Client


class SupabaseAuthError(RuntimeError):
    """Raised when a Supabase access token cannot be verified."""


class SupabaseAuthVerifier:
    """Verify access tokens through Supabase Auth and cache positive results briefly."""

    def __init__(
        self,
        client_factory: Callable[[], Client] = get_supabase_client,
        ttl_seconds: int = 30,
        max_entries: int = 1024,
    ) -> None:
        self._client_factory = client_factory
        self._ttl_seconds = max(0, ttl_seconds)
        self._max_entries = max(1, max_entries)
        self._cache: "OrderedDict[str, Tuple[str, float]]" = OrderedDict()
        self._lock = Lock()

    def verify(self, access_token: str) -> str:
        token = access_token.strip()
        if not token or len(token) > 8192:
            raise SupabaseAuthError("access token is invalid")

        cache_key = sha256(token.encode("utf-8")).hexdigest()
        now = monotonic()
        with self._lock:
            cached = self._cache.get(cache_key)
            if cached and cached[1] > now:
                self._cache.move_to_end(cache_key)
                return cached[0]
            if cached:
                self._cache.pop(cache_key, None)

        try:
            response = self._client_factory().auth.get_user(token)
        except Exception as error:
            raise SupabaseAuthError("Supabase Auth verification failed") from error

        user = getattr(response, "user", None) if response is not None else None
        user_id = getattr(user, "id", None)
        if user_id is None and isinstance(user, dict):
            user_id = user.get("id")
        if not user_id:
            raise SupabaseAuthError("Supabase Auth returned no user")

        try:
            normalized_user_id = str(UUID(str(user_id)))
        except ValueError as error:
            raise SupabaseAuthError("Supabase Auth returned an invalid user id") from error

        if self._ttl_seconds:
            with self._lock:
                self._cache[cache_key] = (normalized_user_id, now + self._ttl_seconds)
                self._cache.move_to_end(cache_key)
                while len(self._cache) > self._max_entries:
                    self._cache.popitem(last=False)
        return normalized_user_id
