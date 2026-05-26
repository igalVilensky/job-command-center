import re
from typing import Any


FULL_DESCRIPTION_MIN_CHARS = 280


def _clean(value: str | None) -> str:
    return value.strip() if value else ""


def _first_match(patterns: list[str], text: str) -> str:
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            return _clean(match.group(1))
    return ""


def _detect_remote_type(text: str) -> str:
    lowered = text.lower()

    if "remote first" in lowered or "remote-first" in lowered:
        return "remote_first"
    if "hybrid" in lowered:
        return "hybrid"
    if "fully remote" in lowered or re.search(r"\bremote\b", lowered):
        return "remote"
    if "homeoffice" in lowered or "home office" in lowered:
        return "homeoffice_possible"
    if "onsite" in lowered or "on-site" in lowered or "vor ort" in lowered:
        return "onsite"

    return "unknown"


def _split_job_blocks(text: str) -> list[str]:
    lines = text.splitlines()
    blocks: list[list[str]] = []
    current: list[str] = []

    for line in lines:
        current_text = "\n".join(current)
        starts_explicit_job = bool(
            re.match(r"^\s*(job|position)\s*\d+\s*[:\-]", line, re.IGNORECASE)
            or re.match(r"^\s*#{1,4}\s*(job|position|role)\b", line, re.IGNORECASE)
        )
        starts_repeated_company = bool(
            re.match(r"^\s*(company|employer|firma|unternehmen)\s*[:\-]", line, re.IGNORECASE)
            and re.search(
                r"^\s*(company|employer|firma|unternehmen)\s*[:\-]",
                current_text,
                re.IGNORECASE | re.MULTILINE,
            )
        )
        is_separator = bool(re.match(r"^\s*(-{3,}|={3,})\s*$", line))

        if (starts_explicit_job or starts_repeated_company or is_separator) and current:
            block = "\n".join(current).strip()
            if block:
                blocks.append(current)
            current = []

        if not is_separator:
            current.append(line)

    if current:
        block = "\n".join(current).strip()
        if block:
            blocks.append(current)

    job_like_blocks = [
        "\n".join(block).strip()
        for block in blocks
        if re.search(
            r"\b(company|employer|firma|unternehmen|title|role|position|job)\b",
            "\n".join(block),
            re.IGNORECASE,
        )
    ]

    return job_like_blocks if len(job_like_blocks) > 1 else [text.strip()]


def _summary(text: str) -> str:
    collapsed = re.sub(r"\s+", " ", text).strip()
    if len(collapsed) <= 240:
        return collapsed
    return f"{collapsed[:237].rstrip()}..."


def _extract_salary(text: str) -> str:
    explicit = _first_match(
        [
            r"^\s*(?:salary|compensation|gehalt)\s*[:\-]\s*(.+)$",
            r"^\s*(?:pay|range)\s*[:\-]\s*(.+)$",
        ],
        text,
    )
    if explicit:
        return explicit

    match = re.search(
        r"((?:EUR|€)\s?\d[\d.,kK\s-]+|\d[\d.,kK\s-]+\s?(?:EUR|€))",
        text,
        re.IGNORECASE,
    )
    return _clean(match.group(1)) if match else ""


def _extract_url(text: str) -> str:
    match = re.search(r"https?://[^\s)>\]]+", text)
    return _clean(match.group(0).rstrip(".,;")) if match else ""


def _extract_job(block: str, index: int) -> dict[str, object]:
    title = _first_match(
        [
            r"^\s*(?:title|role|position)\s*[:\-]\s*(.+)$",
            r"^\s*job\s*\d*\s*[:\-]\s*(.+)$",
        ],
        block,
    )
    company = _first_match(
        [
            r"^\s*(?:company|employer|firma|unternehmen)\s*[:\-]\s*(.+)$",
            r"^\s*(?:at|bei)\s*[:\-]\s*(.+)$",
        ],
        block,
    )
    location = _first_match(
        [
            r"^\s*(?:location|ort|standort)\s*[:\-]\s*(.+)$",
        ],
        block,
    )
    source_quality = "full_description" if len(block) >= FULL_DESCRIPTION_MIN_CHARS else "digest_summary"

    return {
        "company": company or f"Mock Company {index}",
        "title": title or "Mock Job Opportunity",
        "location": location,
        "remoteType": _detect_remote_type(block),
        "salaryText": _extract_salary(block),
        "salaryMinEur": None,
        "salaryMaxEur": None,
        "url": _extract_url(block),
        "descriptionSummary": _summary(block),
        "fullDescription": block if source_quality == "full_description" else "",
        "sourceQuality": source_quality,
        "needsFullDescription": source_quality != "full_description",
        "confidence": "medium" if title or company else "low",
    }


def _words(value: str) -> set[str]:
    return {word for word in re.findall(r"[a-zA-Z][a-zA-Z0-9+#.-]{2,}", value.lower())}


