"""Request and response schemas for conversation deck generation."""

from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, constr


class SchemaModel(BaseModel):
    """Common validation rules for the public deck API."""

    model_config = ConfigDict(str_strip_whitespace=True)


class UserProfileContext(SchemaModel):
    """Information about the user that helps personalize suggested topics."""

    name: Optional[str] = Field(default=None, max_length=100)
    status: Optional[str] = Field(default=None, max_length=200)
    interests: List[constr(strip_whitespace=True, min_length=1, max_length=100)] = Field(
        default_factory=list, max_length=20
    )
    recent: Optional[str] = Field(default=None, max_length=500)
    avoid_topics: List[constr(strip_whitespace=True, min_length=1, max_length=100)] = Field(
        default_factory=list, max_length=20
    )


class PersonContext(SchemaModel):
    """Known information about the conversation partner."""

    id: Optional[UUID] = None
    name: Optional[str] = Field(default=None, max_length=100)
    relationship: Optional[str] = Field(default=None, max_length=200)
    known_information: Optional[str] = Field(default=None, max_length=2_000)


class ConversationContext(SchemaModel):
    """Conditions for the upcoming conversation."""

    purpose: str = Field(min_length=1, max_length=300)
    situation: str = Field(min_length=1, max_length=500)
    extra: str = Field(default="", max_length=1_000)


class PersonMemoryContext(SchemaModel):
    """A confirmed fact learned from an earlier conversation."""

    content: str = Field(min_length=1, max_length=1_000)
    created_at: Optional[datetime] = None


class ConversationHistoryItem(SchemaModel):
    """A compact prior-conversation record used as LLM context."""

    created_at: datetime
    purpose: str = Field(min_length=1, max_length=300)
    situation: str = Field(min_length=1, max_length=500)
    extra: str = Field(default="", max_length=1_000)
    rating: Optional[Literal["good", "normal", "poor"]] = None
    memo: Optional[str] = Field(default=None, max_length=2_000)
    memories: List[PersonMemoryContext] = Field(default_factory=list)


class DeckGenerateRequest(SchemaModel):
    """Input accepted by POST /api/deck/generate."""

    user: UserProfileContext
    person: Optional[PersonContext] = None
    context: ConversationContext
    history: List[ConversationHistoryItem] = Field(default_factory=list)


class ConversationBranch(SchemaModel):
    """A follow-up suggestion for one possible partner reaction."""

    condition: str = Field(min_length=1, max_length=300)
    next: str = Field(min_length=1, max_length=500)


class DeckCard(SchemaModel):
    """One immediately usable conversation-topic card."""

    topic: str = Field(min_length=1, max_length=100)
    starter: str = Field(min_length=1, max_length=300)
    reason: str = Field(min_length=1, max_length=500)
    branches: List[ConversationBranch] = Field(min_length=2, max_length=2)


class DeckGenerateResponse(SchemaModel):
    """Output returned to the frontend after a deck is generated."""

    summary: str = Field(min_length=1, max_length=500)
    cards: List[DeckCard] = Field(min_length=3, max_length=5)
