"""Public request and response models for the MVP CRUD APIs."""

from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import Field

from schemas.deck import DeckCard, SchemaModel


class UserProfile(SchemaModel):
    id: UUID
    name: str = Field(default="", max_length=100)
    status: str = Field(default="", max_length=200)
    interests: List[str] = Field(default_factory=list, max_length=20)
    recent: str = Field(default="", max_length=500)
    avoid_topics: List[str] = Field(default_factory=list, max_length=20)
    created_at: datetime
    updated_at: datetime


class UserProfileUpdate(SchemaModel):
    name: Optional[str] = Field(default=None, max_length=100)
    status: Optional[str] = Field(default=None, max_length=200)
    interests: Optional[List[str]] = Field(default=None, max_length=20)
    recent: Optional[str] = Field(default=None, max_length=500)
    avoid_topics: Optional[List[str]] = Field(default=None, max_length=20)


class PersonCreate(SchemaModel):
    name: str = Field(default="名前不明", min_length=1, max_length=100)
    relationship: str = Field(min_length=1, max_length=200)
    known_information: str = Field(default="", max_length=2_000)


class PersonUpdate(SchemaModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    relationship: Optional[str] = Field(default=None, min_length=1, max_length=200)
    known_information: Optional[str] = Field(default=None, max_length=2_000)


class Person(SchemaModel):
    id: UUID
    user_id: UUID
    name: str
    relationship: str
    known_information: str
    created_at: datetime
    updated_at: datetime


class ConversationCreate(SchemaModel):
    person_id: Optional[UUID] = None
    purpose: str = Field(min_length=1, max_length=300)
    situation: str = Field(min_length=1, max_length=500)
    extra: str = Field(default="", max_length=1_000)
    rating: Optional[Literal["good", "normal", "poor"]] = None
    memo: Optional[str] = Field(default=None, max_length=2_000)


class Conversation(SchemaModel):
    id: UUID
    person_id: Optional[UUID] = None
    purpose: str
    situation: str
    extra: str
    rating: Optional[Literal["good", "normal", "poor"]] = None
    memo: Optional[str] = None
    created_at: datetime


class PersonMemoryCreate(SchemaModel):
    content: str = Field(min_length=1, max_length=1_000)
    source_conversation_id: Optional[UUID] = None
    confirmed: bool = True


class PersonMemory(SchemaModel):
    id: UUID
    person_id: UUID
    content: str
    source_conversation_id: Optional[UUID] = None
    confirmed: bool
    created_at: datetime


class Deck(SchemaModel):
    id: UUID
    conversation_id: UUID
    summary: str
    cards: List[DeckCard]
    created_at: datetime
