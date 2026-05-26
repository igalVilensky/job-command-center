from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.config import get_provider_config
from app.providers import get_provider
from app.providers.base import ProviderError

app = FastAPI(title="Job Command Center AI Service", version="0.1.0")


class ExtractJobsRequest(BaseModel):
    sourceText: str = Field(min_length=1)
    sourceType: str | None = None
    sourceName: str | None = None
    metadata: dict[str, Any] | None = None


class ExtractedJob(BaseModel):
    company: str
    title: str
    location: str
    remoteType: Literal[
        "remote",
        "remote_first",
        "hybrid",
        "homeoffice_possible",
        "onsite",
        "unknown",
    ]
    salaryText: str
    salaryMinEur: int | None
    salaryMaxEur: int | None
    url: str
    descriptionSummary: str
    fullDescription: str
    sourceQuality: Literal["full_description", "digest_summary", "email_summary", "unknown"]
    needsFullDescription: bool
    confidence: Literal["high", "medium", "low"]


class ExtractJobsResponse(BaseModel):
    sourceKind: Literal["single_job", "multi_job_digest", "recruiter_message", "not_job_source"]
    jobs: list[ExtractedJob]
    warnings: list[str]


class ReviewJobRequest(BaseModel):
    candidateProfile: dict[str, Any] = Field(default_factory=dict)
    job: dict[str, Any] = Field(default_factory=dict)
    description: dict[str, Any] | None = None


class ReviewJobResponse(BaseModel):
    score: int
    decision: Literal["apply", "maybe", "skip", "review_manually"]
    review: str
    riskFlags: list[str]
    cvAngle: str
    clarificationQuestions: list[str]
    confidence: Literal["high", "medium", "low"]


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


@app.post("/extract-jobs", response_model=ExtractJobsResponse)
def extract_jobs(request: ExtractJobsRequest) -> dict[str, object]:
    source_text = request.sourceText.strip()
    if not source_text:
        raise HTTPException(status_code=400, detail="sourceText is required")

    config = get_provider_config()
    provider = get_provider(config)

    try:
        return provider.extract_jobs(
            source_text=source_text,
            source_type=request.sourceType,
            source_name=request.sourceName,
            metadata=request.metadata,
        )
    except ProviderError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail={
                "message": error.message,
                "provider": provider.health(),
            },
        ) from error


@app.post("/review-job", response_model=ReviewJobResponse)
def review_job(request: ReviewJobRequest) -> dict[str, object]:
    config = get_provider_config()
    provider = get_provider(config)

    try:
        return provider.review_job(
            candidate_profile=request.candidateProfile,
            job=request.job,
            description=request.description,
        )
    except ProviderError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail={
                "message": error.message,
                "provider": provider.health(),
            },
        ) from error
