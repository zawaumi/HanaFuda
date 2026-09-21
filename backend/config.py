"""Application configuration loaded from environment variables."""

from functools import lru_cache
from pathlib import Path
from typing import Annotated, List, Optional

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


ENV_FILE = Path(__file__).resolve().parent / ".env"


class Settings(BaseSettings):
    """Settings shared by the API, database and integrations."""

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "HanaFuda API"
    app_env: str = Field(default="development", validation_alias="APP_ENV")
    log_level: str = Field(default="INFO", validation_alias="LOG_LEVEL")
    api_prefix: str = Field(default="/api", validation_alias="API_PREFIX")
    cors_origins: Annotated[List[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"],
        validation_alias="CORS_ORIGINS",
    )
    default_user_id: str = Field(
        default="00000000-0000-0000-0000-000000000001",
        validation_alias="DEFAULT_USER_ID",
    )
    supabase_url: Optional[str] = Field(default=None, validation_alias="SUPABASE_URL")
    supabase_key: Optional[SecretStr] = Field(default=None, validation_alias="SUPABASE_KEY")
    supabase_service_role_key: Optional[SecretStr] = Field(
        default=None, validation_alias="SUPABASE_SERVICE_ROLE_KEY"
    )
    supabase_schema: str = Field(default="public", validation_alias="SUPABASE_SCHEMA")
    deck_provider: str = Field(default="orca", validation_alias="DECK_PROVIDER")
    deck_fallback_enabled: bool = Field(
        default=False, validation_alias="DECK_FALLBACK_ENABLED"
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def database_key(self) -> Optional[SecretStr]:
        """Prefer the server-only key, falling back to the configured API key."""

        return self.supabase_service_role_key or self.supabase_key

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.database_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
