from typing import Any

from app.config import ProviderConfig
from app.providers.base import ProviderError
from app.providers.groq import GroqProvider
from app.providers.mock import MockProvider


class UnsupportedProvider:
    def __init__(self, configured_provider: str) -> None:
        self.name = "unsupported"
        self.configured_provider = configured_provider

    def health(self) -> dict[str, object]:
        return {
            "name": self.name,
            "configured_provider": self.configured_provider,
            "ready": False,
            "error": f"Unsupported AI_PROVIDER: {self.configured_provider}",
        }

    def extract_jobs(
        self,
        source_text: str,
        source_type: str | None = None,
        source_name: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, object]:
        raise ProviderError(f"Unsupported AI_PROVIDER: {self.configured_provider}", 503)

    def review_job(
        self,
        candidate_profile: dict[str, Any],
        job: dict[str, Any],
        description: dict[str, Any] | None,
    ) -> dict[str, object]:
        raise ProviderError(f"Unsupported AI_PROVIDER: {self.configured_provider}", 503)


def get_provider(config: ProviderConfig) -> MockProvider | GroqProvider | UnsupportedProvider:
    if config.provider == "groq":
        return GroqProvider(config)

    if config.provider == "mock":
        return MockProvider(configured_provider=config.provider)

    return UnsupportedProvider(configured_provider=config.provider)
