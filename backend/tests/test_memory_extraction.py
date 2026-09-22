"""Tests for the AI memory-extraction contract and prompt."""

import asyncio
import unittest

from pydantic import ValidationError

from schemas.memory import MemoryExtractionRequest, MemoryExtractionResponse
from services.memory import (
    MEMORY_EXTRACTION_SYSTEM_PROMPT,
    MemoryExtractionError,
    OrcaRouterMemoryExtractor,
    build_memory_extraction_prompt,
    parse_memory_extraction_response,
)


def make_request(**conversation_overrides: object) -> MemoryExtractionRequest:
    conversation = {
        "purpose": "雑談",
        "situation": "大学の交流会",
        "rating": "good",
        "memo": "佐藤さんは最近ギターを始めたと話していた。",
        **conversation_overrides,
    }
    return MemoryExtractionRequest.model_validate(
        {
            "person": {"name": "佐藤さん", "known_information": "映画が好き"},
            "conversation": conversation,
        }
    )


class FakeOrcaRouterClient:
    def __init__(self, response: str) -> None:
        self.response = response
        self.calls: list[dict[str, object]] = []

    async def create_chat_completion(self, messages: object, **kwargs: object) -> str:
        self.calls.append({"messages": messages, **kwargs})
        return self.response


class MemoryExtractionSchemaTests(unittest.TestCase):
    def test_accepts_one_candidate_or_null(self) -> None:
        self.assertEqual(
            MemoryExtractionResponse.model_validate({"candidate": "最近ギターを始めた"}).candidate,
            "最近ギターを始めた",
        )
        self.assertIsNone(MemoryExtractionResponse.model_validate({"candidate": None}).candidate)

    def test_rejects_blank_or_multiple_candidates(self) -> None:
        with self.assertRaises(ValidationError):
            MemoryExtractionResponse.model_validate({"candidate": "  "})
        with self.assertRaises(ValidationError):
            MemoryExtractionResponse.model_validate({"candidate": ["ギター", "映画"]})


class MemoryExtractionResponseTests(unittest.TestCase):
    def test_accepts_fenced_json(self) -> None:
        result = parse_memory_extraction_response('```json\n{"candidate":"最近ギターを始めた"}\n```')

        self.assertEqual(result.candidate, "最近ギターを始めた")

    def test_rejects_missing_candidate_key(self) -> None:
        with self.assertRaises(MemoryExtractionError):
            parse_memory_extraction_response('{"memory":"最近ギターを始めた"}')


class MemoryExtractionPromptTests(unittest.TestCase):
    def test_prompt_defines_grounded_single_candidate_contract(self) -> None:
        prompt = build_memory_extraction_prompt(make_request())

        self.assertIn("1件だけ", prompt)
        self.assertIn("推測・補完・一般論を加えない", prompt)
        self.assertIn("既知情報と重複", prompt)
        self.assertIn("必ず null", prompt)
        self.assertIn('"candidate":"最近ギターを始めた"', prompt)
        self.assertIn('"name": "佐藤さん"', prompt)
        self.assertIn("JSONオブジェクトのみ", MEMORY_EXTRACTION_SYSTEM_PROMPT)

    def test_extractor_returns_valid_candidate_without_persisting(self) -> None:
        client = FakeOrcaRouterClient('{"candidate":"最近ギターを始めた"}')

        result = asyncio.run(OrcaRouterMemoryExtractor(client).extract(make_request()))

        self.assertEqual(result.candidate, "最近ギターを始めた")
        self.assertEqual(len(client.calls), 1)
        self.assertEqual(client.calls[0]["response_format"], {"type": "json_object"})
