import json
import urllib.error
import urllib.request
from typing import Any

from app.config import ProviderConfig
from app.providers.base import ProviderError


SOURCE_KINDS = {"single_job", "multi_job_digest", "recruiter_message", "not_job_source"}
REMOTE_TYPES = {
    "remote",
    "remote_first",
    "hybrid",
    "homeoffice_possible",
    "onsite",
    "unknown",
}
SOURCE_QUALITIES = {"full_description", "digest_summary", "email_summary", "unknown"}
CONFIDENCE_VALUES = {"high", "medium", "low"}
REVIEW_DECISIONS = {"apply", "maybe", "skip", "review_manually"}


EXTRACTION_SCHEMA_EXAMPLE = {
    "sourceKind": "single_job",
    "jobs": [
        {
            "company": "",
            "title": "",
            "location": "",
            "remoteType": "unknown",
            "salaryText": "",
            "salaryMinEur": None,
            "salaryMaxEur": None,
            "url": "",
            "descriptionSummary": "",
            "fullDescription": "",
            "sourceQuality": "unknown",
            "needsFullDescription": True,
            "confidence": "low",
        }
    ],
    "warnings": [],
}

REVIEW_SCHEMA_EXAMPLE = {
    "score": 0,
    "decision": "review_manually",
    "review": "",
    "riskFlags": [],
    "cvAngle": "",
    "clarificationQuestions": [],
    "confidence": "low",
}


def _truncate_text(value: str, limit: int) -> str:
    text = value.strip()
    if len(text) <= limit:
        return text

    marker = "\n\n[truncated for token budget]\n\n"
    keep_head = max(0, limit - len(marker))
    return f"{text[:keep_head].rstrip()}{marker}"


def _json_dump(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, default=str)


def _parse_json_object(value: str, label: str) -> dict[str, Any]:
    text = value.strip()

    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ProviderError(f"{label} was not valid JSON", 502)
        try:
            parsed = json.loads(text[start : end + 1])
        except json.JSONDecodeError as error:
            raise ProviderError(f"{label} was not valid JSON: {error.msg}", 502) from error

    if not isinstance(parsed, dict):
        raise ProviderError(f"{label} must be a JSON object", 502)

    return parsed


def _extract_api_error(body: str) -> str:
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        return body[:300] if body else "empty response body"

    if isinstance(parsed, dict):
        error = parsed.get("error")
        if isinstance(error, dict):
            message = error.get("message")
            if isinstance(message, str) and message.strip():
                return message.strip()
        message = parsed.get("message")
        if isinstance(message, str) and message.strip():
            return message.strip()

    return body[:300] if body else "empty response body"


