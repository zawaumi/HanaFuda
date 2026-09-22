"""Conversation-deck generation endpoint."""

from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import get_current_user_id, get_deck_service
from schemas.deck import DeckGenerateRequest, DeckGenerateResponse
from services.deck import DeckGenerationError, DeckService

router = APIRouter(tags=["deck"])


@router.post("/deck/generate", response_model=DeckGenerateResponse)
async def generate_deck(
    payload: DeckGenerateRequest,
    _user_id: str = Depends(get_current_user_id),
    service: DeckService = Depends(get_deck_service),
) -> DeckGenerateResponse:
    try:
        return await service.generate(payload)
    except DeckGenerationError as error:
        raise HTTPException(status_code=502, detail="会話デッキの生成に失敗しました。") from error
