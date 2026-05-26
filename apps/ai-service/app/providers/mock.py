class MockProvider:
    name = "mock"

    def __init__(self, configured_provider: str = "mock") -> None:
        self.configured_provider = configured_provider

    def health(self) -> dict[str, object]:
        return {
            "name": self.name,
            "configured_provider": self.configured_provider,
            "ready": True,
        }
