"""Validation tests for the public deck-generation schemas."""

import unittest

from pydantic import ValidationError

from schemas.deck import DeckGenerateRequest, DeckGenerateResponse


def response_card(index: int) -> dict:
    return {
        "topic": f"話題 {index}",
        "starter": "最近、何か楽しかったことはありましたか？",
        "reason": "相手が答えやすく、会話を広げやすいためです。",
        "branches": [
            {
                "condition": "相手が詳しく話してくれた場合",
                "next": "それはいつ頃から続けているんですか？",
            }
        ],
    }


class DeckSchemaTests(unittest.TestCase):
    def test_accepts_a_valid_request_without_a_registered_person(self) -> None:
        request = DeckGenerateRequest.model_validate(
            {
                "user": {"interests": ["映画"]},
                "context": {
                    "purpose": "雑談",
                    "situation": "ハッカソン会場で初めて会う",
                },
            }
        )

        self.assertIsNone(request.person)
        self.assertEqual(request.history, [])

    def test_accepts_three_to_five_cards(self) -> None:
        response = DeckGenerateResponse.model_validate(
            {
                "summary": "会場の雰囲気から入ると自然です。",
                "cards": [response_card(index) for index in range(1, 4)],
            }
        )

        self.assertEqual(len(response.cards), 3)

    def test_rejects_fewer_than_three_cards(self) -> None:
        with self.assertRaises(ValidationError):
            DeckGenerateResponse.model_validate(
                {
                    "summary": "会場の雰囲気から入ると自然です。",
                    "cards": [response_card(index) for index in range(1, 3)],
                }
            )
