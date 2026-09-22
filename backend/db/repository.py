"""Persistence ports and the Supabase implementation.

The API and services depend on this small interface instead of the Supabase SDK.
That keeps the business logic testable and makes the storage boundary explicit.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Protocol
from uuid import uuid4

from db.client import get_supabase_client
from supabase import Client


class RepositoryError(RuntimeError):
    """A database operation could not be completed."""


class Repository(Protocol):
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]: ...

    def upsert_user(self, user_id: str, values: Dict[str, Any]) -> Dict[str, Any]: ...

    def list_persons(
        self, user_id: str, query: Optional[str] = None, limit: int = 100
    ) -> List[Dict[str, Any]]: ...

    def get_person(self, user_id: str, person_id: str) -> Optional[Dict[str, Any]]: ...

    def create_person(self, user_id: str, values: Dict[str, Any]) -> Dict[str, Any]: ...

    def update_person(self, user_id: str, person_id: str, values: Dict[str, Any]) -> Optional[Dict[str, Any]]: ...

    def list_conversations(
        self, user_id: str, person_id: Optional[str] = None, limit: int = 100
    ) -> List[Dict[str, Any]]: ...

    def create_conversation(self, user_id: str, values: Dict[str, Any]) -> Dict[str, Any]: ...

    def list_memories(
        self, user_id: str, person_id: str, limit: int = 100
    ) -> List[Dict[str, Any]]: ...

    def create_memory(self, user_id: str, person_id: str, values: Dict[str, Any]) -> Dict[str, Any]: ...

    def create_deck(self, values: Dict[str, Any]) -> Dict[str, Any]: ...


def _data(response: Any) -> Any:
    return getattr(response, "data", None)


def _one(response: Any) -> Optional[Dict[str, Any]]:
    data = _data(response)
    if isinstance(data, list):
        return data[0] if data else None
    return data if isinstance(data, dict) else None


class SupabaseRepository:
    """Repository backed by Supabase PostgREST tables."""

    def __init__(self, client: Optional[Client] = None) -> None:
        self.client = client or get_supabase_client()

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            response = self.client.table("users").select("*").eq("id", user_id).limit(1).execute()
            return _one(response)
        except Exception as error:
            raise RepositoryError("ユーザープロフィールの取得に失敗しました。") from error

    def upsert_user(self, user_id: str, values: Dict[str, Any]) -> Dict[str, Any]:
        payload = {"id": user_id, **values}
        try:
            response = self.client.table("users").upsert(payload).execute()
            result = _one(response)
            if result is None:
                raise RepositoryError("プロフィール保存後のデータを取得できませんでした。")
            return result
        except RepositoryError:
            raise
        except Exception as error:
            raise RepositoryError("ユーザープロフィールの保存に失敗しました。") from error

    def list_persons(self, user_id: str, query: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            request = self.client.table("persons").select("*").eq("user_id", user_id)
            if query:
                escaped = query.replace("%", "\\%").replace(",", "\\,")
                request = request.or_(
                    "name.ilike.%{0}%,relationship.ilike.%{0}%,known_information.ilike.%{0}%".format(
                        escaped
                    )
                )
            response = request.order("updated_at", desc=True).limit(limit).execute()
            return list(_data(response) or [])
        except Exception as error:
            raise RepositoryError("相手一覧の取得に失敗しました。") from error

    def get_person(self, user_id: str, person_id: str) -> Optional[Dict[str, Any]]:
        try:
            response = (
                self.client.table("persons")
                .select("*")
                .eq("id", person_id)
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
            return _one(response)
        except Exception as error:
            raise RepositoryError("相手情報の取得に失敗しました。") from error

    def create_person(self, user_id: str, values: Dict[str, Any]) -> Dict[str, Any]:
        try:
            response = self.client.table("persons").insert({"user_id": user_id, **values}).execute()
            result = _one(response)
            if result is None:
                raise RepositoryError("相手登録後のデータを取得できませんでした。")
            return result
        except RepositoryError:
            raise
        except Exception as error:
            raise RepositoryError("相手の登録に失敗しました。") from error

    def update_person(self, user_id: str, person_id: str, values: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            response = (
                self.client.table("persons")
                .update(values)
                .eq("id", person_id)
                .eq("user_id", user_id)
                .execute()
            )
            return _one(response)
        except Exception as error:
            raise RepositoryError("相手情報の更新に失敗しました。") from error

    def list_conversations(
        self, user_id: str, person_id: Optional[str] = None, limit: int = 100
    ) -> List[Dict[str, Any]]:
        try:
            request = self.client.table("conversations").select("*").eq("user_id", user_id)
            if person_id:
                request = request.eq("person_id", person_id)
            response = request.order("created_at", desc=True).limit(limit).execute()
            return list(_data(response) or [])
        except Exception as error:
            raise RepositoryError("会話履歴の取得に失敗しました。") from error

    def create_conversation(self, user_id: str, values: Dict[str, Any]) -> Dict[str, Any]:
        try:
            response = self.client.table("conversations").insert({"user_id": user_id, **values}).execute()
            result = _one(response)
            if result is None:
                raise RepositoryError("会話保存後のデータを取得できませんでした。")
            return result
        except RepositoryError:
            raise
        except Exception as error:
            raise RepositoryError("会話結果の保存に失敗しました。") from error

    def list_memories(self, user_id: str, person_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            response = (
                self.client.table("person_memories")
                .select("*")
                .eq("person_id", person_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return list(_data(response) or [])
        except Exception as error:
            raise RepositoryError("記憶の取得に失敗しました。") from error

    def create_memory(self, user_id: str, person_id: str, values: Dict[str, Any]) -> Dict[str, Any]:
        try:
            response = self.client.table("person_memories").insert({"person_id": person_id, **values}).execute()
            result = _one(response)
            if result is None:
                raise RepositoryError("記憶保存後のデータを取得できませんでした。")
            return result
        except RepositoryError:
            raise
        except Exception as error:
            raise RepositoryError("記憶の保存に失敗しました。") from error

    def create_deck(self, values: Dict[str, Any]) -> Dict[str, Any]:
        try:
            response = self.client.table("decks").insert(values).execute()
            result = _one(response)
            if result is None:
                raise RepositoryError("デッキ保存後のデータを取得できませんでした。")
            return result
        except RepositoryError:
            raise
        except Exception as error:
            raise RepositoryError("デッキの保存に失敗しました。") from error


class InMemoryRepository:
    """Small repository used by tests and local API contract checks."""

    def __init__(self) -> None:
        self.users: Dict[str, Dict[str, Any]] = {}
        self.persons: Dict[str, Dict[str, Any]] = {}
        self.conversations: Dict[str, Dict[str, Any]] = {}
        self.memories: Dict[str, Dict[str, Any]] = {}
        self.decks: Dict[str, Dict[str, Any]] = {}

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        return self.users.get(user_id)

    def upsert_user(self, user_id: str, values: Dict[str, Any]) -> Dict[str, Any]:
        now = self._now()
        current = self.users.get(user_id, {"id": user_id, "created_at": now})
        current.update(values)
        current["updated_at"] = now
        self.users[user_id] = current
        return current.copy()

    def list_persons(self, user_id: str, query: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        values = [person for person in self.persons.values() if person["user_id"] == user_id]
        if query:
            needle = query.casefold()
            values = [
                person
                for person in values
                if any(
                    needle in str(person.get(field, "")).casefold()
                    for field in ("name", "relationship", "known_information")
                )
            ]
        return sorted(values, key=lambda item: item["updated_at"], reverse=True)[:limit]

    def get_person(self, user_id: str, person_id: str) -> Optional[Dict[str, Any]]:
        person = self.persons.get(person_id)
        return person.copy() if person and person["user_id"] == user_id else None

    def create_person(self, user_id: str, values: Dict[str, Any]) -> Dict[str, Any]:
        person_id = str(uuid4())
        now = self._now()
        person = {"id": person_id, "user_id": user_id, **values, "created_at": now, "updated_at": now}
        self.persons[person_id] = person
        return person.copy()

    def update_person(self, user_id: str, person_id: str, values: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        person = self.persons.get(person_id)
        if not person or person["user_id"] != user_id:
            return None
        person.update(values)
        person["updated_at"] = self._now()
        return person.copy()

    def list_conversations(
        self, user_id: str, person_id: Optional[str] = None, limit: int = 100
    ) -> List[Dict[str, Any]]:
        values = [conversation for conversation in self.conversations.values() if conversation["user_id"] == user_id]
        if person_id:
            values = [conversation for conversation in values if conversation.get("person_id") == person_id]
        return sorted(values, key=lambda item: item["created_at"], reverse=True)[:limit]

    def create_conversation(self, user_id: str, values: Dict[str, Any]) -> Dict[str, Any]:
        conversation_id = str(uuid4())
        conversation = {"id": conversation_id, "user_id": user_id, **values, "created_at": self._now()}
        self.conversations[conversation_id] = conversation
        return conversation.copy()

    def list_memories(self, user_id: str, person_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        if not self.get_person(user_id, person_id):
            return []
        values = [memory for memory in self.memories.values() if memory["person_id"] == person_id]
        return sorted(values, key=lambda item: item["created_at"], reverse=True)[:limit]

    def create_memory(self, user_id: str, person_id: str, values: Dict[str, Any]) -> Dict[str, Any]:
        if not self.get_person(user_id, person_id):
            raise RepositoryError("相手が見つかりません。")
        memory_id = str(uuid4())
        memory = {"id": memory_id, "person_id": person_id, **values, "created_at": self._now()}
        self.memories[memory_id] = memory
        return memory.copy()

    def create_deck(self, values: Dict[str, Any]) -> Dict[str, Any]:
        deck_id = str(uuid4())
        deck = {"id": deck_id, **values, "created_at": self._now()}
        self.decks[deck_id] = deck
        return deck.copy()
