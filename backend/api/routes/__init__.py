"""Route composition for the public API."""

from fastapi import APIRouter

from api.routes import conversations, deck, persons, profile

router = APIRouter(prefix="/api")
router.include_router(profile.router)
router.include_router(persons.router)
router.include_router(conversations.router)
router.include_router(deck.router)
