import json
import logging
from typing import Any

import httpx

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
SOURCE_QUALITIES = {"full_description", "partial_description", "digest_summary", "email_summary", "unknown"}
CONFIDENCE_VALUES = {"high", "medium", "low"}
REVIEW_DECISIONS = {"apply", "maybe", "skip", "review_manually"}
FIT_BREAKDOWN_VERDICTS = {"strong", "medium", "weak", "unknown"}
FIT_BREAKDOWN_KEYS = (
    "skills",
    "salary",
    "locationRemote",
    "language",
    "seniority",
    "sourceQuality",
)
logger = logging.getLogger(__name__)


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
    "score": 62,
    "decision": "maybe",
    "review": (
        "The role matches the candidate's web application experience and includes remote work. "
        "Main risks are a partial stack mismatch and salary or source details that need confirmation."
    ),
    "riskFlags": ["Potential stack mismatch", "Confirm salary expectations"],
    "cvAngle": "Lead with matching web application work, then address stack gaps directly.",
    "clarificationQuestions": ["Is the role product-focused or agency/client-project based?"],
    "fitBreakdown": {
        "skills": {
            "score": 72,
            "verdict": "medium",
            "notes": "Web application experience matches, but one stack detail needs confirmation.",
        },
        "salary": {
            "score": 60,
            "verdict": "unknown",
            "notes": "Salary range is missing and should be clarified against the candidate target.",
        },
        "locationRemote": {
            "score": 65,
            "verdict": "medium",
            "notes": "Remote work is mentioned, but the exact onsite expectation is unclear.",
        },
        "language": {
            "score": 60,
            "verdict": "medium",
            "notes": "German requirement may fit B2, but clarify whether C1 is expected.",
        },
        "seniority": {
            "score": 70,
            "verdict": "medium",
            "notes": "Seniority appears plausible from the available profile and job context.",
        },
        "sourceQuality": {
            "score": 90,
            "verdict": "strong",
            "notes": "Full job description is available for the review.",
        },
    },
    "confidence": "medium",
}

EXPECTED_REVIEW_KEYS = (
    "score",
    "decision",
    "review",
    "riskFlags",
    "cvAngle",
    "clarificationQuestions",
    "fitBreakdown",
    "confidence",
)
SCORE_BY_DECISION = {
    "apply": 80,
    "maybe": 60,
    "review_manually": 45,
    "skip": 25,
}
REVIEW_ALIASES = ("review", "reviewText", "explanation", "summary")
CV_ANGLE_ALIASES = ("cvAngle", "cv_angle", "cvAngleText")
RISK_FLAGS_ALIASES = ("riskFlags", "risks")
CLARIFICATION_QUESTION_ALIASES = ("clarificationQuestions", "questions", "clarifyingQuestions")


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


def _score_field(value: Any, label: str) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value < 0 or value > 100:
        raise ProviderError(f"{label} must be an integer between 0 and 100", 502)
    return value


def _non_empty_string(value: Any, label: str) -> str:
    text = _string(value, label)
    if not text:
        raise ProviderError(f"{label} must be a non-empty string", 502)
    return text


def _normalize_fit_breakdown_item(value: Any, label: str) -> dict[str, object]:
    item = _object(value, label)

    return {
        "score": _score_field(_required(item, "score", label), f"{label}.score"),
        "verdict": _enum(_required(item, "verdict", label), f"{label}.verdict", FIT_BREAKDOWN_VERDICTS),
        "notes": _non_empty_string(_required(item, "notes", label), f"{label}.notes"),
    }


def _normalize_fit_breakdown(value: Any) -> dict[str, object]:
    breakdown = _object(value, "review.fitBreakdown")

    return {
        key: _normalize_fit_breakdown_item(
            _required(breakdown, key, "review.fitBreakdown"),
            f"review.fitBreakdown.{key}",
        )
        for key in FIT_BREAKDOWN_KEYS
    }


