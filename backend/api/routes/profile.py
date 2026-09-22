"""Profile endpoints."""

from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import get_current_user_id, get_repository
from db.repository import Repository, RepositoryError
from schemas.models import UserProfile, UserProfileUpdate

router = APIRouter(tags=["profile"])


def _ensure_profile(repository: Repository, user_id: str) -> dict:
    current = repository.get_user(user_id)
    if current:
        return current
    return repository.upsert_user(
        user_id,
        {"name": "", "status": "", "interests": [], "recent": "", "avoid_topics": []},
    )


@router.get("/profile", response_model=UserProfile)
def get_profile(
    user_id: str = Depends(get_current_user_id), repository: Repository = Depends(get_repository)
) -> UserProfile:
    try:
        return UserProfile.model_validate(_ensure_profile(repository, user_id))
    except RepositoryError as error:
        raise HTTPException(status_code=503, detail="プロフィールを取得できませんでした。") from error


@router.patch("/profile", response_model=UserProfile)
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
