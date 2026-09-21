"""MVP HTTP routes."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from api.dependencies import get_current_user_id, get_deck_service, get_repository
from db.repository import Repository, RepositoryError
from schemas.deck import DeckGenerateRequest, DeckGenerateResponse
from schemas.models import (
    Conversation,
    ConversationCreate,
    Person,
    PersonCreate,
    PersonMemory,
    PersonMemoryCreate,
    PersonUpdate,
    UserProfile,
    UserProfileUpdate,
)
from services.deck import DeckGenerationError, DeckService


router = APIRouter(prefix="/api")


def _profile(repository: Repository, user_id: str) -> dict:
    current = repository.get_user(user_id)
    if current:
        return current
    return repository.upsert_user(
        user_id,
        {"name": "", "status": "", "interests": [], "recent": "", "avoid_topics": []},
    )


def _not_found(detail: str) -> HTTPException:
    return HTTPException(status_code=404, detail=detail)


@router.get("/profile", response_model=UserProfile, tags=["profile"])
def get_profile(user_id: str = Depends(get_current_user_id), repository: Repository = Depends(get_repository)) -> UserProfile:
    try:
        return UserProfile.model_validate(_profile(repository, user_id))
    except RepositoryError as error:
        raise HTTPException(status_code=503, detail="プロフィールを取得できませんでした。") from error


@router.patch("/profile", response_model=UserProfile, tags=["profile"])
def update_profile(
    payload: UserProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    repository: Repository = Depends(get_repository),
) -> UserProfile:
    try:
        values = payload.model_dump(exclude_unset=True)
        return UserProfile.model_validate(repository.upsert_user(user_id, values))
    except RepositoryError as error:
        raise HTTPException(status_code=503, detail="プロフィールを保存できませんでした。") from error


@router.get("/persons", response_model=List[Person], tags=["persons"])
def list_persons(
    q: Optional[str] = Query(default=None, max_length=100),
    user_id: str = Depends(get_current_user_id),
    repository: Repository = Depends(get_repository),
) -> List[Person]:
    try:
        return [Person.model_validate(item) for item in repository.list_persons(user_id, q)]
    except RepositoryError as error:
        raise HTTPException(status_code=503, detail="相手一覧を取得できませんでした。") from error


@router.post("/persons", response_model=Person, status_code=status.HTTP_201_CREATED, tags=["persons"])
def create_person(
    payload: PersonCreate,
    user_id: str = Depends(get_current_user_id),
    repository: Repository = Depends(get_repository),
) -> Person:
    try:
        return Person.model_validate(repository.create_person(user_id, payload.model_dump()))
    except RepositoryError as error:
        raise HTTPException(status_code=503, detail="相手を登録できませんでした。") from error


@router.get("/persons/{person_id}", response_model=Person, tags=["persons"])
def get_person(
    person_id: UUID,
    user_id: str = Depends(get_current_user_id),
    repository: Repository = Depends(get_repository),
) -> Person:
    try:
        person = repository.get_person(user_id, str(person_id))
    except RepositoryError as error:
        raise HTTPException(status_code=503, detail="相手情報を取得できませんでした。") from error
    if person is None:
        raise _not_found("相手が見つかりません。")
    return Person.model_validate(person)


@router.patch("/persons/{person_id}", response_model=Person, tags=["persons"])
def update_person(
    person_id: UUID,
    payload: PersonUpdate,
    user_id: str = Depends(get_current_user_id),
    repository: Repository = Depends(get_repository),
) -> Person:
    try:
        person = repository.update_person(user_id, str(person_id), payload.model_dump(exclude_unset=True))
    except RepositoryError as error:
        raise HTTPException(status_code=503, detail="相手情報を更新できませんでした。") from error
    if person is None:
        raise _not_found("相手が見つかりません。")
    return Person.model_validate(person)


@router.get("/conversations", response_model=List[Conversation], tags=["conversations"])
def list_conversations(
    person_id: Optional[UUID] = Query(default=None),
    user_id: str = Depends(get_current_user_id),
    repository: Repository = Depends(get_repository),
) -> List[Conversation]:
    try:
        return [
            Conversation.model_validate(item)
            for item in repository.list_conversations(user_id, str(person_id) if person_id else None)
        ]
    except RepositoryError as error:
        raise HTTPException(status_code=503, detail="会話履歴を取得できませんでした。") from error


@router.post("/conversations", response_model=Conversation, status_code=status.HTTP_201_CREATED, tags=["conversations"])
def create_conversation(
    payload: ConversationCreate,
    user_id: str = Depends(get_current_user_id),
    repository: Repository = Depends(get_repository),
) -> Conversation:
    try:
        if payload.person_id and repository.get_person(user_id, str(payload.person_id)) is None:
            raise _not_found("相手が見つかりません。")
        return Conversation.model_validate(repository.create_conversation(user_id, payload.model_dump(mode="json")))
    except RepositoryError as error:
        raise HTTPException(status_code=503, detail="会話結果を保存できませんでした。") from error


@router.post("/persons/{person_id}/memories", response_model=PersonMemory, status_code=status.HTTP_201_CREATED, tags=["memories"])
def create_memory(
    person_id: UUID,
    payload: PersonMemoryCreate,
    user_id: str = Depends(get_current_user_id),
    repository: Repository = Depends(get_repository),
) -> PersonMemory:
    try:
        if repository.get_person(user_id, str(person_id)) is None:
            raise _not_found("相手が見つかりません。")
        return PersonMemory.model_validate(
            repository.create_memory(user_id, str(person_id), payload.model_dump(mode="json"))
        )
    except RepositoryError as error:
        raise HTTPException(status_code=503, detail="記憶を保存できませんでした。") from error


@router.post("/deck/generate", response_model=DeckGenerateResponse, tags=["deck"])
async def generate_deck(
    payload: DeckGenerateRequest,
    service: DeckService = Depends(get_deck_service),
) -> DeckGenerateResponse:
    try:
        return await service.generate(payload)
    except DeckGenerationError as error:
        raise HTTPException(status_code=502, detail="会話デッキの生成に失敗しました。") from error
