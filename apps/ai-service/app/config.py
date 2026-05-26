import os
from dataclasses import dataclass


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class ProviderConfig:
    ai_enabled: bool
    provider: str
    groq_model: str
    groq_api_url: str
    gemini_model: str
    ollama_base_url: str
    ollama_model: str
    has_groq_api_key: bool
    has_gemini_api_key: bool


def get_provider_config() -> ProviderConfig:
    return ProviderConfig(
        ai_enabled=_env_bool("AI_ENABLED", True),
        provider=os.getenv("AI_PROVIDER", "mock").strip().lower() or "mock",
        groq_model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        groq_api_url=os.getenv(
            "GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions"
        ),
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        ollama_model=os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
        has_groq_api_key=bool(os.getenv("GROQ_API_KEY")),
        has_gemini_api_key=bool(os.getenv("GEMINI_API_KEY")),
    )