def _flatten_profile_terms(profile: dict[str, Any], keys: list[str]) -> list[str]:
    terms: list[str] = []

    for key in keys:
        value = profile.get(key)
        if isinstance(value, list):
            terms.extend(str(item) for item in value if str(item).strip())
        elif isinstance(value, str) and value.strip():
            terms.append(value)

    return terms


def _salary_ceiling(salary_text: str) -> int | None:
    numbers = []
    for raw in re.findall(r"\d[\d.,]*\s?k?", salary_text.lower()):
        compact = raw.replace(".", "").replace(",", "").replace(" ", "")
        multiplier = 1000 if compact.endswith("k") else 1
        compact = compact.rstrip("k")
        if compact.isdigit():
            numbers.append(int(compact) * multiplier)

    return max(numbers) if numbers else None


def _minimum_salary(profile: dict[str, Any]) -> int | None:
    value = profile.get("minimumSalaryEur")
    return value if isinstance(value, int) and value > 0 else None


class MockProvider:
    name = "mock"
    model = "mock-ai-v1"

    def __init__(self, configured_provider: str = "mock") -> None:
        self.configured_provider = configured_provider

    def health(self) -> dict[str, object]:
        return {
            "name": self.name,
            "configured_provider": self.configured_provider,
            "ready": True,
        }

    def extract_jobs(self, source_text: str) -> dict[str, object]:
        blocks = _split_job_blocks(source_text)
        jobs = [_extract_job(block, index + 1) for index, block in enumerate(blocks)]
        source_kind = "multi_job_digest" if len(jobs) > 1 else "single_job"
        warnings = []

        if any(job["confidence"] == "low" for job in jobs):
            warnings.append("Mock extraction used placeholder fields for incomplete text.")

        return {
            "sourceKind": source_kind,
            "jobs": jobs,
            "warnings": warnings,
        }

    def review_job(
        self,
        candidate_profile: dict[str, Any],
        job: dict[str, Any],
        description: dict[str, Any] | None,
    ) -> dict[str, object]:
        description = description or {}
        job_text = " ".join(
            str(value)
            for value in [
                job.get("title"),
                job.get("company"),
                job.get("location"),
                job.get("remoteType"),
                job.get("salaryText"),
                job.get("sourceQuality"),
                description.get("summaryText"),
                description.get("fullText"),
                description.get("rawSourceText"),
            ]
            if value
        )
        profile_terms = _flatten_profile_terms(
            candidate_profile,
            ["targetRoles", "strongSkills", "secondarySkills", "profileNotes"],
        )
        avoid_terms = _flatten_profile_terms(candidate_profile, ["avoidSkills"])
        job_words = _words(job_text)
        profile_words = _words(" ".join(profile_terms))
        overlap_words = sorted(profile_words.intersection(job_words))
        avoid_hits = sorted(_words(" ".join(avoid_terms)).intersection(job_words))
        source_quality = str(job.get("sourceQuality") or "unknown")

        score = 55 + min(len(overlap_words) * 5, 30)
        if source_quality == "full_description":
            score += 10
        if source_quality in {"digest_summary", "email_summary", "unknown"}:
            score -= 10
        if avoid_hits:
            score -= 20

        risk_flags: list[str] = []
        clarification_questions: list[str] = []

        if source_quality != "full_description" or len(job_text) < 180:
            risk_flags.append("Source is incomplete; review needs a full job description.")
            clarification_questions.append("Can you paste the full job description before deciding?")

        minimum_salary = _minimum_salary(candidate_profile)
        salary_ceiling = _salary_ceiling(str(job.get("salaryText") or ""))
        if minimum_salary and salary_ceiling and salary_ceiling < minimum_salary:
            risk_flags.append("Listed salary appears below the candidate minimum.")
            score -= 25
        elif minimum_salary and not job.get("salaryText"):
            clarification_questions.append("What salary range is available for this role?")

        if avoid_hits:
            risk_flags.append(f"Role mentions avoided skill area: {', '.join(avoid_hits)}.")

        score = max(0, min(100, score))

        if source_quality != "full_description" or len(job_text) < 180:
            decision = "review_manually"
            confidence = "low"
        elif score >= 75 and not avoid_hits:
            decision = "apply"
            confidence = "high"
        elif score >= 50:
            decision = "maybe"
            confidence = "medium"
        else:
            decision = "skip"
            confidence = "medium"

        title = str(job.get("title") or "this role")
        company = str(job.get("company") or "the company")
        matched = ", ".join(overlap_words[:6]) if overlap_words else "general product engineering experience"

        return {
            "score": score,
            "decision": decision,
            "review": (
                f"Mock review for {title} at {company}: matched signals include {matched}. "
                f"The recommendation is {decision} based on simple keyword overlap and source completeness."
            ),
            "riskFlags": risk_flags,
            "cvAngle": f"Emphasize {matched} and recent outcomes that map directly to {title}.",
            "clarificationQuestions": clarification_questions,
            "confidence": confidence,
        }
