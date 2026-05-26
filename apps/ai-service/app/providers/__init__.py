from app.config import ProviderConfig
from app.providers.mock import MockProvider


def get_provider(config: ProviderConfig) -> MockProvider:
    return MockProvider(configured_provider=config.provider)
