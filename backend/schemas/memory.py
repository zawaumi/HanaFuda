"""Schemas shared by AI memory extraction and its future HTTP route."""

from typing import Literal, Optional

from pydantic import Field, field_validator

from schemas.deck import SchemaModel


class MemoryExtractionPerson(SchemaModel):
    """Existing information used to avoid duplicating a memory candidate."""

    name: str = Field(min_length=1, max_length=100)
    known_information: str = Field(default="", max_length=2_000)


class MemoryExtractionConversation(SchemaModel):
    """The post-conversation information supplied by the feedback screen."""

    purpose: str = Field(min_length=1, max_length=300)
    situation: str = Field(min_length=1, max_length=500)
    extra: str = Field(default="", max_length=1_000)
    rating: Optional[Literal["good", "normal", "poor"]] = None
    memo: str = Field(default="", max_length=2_000)


class MemoryExtractionRequest(SchemaModel):
    """Input to the AI-only extraction service; not a persistence request."""

    person: MemoryExtractionPerson
    conversation: MemoryExtractionConversation


class MemoryExtractionResponse(SchemaModel):
    """One user-reviewable candidate, or no candidate when saving is unsuitable."""

    candidate: Optional[str] = Field(..., min_length=1, max_length=1_000)

    @field_validator("candidate")
    @classmethod
    def candidate_must_not_be_blank(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not value.strip():
            raise ValueError("candidate must not be blank")
        return value