def _fallback_fit_breakdown(score: int) -> dict[str, object]:
    if score >= 75:
        verdict = "strong"
    elif score >= 50:
        verdict = "medium"
    elif score >= 30:
        verdict = "weak"
    else:
        verdict = "unknown"

    return {
        key: {
            "score": score,
            "verdict": verdict,
            "notes": "Provider omitted this dimension; inspect the overall review before deciding.",
        }
        for key in FIT_BREAKDOWN_KEYS
    }


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

    if not isinstance(jobs_value, list):
        raise ProviderError("extraction.jobs must be an array", 502)

    warnings = _string_array(_required(payload, "warnings", "extraction"), "extraction.warnings")
    jobs = []
    for index, raw_job in enumerate(jobs_value):
        label = f"extraction.jobs[{index}]"
        job = _object(raw_job, label)
        company = _string(_required(job, "company", label), f"{label}.company")
        title = _string(_required(job, "title", label), f"{label}.title")

        if not company or not title:
            missing_fields = []
            if not company:
                missing_fields.append("company")
            if not title:
                missing_fields.append("title")
            warnings.append(f"Skipped {label} because missing {', '.join(missing_fields)}.")
            continue

        salary_min = _nullable_int(_required(job, "salaryMinEur", label), f"{label}.salaryMinEur")
        salary_max = _nullable_int(_required(job, "salaryMaxEur", label), f"{label}.salaryMaxEur")

        if salary_min is not None and salary_max is not None and salary_min > salary_max:
            raise ProviderError(f"{label} has salaryMinEur greater than salaryMaxEur", 502)

        jobs.append(
            {
                "company": company,
                "title": title,
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
        "warnings": warnings,
    }


def _decision_from_score(score: int) -> str:
    if score >= 75:
        return "apply"
    if score >= 50:
        return "maybe"
    if score >= 30:
        return "review_manually"
    return "skip"


def _confidence_from_score(score: int) -> str:
    if score >= 75:
        return "high"
    if score >= 45:
        return "medium"
    return "low"


def _payload_keys(payload: dict[str, Any]) -> list[str]:
    return sorted(str(key) for key in payload.keys())


def _string_from_aliases(payload: dict[str, Any], keys: tuple[str, ...]) -> str | None:
    for key in keys:
        if key in payload:
            value = _string(payload[key], f"review.{key}")
            if value:
                return value
    return None


def _string_array_from_aliases(payload: dict[str, Any], keys: tuple[str, ...]) -> list[str]:
    for key in keys:
        if key in payload:
            return _string_array(payload[key], f"review.{key}")
    return []


def _empty_string_fields(payload: dict[str, Any], keys: tuple[str, ...]) -> list[str]:
    return [key for key in keys if key in payload and isinstance(payload[key], str) and not payload[key].strip()]


def _fallback_review_text(decision: str, score: int) -> str:
    return (
        f"AI review completed with decision '{decision}' and score {score}, but the provider did not "
        "return detailed review text. Recheck salary, location, remote policy, tech stack, and source "
        "completeness before deciding."
    )


def _fallback_cv_angle(decision: str, score: int) -> str:
    return (
        f"For this {decision} decision at score {score}, emphasize concrete matching skills and address "
        "the largest gaps in stack, salary, location, remote setup, or source completeness."
    )


def _log_review_fallback(payload: dict[str, Any], fallback_fields: list[str], empty_fields: list[str]) -> None:
    missing_fields = [key for key in EXPECTED_REVIEW_KEYS if key not in payload]
    logger.warning(
        "Groq review normalization fallback used; fallback_fields=%s missing_fields=%s empty_fields=%s parsed_keys=%s",
        fallback_fields,
        missing_fields,
        empty_fields,
        _payload_keys(payload),
    )


def _normalize_review(payload: dict[str, Any]) -> dict[str, object]:
    score = _score(payload["score"]) if "score" in payload else None
    decision = _enum(payload["decision"], "review.decision", REVIEW_DECISIONS) if "decision" in payload else None

    if score is None and decision is None:
        raise ProviderError("review.score or review.decision is required", 502)

    if score is None:
        score = SCORE_BY_DECISION[decision]
    if decision is None:
        decision = _decision_from_score(score)

    confidence = (
        _enum(payload["confidence"], "review.confidence", CONFIDENCE_VALUES)
        if "confidence" in payload
        else _confidence_from_score(score)
    )

    review_text = _string_from_aliases(payload, REVIEW_ALIASES)
    cv_angle = _string_from_aliases(payload, CV_ANGLE_ALIASES)
    risk_flags = _string_array_from_aliases(payload, RISK_FLAGS_ALIASES)
    clarification_questions = _string_array_from_aliases(payload, CLARIFICATION_QUESTION_ALIASES)

    fallback_fields = []
    empty_fields = []
    if "fitBreakdown" in payload and payload["fitBreakdown"] is not None:
        fit_breakdown = _normalize_fit_breakdown(payload["fitBreakdown"])
    else:
        fit_breakdown = _fallback_fit_breakdown(score)
        fallback_fields.append("fitBreakdown")

    if review_text is None:
        review_text = _fallback_review_text(decision, score)
        fallback_fields.append("review")
        empty_fields.extend(_empty_string_fields(payload, REVIEW_ALIASES))
    if cv_angle is None:
        cv_angle = _fallback_cv_angle(decision, score)
        fallback_fields.append("cvAngle")
        empty_fields.extend(_empty_string_fields(payload, CV_ANGLE_ALIASES))

    if fallback_fields:
        _log_review_fallback(payload, fallback_fields, empty_fields)

    return {
        "score": score,
        "decision": decision,
        "review": review_text,
        "riskFlags": risk_flags,
        "cvAngle": cv_angle,
        "clarificationQuestions": clarification_questions,
        "fitBreakdown": fit_breakdown,
        "confidence": confidence,
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
Allowed sourceQuality values: full_description, partial_description, digest_summary, email_summary, unknown.
Allowed confidence values: high, medium, low.
The jobs array may be empty when no confident job is present.

Rules:
- Extract only jobs explicitly present in the provided source text.
- Never use prior context, memory, or previously seen jobs.
- Return all real job opportunities from the source.
- Return jobs: [] with a warning if no confident job can be found.
- Use empty strings for unknown text fields.
- Use null for unknown salaryMinEur and salaryMaxEur.
- Never invent company, title, location, salary, remote policy, or language requirements.
- If company or title cannot be confidently found for a candidate job, skip that job.
- Ignore generic email noise: tracking URLs, social links, unsubscribe links, headers, footers, legal boilerplate, repeated CTA buttons, and link-only lines.
- A job alert email may contain one highlighted job or multiple jobs; return only the real jobs clearly present.
- Do not create multiple jobs from repeated buttons, links, footer content, or repeated snippets.
- If a title is visibly truncated with "...", keep the visible title and add a warning.
- Treat alert/digest snippets as digest_summary or email_summary, not full_description, unless a real full description is present.
- Do not treat generic marketing phrases, sender names, CTA labels, badge labels, or section headers as company/title.
- Prefer explicit nearby job-card fields over footer or link text.
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
    example = json.dumps(REVIEW_SCHEMA_EXAMPLE, ensure_ascii=False, separators=(",", ":"), default=str)
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
Return exactly one JSON object with exactly these keys:
score, decision, review, riskFlags, cvAngle, clarificationQuestions, fitBreakdown, confidence.
Do not omit keys. Do not add keys.
Compact valid example:
{example}

Allowed decision values: apply, maybe, skip, review_manually.
Allowed confidence values: high, medium, low.
Allowed fitBreakdown verdict values: strong, medium, weak, unknown.

Decision guidance:
- Use apply for strong technical fit and no major blockers.
- Use maybe for decent fit with clarification points.
- Use skip for clear blockers.
- Use review_manually when the source is incomplete or confidence is low.

Rules:
- review must be a non-empty string with 2-4 sentences.
- cvAngle must be a non-empty string.
- score must be realistic; use 0 only for completely irrelevant jobs.
- fitBreakdown must include skills, salary, locationRemote, language, seniority, and sourceQuality.
- Each fitBreakdown category must include score, verdict, and notes.
- Each category score must be an integer from 0 to 100.
- Each category note must be short, concrete, and based on candidateProfile, job, or description evidence.
- Keep fitBreakdown consistent with the top-level score and decision; do not make a skip decision when most dimensions are strong unless a major blocker is named.
- Evaluate salary, location, remote policy, tech stack, and source completeness against candidateProfile preferences.
- Mention concrete matching and mismatch signals from the job.
- Put concrete salary, stack, agency/client-project, or source risks in riskFlags when present.
- Prefer candidateProfile.salaryMinEur and candidateProfile.salaryMaxEur as the desired salary range. Treat candidateProfile.minimumSalaryEur as legacy fallback only when no salary range exists.
- Use salary range overlap logic in both the top-level review and fitBreakdown.salary: if the job salary range overlaps the candidate range, do not flag "Salary below minimum" or similar salary-below-target risk.
- For example, candidate 48000-55000 EUR and job 43000-66000 EUR overlap and are salary-acceptable.
- In that example, fitBreakdown.salary verdict must be at least medium and can be strong.
- If the job maximum is below candidate salaryMinEur, salary is below target. If the job minimum is above candidate salaryMaxEur, salary exceeds target and is positive.
- If salary is estimated, broad, or missing, mention uncertainty or ask a clarification question, but do not create a hard salary risk unless clearly below target.
- Do not assume "Homeoffice möglich" means fully remote.
- Candidate can accept multiple remote modes from candidateProfile.acceptableRemoteTypes. If job.remoteType is in that list, do not add a remote risk.
- If job.remoteType is unknown, fitBreakdown.locationRemote should be unknown or medium with a clarification note, not hard weak.
- Do not treat location as blocker if remote-first or fully remote is clear or accepted by candidateProfile.acceptableRemoteTypes.
- If the role is mandatory onsite and the city is outside candidateProfile.preferredLocations, treat location as a risk.
- If the job location is a German city outside preferredLocations but candidateProfile includes Germany and accepts onsite/hybrid, ask whether commute/relocation works instead of auto-skipping unless the job explicitly forbids remote and the candidate disallows onsite.
- Penalize explicit C1/native German if the candidate has a lower German level. Treat "fluent German" with candidate German B2 as medium or clarification in fitBreakdown.language unless the job explicitly requires native/C1 German.
- Treat short digest summaries as incomplete.
- Treat the candidate as full-stack JS/TS when profile fields or CV context say so.
- React, Angular, Next.js, Vue, Nuxt, TypeScript, JavaScript, React Native, Node.js, Express, REST APIs, SaaS/product work, and web application delivery are related JS/TS skills.
- TDD, testing/QA, pair programming, code reviews, and CI/CD are positive matches when the candidate has Testing/QA, CI/CD, or collaborative product engineering experience.
- Do not skip React/frontend jobs merely because Node.js is not central.
- Do not skip Vue/Nuxt jobs merely because React is not central.
- Do not penalize Angular as an unrelated stack for a TypeScript/frontend candidate; treat it as adjacent JS/TS frontend ecosystem experience.
- Do not skip TypeScript/frontend roles merely because backend is not central.
- For frontend-heavy roles, score based on frontend stack match, TypeScript/JavaScript match, product/SaaS relevance, salary, location, remote, German level, and seniority.
- Backend-only non-JS stacks such as Java-only, PHP-only, or C#-only may be lower fit unless TypeScript/React/Angular/Vue/Node or relevant web/product skills are also present.
- Do not treat Java as a blocker when it appears as company background or backend context but the role itself is frontend TypeScript/React/Angular.
- If a full_description frontend role includes TypeScript plus React or Angular, fitBreakdown.skills should be strong for a frontend/full-stack JS/TS candidate and the overall score should usually be above 60 unless there are major blockers.
- If a role includes React, Angular, Vue, Nuxt, Next, TypeScript, JavaScript, Node, REST APIs, SaaS/product, or web apps, it should usually be at least maybe unless there are major blockers.
- Candidate German level must come from the profile; do not assume C1/native if the profile says B2.
- Candidate is full-stack and has strong frontend experience when the profile says so.
- Treat Homeoffice möglich as a clarification point, not an automatic skip.
- If source is a short email/digest summary, recommend getting the full description instead of a harsh skip.
- If job.sourceQuality is full_description, fitBreakdown.sourceQuality should usually be strong.
- Skip only for serious blockers: explicit C1/native German above profile level, mandatory on-site/relocation far from preferred locations when onsite is not acceptable, clearly unrelated stack, salary clearly below target range with no overlap, or seniority mismatch.
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
        response = self._chat_json(messages=messages, max_tokens=2200, label="Groq review response")
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
        request_body = json.dumps(body).encode("utf-8")
        headers = {
            "Authorization": f"Bearer {self.config.groq_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "job-command-center-ai-service/0.1",
        }

        try:
            response = httpx.post(
                self.config.groq_api_url,
                content=request_body,
                headers=headers,
                timeout=45,
                follow_redirects=True,
            )
        except httpx.RequestError as error:
            raise ProviderError(f"Groq API network error: {error}", 502) from error

        response_body = response.text
        if response.status_code >= 400:
            detail = _extract_api_error(response_body)
            raise ProviderError(f"Groq API returned HTTP {response.status_code}: {detail}", 502)

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
