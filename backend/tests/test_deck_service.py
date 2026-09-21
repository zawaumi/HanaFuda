"""Tests for the core conversation-deck generation service."""

import unittest

from schemas.deck import DeckGenerateRequest
from services.deck import DeckGenerationError, RuleBasedDeckGenerator


def make_request(**user_overrides: object) -> DeckGenerateRequest:
    user = {"interests": ["音楽"], **user_overrides}
    return DeckGenerateRequest.model_validate(
        {
            "user": user,
            "context": {"purpose": "雑談", "situation": "会場"},
        }
    )


class RuleBasedDeckGeneratorTests(unittest.TestCase):
    def test_generates_three_cards_for_a_quick_topic_request(self) -> None:
        result = RuleBasedDeckGenerator().generate(make_request())

        self.assertEqual(len(result.cards), 3)
        self.assertTrue(all(card.topic and card.branches for card in result.cards))

    def test_does_not_reintroduce_avoided_topics_when_filtering(self) -> None:
        result = RuleBasedDeckGenerator().generate(
            make_request(avoid_topics=["いま", "最近", "これから"])
        )

        rendered = " ".join(
            f"{card.topic} {card.starter}" for card in result.cards
        ).casefold()
        for topic in ("いま", "最近", "これから"):
            self.assertNotIn(topic, rendered)

    def test_raises_when_avoid_topics_leave_fewer_than_three_candidates(self) -> None:
        with self.assertRaises(DeckGenerationError):
            RuleBasedDeckGenerator().generate(
                make_request(
                    avoid_topics=[
                        "いま",
                        "最近",
                        "これから",
                        "軽い",
                        "共通",
                        "好き",
                        "大切",
                        "印象",
                    ]
                )
            )
