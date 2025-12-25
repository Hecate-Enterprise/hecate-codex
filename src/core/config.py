from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Hecate Codex"
    debug: bool = False

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/hecate_codex"

    upload_dir: str = "uploads"
    max_upload_size: int = 10 * 1024 * 1024  # 10MB


settings = Settings()
