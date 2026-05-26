import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[3] / ".env")
load_dotenv()


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default

    try:
        parsed = int(value)
    except ValueError:
        return default

    return parsed if parsed > 0 else default


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class ProviderConfig:
    ai_enabled: bool
    provider: str
    groq_api_key: str | None
    groq_model: str
    groq_api_url: str
    extraction_max_source_chars: int
    review_max_description_chars: int
    gemini_model: str
    ollama_base_url: str
    ollama_model: str
    has_groq_api_key: bool
    has_groq_model: bool
    has_gemini_api_key: bool


def get_provider_config() -> ProviderConfig:
    groq_api_key = os.getenv("GROQ_API_KEY")
    groq_model = os.getenv("GROQ_MODEL")

    return ProviderConfig(
        ai_enabled=_env_bool("AI_ENABLED", True),
        provider=os.getenv("AI_PROVIDER", "mock").strip().lower() or "mock",
        groq_api_key=groq_api_key.strip() if groq_api_key and groq_api_key.strip() else None,
        groq_model=groq_model.strip()
        if groq_model and groq_model.strip()
        else "llama-3.3-70b-versatile",
        groq_api_url=os.getenv(
            "GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions"
        ),
        extraction_max_source_chars=_env_int("AI_EXTRACTION_MAX_SOURCE_CHARS", 20000),
        review_max_description_chars=_env_int("AI_REVIEW_MAX_DESCRIPTION_CHARS", 4500),
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        ollama_model=os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
        has_groq_api_key=bool(groq_api_key and groq_api_key.strip()),
        has_groq_model=bool(groq_model and groq_model.strip()),
        has_gemini_api_key=bool(os.getenv("GEMINI_API_KEY")),
    )
