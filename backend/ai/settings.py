"""Environment-based configuration for AI provider integrations."""

from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class OrcaRouterSettings(BaseSettings):
    """Settings required to call OrcaRouter's OpenAI-compatible API."""

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    api_key: SecretStr = Field(validation_alias="ORCAROUTER_API_KEY")
    base_url: str = Field(
        default="https://api.orcarouter.ai/v1",
        validation_alias="ORCAROUTER_BASE_URL",
    )
    model: str = Field(
        default="orcarouter/auto",
        validation_alias="ORCAROUTER_MODEL",
    )
    timeout_seconds: float = Field(
        default=30.0,
        gt=0,
        validation_alias="ORCAROUTER_TIMEOUT_SECONDS",
    )

    @property
    def chat_completions_url(self) -> str:
        """Return the endpoint without duplicate slashes."""

        return f"{self.base_url.rstrip('/')}/chat/completions"
