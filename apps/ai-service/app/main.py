from fastapi import FastAPI

from app.config import get_provider_config
from app.providers import get_provider

app = FastAPI(title="Job Command Center AI Service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, object]:
    config = get_provider_config()
    provider = get_provider(config)

    return {
        "status": "ok",
        "service": "ai-service",
        "ai_enabled": config.ai_enabled,
        "configured_provider": config.provider,
        "provider": provider.health(),
    }
