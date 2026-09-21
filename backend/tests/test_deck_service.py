"""Core deck generation tests."""

import pytest

from schemas.deck import DeckGenerateRequest
from services.deck import DeckGenerationError, RuleBasedDeckGenerator, parse_deck_response


def test_rule_generator_returns_three_usable_cards():
    request = DeckGenerateRequest.model_validate(
        {"user": {"interests": ["映画"]}, "context": {"purpose": "雑談", "situation": "交流会"}}
    )
    response = RuleBasedDeckGenerator().generate(request)
    assert len(response.cards) == 3
    assert all(card.branches for card in response.cards)


def test_ai_response_parser_rejects_non_deck_json():
    with pytest.raises(DeckGenerationError):
        parse_deck_response('{"cards": []}')
