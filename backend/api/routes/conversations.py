"""Conversation-history endpoints."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from api.dependencies import get_current_user_id, get_repository
from db.repository import Repository, RepositoryError
from schemas.models import Conversation, ConversationCreate

router = APIRouter(tags=["conversations"])


@router.get("/conversations", response_model=List[Conversation])
def list_conversations(
    person_id: Optional[UUID] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
    repository: Repository = Depends(get_repository),
) -> List[Conversation]:
    try:
        return [
            Conversation.model_validate(item)
            for item in repository.list_conversations(user_id, str(person_id) if person_id else None, limit)
        ]
    except RepositoryError as error:
        raise HTTPException(status_code=503, detail="会話履歴を取得できませんでした。") from error


@router.post("/conversations", response_model=Conversation, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: ConversationCreate,
    user_id: str = Depends(get_current_user_id),
    repository: Repository = Depends(get_repository),
) -> Conversation:
    try:
        if payload.person_id and repository.get_person(user_id, str(payload.person_id)) is None:
            raise HTTPException(status_code=404, detail="相手が見つかりません。")
        return Conversation.model_validate(repository.create_conversation(user_id, payload.model_dump(mode="json")))
    except RepositoryError as error:
        raise HTTPException(status_code=503, detail="会話結果を保存できませんでした。") from error
