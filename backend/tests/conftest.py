"""Shared fixtures for backend tests."""

import pytest
from fastapi.testclient import TestClient

from api.dependencies import get_deck_service, get_repository
from config import Settings
from db.repository import InMemoryRepository
from main import app
from services.deck import DeckService


@pytest.fixture
def repository() -> InMemoryRepository:
    return InMemoryRepository()


@pytest.fixture
def client(repository: InMemoryRepository) -> TestClient:
    app.dependency_overrides[get_repository] = lambda: repository
    app.dependency_overrides[get_deck_service] = lambda: DeckService(
        Settings(deck_provider="rules")
    )
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
