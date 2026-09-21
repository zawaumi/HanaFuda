"""Conversation-deck generation independent from HTTP and persistence."""

import json
from typing import Any, List, Optional, Protocol

from pydantic import ValidationError

from ai.orca_client import OrcaRouterClient, OrcaRouterError
from config import Settings, get_settings
from schemas.deck import DeckCard, DeckGenerateRequest, DeckGenerateResponse


class DeckGenerationError(RuntimeError):
    """Raised when a provider cannot produce a valid deck."""


class DeckGenerator(Protocol):
    def generate(self, request: DeckGenerateRequest) -> DeckGenerateResponse: ...


def _json_object(text: str) -> Any:
    """Extract a JSON object from a provider response, including fenced JSON."""

    candidate = text.strip()
    if candidate.startswith("```"):
        candidate = candidate.split("\n", 1)[1] if "\n" in candidate else candidate
        candidate = candidate.rsplit("```", 1)[0]
    start, end = candidate.find("{"), candidate.rfind("}")
    if start < 0 or end <= start:
        raise DeckGenerationError("AIの応答にJSONが含まれていません。")
    try:
        return json.loads(candidate[start : end + 1])
    except json.JSONDecodeError as error:
        raise DeckGenerationError("AIの応答をJSONとして解釈できませんでした。") from error


def parse_deck_response(text: str) -> DeckGenerateResponse:
    try:
        return DeckGenerateResponse.model_validate(_json_object(text))
    except ValidationError as error:
        raise DeckGenerationError("AIの応答が会話デッキの形式に一致しません。") from error


def build_deck_prompt(request: DeckGenerateRequest) -> str:
    payload = request.model_dump(mode="json")
    return (
        "あなたはHanaFudaの会話準備アシスタントです。\n"
        "入力にある避けたい話題は必ず避け、自然で答えやすい日本語の話題を3〜5枚作ってください。\n"
        "共通点、いま居る状況、過去の会話の続きの順で優先し、質問攻めにならない文にしてください。\n"
        "JSON以外を返さず、次の形に厳密に従ってください: "
        '{"summary":"短い助言","cards":[{"topic":"話題名","starter":"話し始め方",'
        '"reason":"理由","branches":[{"condition":"相手の反応","next":"次の一言"}]}]}\n'
        f"入力JSON:\n{json.dumps(payload, ensure_ascii=False)}"
    )


class RuleBasedDeckGenerator:
    """Deterministic fallback for local demos and provider outages."""

    def generate(self, request: DeckGenerateRequest) -> DeckGenerateResponse:
        context = request.context
        person_name = request.person.name if request.person and request.person.name else "相手"
        interests = request.user.interests
        candidates = [
            ("いまの状況", f"いまの{context.situation}、どんなきっかけで来られたんですか？"),
            ("最近興味があること", f"最近、{interests[0] if interests else '興味を持っていること'}で何か面白いことはありましたか？"),
            ("これからやりたいこと", f"{person_name}さんは、これからどんなことをしてみたいですか？"),
            ("軽い近況", "最近あったことで、誰かに話したくなったことはありますか？"),
            ("共通の場", "ここに来るのは今回が初めてですか？"),
        ]
        avoided = {topic.casefold() for topic in request.user.avoid_topics}
        selected = [item for item in candidates if not any(word and word in item[0].casefold() for word in avoided)]
        selected = selected[:3] if len(selected) >= 3 else candidates[:3]
        cards: List[DeckCard] = [
            DeckCard(
                topic=topic,
                starter=starter,
                reason="今いる状況や答えやすい近況から自然に話し始められるためです。",
                branches=[
                    {
                        "condition": "相手が具体的に話してくれた場合",
                        "next": "それについて、もう少し聞いてもいいですか？",
                    }
                ],
            )
            for topic, starter in selected
        ]
        return DeckGenerateResponse(
            summary="まずは今いる場や最近の出来事から、相手の答えに合わせて広げてみましょう。",
            cards=cards,
        )


class OrcaRouterDeckGenerator:
    def __init__(self, client: Optional[OrcaRouterClient] = None) -> None:
        self.client = client or OrcaRouterClient()

    async def generate_async(self, request: DeckGenerateRequest) -> DeckGenerateResponse:
        try:
            content = await self.client.create_chat_completion(
                [{"role": "system", "content": "You return only valid JSON."},
                 {"role": "user", "content": build_deck_prompt(request)}],
                temperature=0.4,
            )
        except OrcaRouterError as error:
            raise DeckGenerationError(str(error)) from error
        return parse_deck_response(content)


def generate_fallback(request: DeckGenerateRequest) -> DeckGenerateResponse:
    return RuleBasedDeckGenerator().generate(request)


class DeckService:
    """Select the configured generator and apply the documented fallback policy."""

    def __init__(self, settings: Optional[Settings] = None, client: Optional[OrcaRouterClient] = None) -> None:
        self.settings = settings or get_settings()
        self.client = client

    async def generate(self, request: DeckGenerateRequest) -> DeckGenerateResponse:
        if self.settings.deck_provider.lower() == "rules":
            return generate_fallback(request)
        try:
            return await OrcaRouterDeckGenerator(self.client).generate_async(request)
        except (DeckGenerationError, OrcaRouterError) as error:
            if not self.settings.deck_fallback_enabled:
                if isinstance(error, DeckGenerationError):
                    raise
                raise DeckGenerationError(str(error)) from error
            return generate_fallback(request)
