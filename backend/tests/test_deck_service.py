"""Tests for the core conversation-deck generation service."""

import unittest

from schemas.deck import DeckGenerateRequest
from services.deck import (
    DECK_SYSTEM_PROMPT,
    DeckGenerationError,
    RuleBasedDeckGenerator,
    build_deck_prompt,
)


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


class DeckPromptTests(unittest.TestCase):
    def test_prompt_defines_the_json_contract_and_quality_rules(self) -> None:
        prompt = build_deck_prompt(make_request(avoid_topics=["政治"]))

        self.assertIn("`cards` は必ず3〜5件", prompt)
        self.assertIn("`user.avoid_topics`", prompt)
        self.assertIn("質問攻め", prompt)
        self.assertIn('"branches"', prompt)
        self.assertIn('"avoid_topics": ["政治"]', prompt)
        self.assertIn("JSONオブジェクトのみ", DECK_SYSTEM_PROMPT)

    def test_quick_topic_prompt_does_not_assume_person_information(self) -> None:
        prompt = build_deck_prompt(make_request())

        self.assertIn("さくっと話題: 相手は未登録です", prompt)
        self.assertIn("相手についての事実は推測しない", prompt)

    def test_registered_person_prompt_uses_person_context(self) -> None:
        request = DeckGenerateRequest.model_validate(
            {
                "user": {"interests": ["音楽"]},
                "person": {"name": "佐藤さん", "known_information": "映画が好き"},
                "context": {"purpose": "雑談", "situation": "イベント会場"},
            }
        )

        prompt = build_deck_prompt(request)

        self.assertIn("相手ありの話題", prompt)
        self.assertIn("過去の会話を、使える範囲で自然に活用", prompt)
        self.assertIn('"name": "佐藤さん"', prompt)
