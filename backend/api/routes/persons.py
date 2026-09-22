"""Conversation-partner and memory endpoints."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from api.dependencies import get_current_user_id, get_repository
from db.repository import Repository, RepositoryError
from schemas.models import Person, PersonCreate, PersonMemory, PersonMemoryCreate, PersonUpdate

router = APIRouter(tags=["persons", "memories"])


@router.get("/persons", response_model=List[Person], tags=["persons"])
def list_persons(
    q: Optional[str] = Query(default=None, max_length=100),
    limit: int = Query(default=100, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
    repository: Repository = Depends(get_repository),
) -> List[Person]:
    try:
        return [Person.model_validate(item) for item in repository.list_persons(user_id, q, limit)]
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
        raise HTTPException(status_code=404, detail="相手が見つかりません。")
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
        raise HTTPException(status_code=404, detail="相手が見つかりません。")
    return Person.model_validate(person)


@router.post(
    "/persons/{person_id}/memories",
    response_model=PersonMemory,
    status_code=status.HTTP_201_CREATED,
    tags=["memories"],
)
def create_memory(
    person_id: UUID,
    payload: PersonMemoryCreate,
    user_id: str = Depends(get_current_user_id),
    repository: Repository = Depends(get_repository),
) -> PersonMemory:
    try:
        if repository.get_person(user_id, str(person_id)) is None:
            raise HTTPException(status_code=404, detail="相手が見つかりません。")
        return PersonMemory.model_validate(
            repository.create_memory(user_id, str(person_id), payload.model_dump(mode="json"))
        )
    except RepositoryError as error:
        raise HTTPException(status_code=503, detail="記憶を保存できませんでした。") from error


@router.get("/persons/{person_id}/memories", response_model=List[PersonMemory], tags=["memories"])
def list_memories(
    person_id: UUID,
    limit: int = Query(default=100, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
    repository: Repository = Depends(get_repository),
) -> List[PersonMemory]:
    try:
        if repository.get_person(user_id, str(person_id)) is None:
            raise HTTPException(status_code=404, detail="相手が見つかりません。")
        return [
            PersonMemory.model_validate(item)
            for item in repository.list_memories(user_id, str(person_id), limit)
        ]
    except RepositoryError as error:
        raise HTTPException(status_code=503, detail="記憶を取得できませんでした。") from error