def _object(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ProviderError(f"{label} must be an object", 502)
    return value


def _required(value: dict[str, Any], field: str, label: str) -> Any:
    if field not in value:
        raise ProviderError(f"{label}.{field} is required", 502)
    return value[field]


def _string(value: Any, label: str) -> str:
    if not isinstance(value, str):
        raise ProviderError(f"{label} must be a string", 502)
    return value.strip()


def _string_array(value: Any, label: str) -> list[str]:
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        raise ProviderError(f"{label} must be an array of strings", 502)
    return [item.strip() for item in value if item.strip()]


def _enum(value: Any, label: str, allowed: set[str]) -> str:
    item = _string(value, label)
    if item not in allowed:
        raise ProviderError(f"{label} must be one of: {', '.join(sorted(allowed))}", 502)
    return item


def _nullable_int(value: Any, label: str) -> int | None:
    if value is None:
        return None
    if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
        raise ProviderError(f"{label} must be a positive integer or null", 502)
    return value


def _score(value: Any) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value < 0 or value > 100:
        raise ProviderError("review.score must be an integer between 0 and 100", 502)
    return value


def _boolean(value: Any, label: str) -> bool:
    if not isinstance(value, bool):
        raise ProviderError(f"{label} must be a boolean", 502)
    return value


def _validate_url(value: str, label: str) -> str:
    if not value:
        return value
    if not value.startswith(("http://", "https://")):
        raise ProviderError(f"{label} must be a URL string or an empty string", 502)
    return value


def _normalize_extraction(payload: dict[str, Any]) -> dict[str, object]:
    source_kind = _enum(_required(payload, "sourceKind", "extraction"), "extraction.sourceKind", SOURCE_KINDS)
    jobs_value = _required(payload, "jobs", "extraction")

    if not isinstance(jobs_value, list) or not jobs_value:
        raise ProviderError("extraction.jobs must be a non-empty array", 502)

    jobs = []
    for index, raw_job in enumerate(jobs_value):
        label = f"extraction.jobs[{index}]"
        job = _object(raw_job, label)
        salary_min = _nullable_int(_required(job, "salaryMinEur", label), f"{label}.salaryMinEur")
        salary_max = _nullable_int(_required(job, "salaryMaxEur", label), f"{label}.salaryMaxEur")

        if salary_min is not None and salary_max is not None and salary_min > salary_max:
            raise ProviderError(f"{label} has salaryMinEur greater than salaryMaxEur", 502)

        company = _string(_required(job, "company", label), f"{label}.company")
        title = _string(_required(job, "title", label), f"{label}.title")

        jobs.append(
            {
                "company": company or f"Unknown company {index + 1}",
                "title": title or "Unknown job opportunity",
                "location": _string(_required(job, "location", label), f"{label}.location"),
                "remoteType": _enum(_required(job, "remoteType", label), f"{label}.remoteType", REMOTE_TYPES),
                "salaryText": _string(_required(job, "salaryText", label), f"{label}.salaryText"),
                "salaryMinEur": salary_min,
                "salaryMaxEur": salary_max,
                "url": _validate_url(_string(_required(job, "url", label), f"{label}.url"), f"{label}.url"),
                "descriptionSummary": _string(
                    _required(job, "descriptionSummary", label), f"{label}.descriptionSummary"
                ),
                "fullDescription": _string(_required(job, "fullDescription", label), f"{label}.fullDescription"),
                "sourceQuality": _enum(
                    _required(job, "sourceQuality", label), f"{label}.sourceQuality", SOURCE_QUALITIES
                ),
                "needsFullDescription": _boolean(
                    _required(job, "needsFullDescription", label), f"{label}.needsFullDescription"
                ),
                "confidence": _enum(_required(job, "confidence", label), f"{label}.confidence", CONFIDENCE_VALUES),
            }
        )

    return {
        "sourceKind": source_kind,
        "jobs": jobs,
        "warnings": _string_array(_required(payload, "warnings", "extraction"), "extraction.warnings"),
    }


def _normalize_review(payload: dict[str, Any]) -> dict[str, object]:
    review_text = _string(_required(payload, "review", "review"), "review.review")
    cv_angle = _string(_required(payload, "cvAngle", "review"), "review.cvAngle")

    if not review_text:
        raise ProviderError("review.review is required", 502)
    if not cv_angle:
        raise ProviderError("review.cvAngle is required", 502)

    return {
        "score": _score(_required(payload, "score", "review")),
        "decision": _enum(_required(payload, "decision", "review"), "review.decision", REVIEW_DECISIONS),
        "review": review_text,
        "riskFlags": _string_array(_required(payload, "riskFlags", "review"), "review.riskFlags"),
        "cvAngle": cv_angle,
        "clarificationQuestions": _string_array(
            _required(payload, "clarificationQuestions", "review"), "review.clarificationQuestions"
        ),
        "confidence": _enum(_required(payload, "confidence", "review"), "review.confidence", CONFIDENCE_VALUES),
    }


def _build_extraction_messages(
    source_text: str,
    source_type: str | None,
    source_name: str | None,
    max_chars: int,
) -> list[dict[str, str]]:
    compact_source = _truncate_text(source_text, max_chars)
    schema = _json_dump(EXTRACTION_SCHEMA_EXAMPLE)

    return [
        {
            "role": "system",
            "content": (
                "You extract job opportunities from pasted job posts, emails, and job alert digests. "
                "Return JSON only. Do not include Markdown, prose, or code fences."
            ),
        },
        {
            "role": "user",
            "content": f"""
Return exactly one JSON object matching this schema:
{schema}

Allowed sourceKind values: single_job, multi_job_digest, recruiter_message, not_job_source.
Allowed remoteType values: remote, remote_first, hybrid, homeoffice_possible, onsite, unknown.
Allowed sourceQuality values: full_description, digest_summary, email_summary, unknown.
Allowed confidence values: high, medium, low.

Rules:
- Return all real job opportunities from the source.
- Use empty strings for unknown text fields.
- Use null for unknown salaryMinEur and salaryMaxEur.
- Do not invent salary, remote policy, company, location, or language requirements.
- Do not treat badges such as "Passt hervorragend" or "Beliebter Job" as company names.
- If text has only a teaser, set sourceQuality to digest_summary or email_summary and needsFullDescription to true.
- If text contains a full job description, set sourceQuality to full_description and needsFullDescription to false.
- Extraction is not review; do not score candidate fit.

Source metadata:
- sourceType: {source_type or "unknown"}
- sourceName: {source_name or "unknown"}

Source text:
{compact_source}
""".strip(),
        },
    ]


def _compact_review_description(description: dict[str, Any] | None, max_chars: int) -> dict[str, Any]:
    description = description or {}
    return {
        "summaryText": _truncate_text(str(description.get("summaryText") or ""), 1000),
        "fullText": _truncate_text(str(description.get("fullText") or ""), max_chars),
        "rawSourceText": _truncate_text(str(description.get("rawSourceText") or ""), 1500),
        "language": description.get("language"),
    }


def _build_review_messages(
    candidate_profile: dict[str, Any],
    job: dict[str, Any],
    description: dict[str, Any] | None,
    max_description_chars: int,
) -> list[dict[str, str]]:
    schema = _json_dump(REVIEW_SCHEMA_EXAMPLE)
    compact_payload = {
        "candidateProfile": candidate_profile,
        "job": job,
        "description": _compact_review_description(description, max_description_chars),
    }

    return [
        {
            "role": "system",
            "content": (
                "You review job fit against a candidate profile. Return JSON only. "
                "Do not include Markdown, prose, or code fences."
            ),
        },
        {
            "role": "user",
            "content": f"""
Return exactly one JSON object matching this schema:
{schema}

Allowed decision values: apply, maybe, skip, review_manually.
Allowed confidence values: high, medium, low.

Decision guidance:
- Use apply for strong technical fit and no major blockers.
- Use maybe for decent fit with clarification points.
- Use skip for clear blockers.
- Use review_manually when the source is incomplete or confidence is low.

Rules:
- Do not mark salary as a risk if the range includes the candidate minimum.
- Do not assume "Homeoffice möglich" means fully remote.
- Do not treat location as blocker if remote-first or fully remote is clear.
- Penalize explicit C1/native German if the candidate has a lower German level.
- Treat short digest summaries as incomplete.
- AI review is advisory; the user decides.

Input:
{_json_dump(compact_payload)}
""".strip(),
        },
    ]


class GroqProvider:
    name = "groq"

    def __init__(self, config: ProviderConfig) -> None:
        self.config = config
        self.model = config.groq_model

    def health(self) -> dict[str, object]:
        missing = []
        if not self.config.groq_api_key:
            missing.append("GROQ_API_KEY")
        if not self.config.has_groq_model:
            missing.append("GROQ_MODEL")

        return {
            "name": self.name,
            "configured_provider": self.config.provider,
            "ready": not missing,
            "model": self.model,
            "api_url": self.config.groq_api_url,
            "missing": missing,
        }

    def extract_jobs(
        self,
        source_text: str,
        source_type: str | None = None,
        source_name: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, object]:
        messages = _build_extraction_messages(
            source_text=source_text,
            source_type=source_type,
            source_name=source_name,
            max_chars=self.config.extraction_max_source_chars,
        )
        response = self._chat_json(messages=messages, max_tokens=2200, label="Groq extraction response")
        return _normalize_extraction(response)

    def review_job(
        self,
        candidate_profile: dict[str, Any],
        job: dict[str, Any],
        description: dict[str, Any] | None,
    ) -> dict[str, object]:
        messages = _build_review_messages(
            candidate_profile=candidate_profile,
            job=job,
            description=description,
            max_description_chars=self.config.review_max_description_chars,
        )
        response = self._chat_json(messages=messages, max_tokens=1400, label="Groq review response")
        return _normalize_review(response)

    def _ensure_ready(self) -> None:
        missing = self.health().get("missing", [])
        if missing:
            raise ProviderError(f"Groq provider is not ready; missing {', '.join(missing)}", 503)

    def _chat_json(self, messages: list[dict[str, str]], max_tokens: int, label: str) -> dict[str, Any]:
        self._ensure_ready()

        body = {
            "model": self.model,
            "messages": messages,
            "temperature": 0,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        }
        request = urllib.request.Request(
            self.config.groq_api_url,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.config.groq_api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                response_body = response.read().decode("utf-8")
        except urllib.error.HTTPError as error:
            response_body = error.read().decode("utf-8", errors="replace")
            detail = _extract_api_error(response_body)
            raise ProviderError(f"Groq API returned HTTP {error.code}: {detail}", 502) from error
        except (urllib.error.URLError, TimeoutError) as error:
            raise ProviderError(f"Groq API network error: {error}", 502) from error

        try:
            parsed = json.loads(response_body)
        except json.JSONDecodeError as error:
            raise ProviderError(f"Groq API response was not JSON: {error.msg}", 502) from error

        payload = _object(parsed, "Groq API response")
        choices = payload.get("choices")
        if not isinstance(choices, list) or not choices:
            raise ProviderError("Groq API response did not include choices", 502)

        first_choice = _object(choices[0], "Groq API response choices[0]")
        message = _object(first_choice.get("message"), "Groq API response choices[0].message")
        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            raise ProviderError("Groq API response message content is empty", 502)

        return _parse_json_object(content, label)
