"""Send one harmless test message to OrcaRouter from the command line."""

import asyncio
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from ai.orca_client import OrcaRouterClient, OrcaRouterError  # noqa: E402


async def main() -> None:
    client = OrcaRouterClient()
    answer = await client.create_chat_completion(
        [{"role": "user", "content": "『接続確認できました』とだけ日本語で答えてください。"}]
    )
    print("OrcaRouter connection succeeded.")
    print(answer)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except OrcaRouterError as error:
        print(f"OrcaRouter connection failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
