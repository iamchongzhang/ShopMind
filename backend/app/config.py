"""Central configuration via environment variables."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Project root is 2 directories above this config file
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "ShopMind"
    app_version: str = "1.0.0"
    debug: bool = False
    secret_key: str = ""  # MUST be set via .env — no hardcoded default

    # Database (path resolved relative to project root)
    database_url: str = f"sqlite+aiosqlite:///{PROJECT_ROOT / 'data' / 'app.db'}"

    # Chroma
    chroma_persist_dir: str = str(PROJECT_ROOT / "data" / "chroma")
    chroma_collection_name: str = "kb_chunks"

    # Bailian (Alibaba Cloud)
    bailian_api_key: str = ""
    bailian_llm_model: str = "qwen-max"
    bailian_embedding_model: str = "text-embedding-v2"
    bailian_base_url: str = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"

    # LLM parameters
    llm_temperature: float = 0.1
    llm_max_tokens: int = 2048

    # Retrieval
    retrieval_k: int = 8
    retrieval_fetch_k: int = 20
    retrieval_lambda_mult: float = 0.7

    # Auth
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480  # 8 hours
    bcrypt_rounds: int = 12

    # Rate limiting
    rate_limit_enabled: bool = True

    # File upload
    max_upload_size_mb: int = 50
    allowed_file_types: list[str] = ["pdf", "txt", "csv", "md", "docx", "html"]

    # CORS
    cors_origins: list[str] = ["http://localhost:5173"]

    # Admin seed
    admin_username: str = "admin"
    admin_password: str = ""  # MUST be set via .env for production


settings = Settings()
