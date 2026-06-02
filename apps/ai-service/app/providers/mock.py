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


def _salary_range(salary_text: str) -> tuple[int, int] | None:
    numbers = []
    for raw in re.findall(r"\d[\d.,]*\s?k?", salary_text.lower()):
        compact = raw.replace(".", "").replace(",", "").replace(" ", "")
        multiplier = 1000 if compact.endswith("k") else 1
        compact = compact.rstrip("k")
        if compact.isdigit():
            numbers.append(int(compact) * multiplier)

    if not numbers:
        return None

    return min(numbers), max(numbers)


def _salary_preferences(profile: dict[str, Any]) -> tuple[int | None, int | None]:
    salary_min = profile.get("salaryMinEur")
    salary_max = profile.get("salaryMaxEur")
    legacy_minimum = profile.get("minimumSalaryEur")

    if not isinstance(salary_min, int) or salary_min <= 0:
        salary_min = legacy_minimum if isinstance(legacy_minimum, int) and legacy_minimum > 0 else None

    if not isinstance(salary_max, int) or salary_max <= 0:
        salary_max = None

    return salary_min, salary_max


def _fit_item(score: int, verdict: str, notes: str) -> dict[str, object]:
    return {
        "score": max(0, min(100, score)),
        "verdict": verdict,
        "notes": notes,
    }


def _format_salary_range(salary_min: int | None, salary_max: int | None) -> str:
    if salary_min and salary_max:
        return f"{salary_min}-{salary_max} EUR"
    if salary_min:
        return f"from {salary_min} EUR"
    if salary_max:
        return f"up to {salary_max} EUR"
    return "unknown"


def _profile_text(profile: dict[str, Any]) -> str:
    parts: list[str] = []
    for key in [
        "profession",
        "bio",
        "targetRoles",
        "strongSkills",
        "secondarySkills",
        "engineeringSkills",
        "aiSkills",
        "experienceSummary",
        "profileNotes",
    ]:
        value = profile.get(key)
        if isinstance(value, list):
            parts.extend(str(item) for item in value)
        elif value:
            parts.append(str(value))

    active_cv = profile.get("activeCv")
    if isinstance(active_cv, dict):
        parts.append(str(active_cv.get("sourceText") or ""))

    return " ".join(parts).lower()


def _contains_any(text: str, terms: set[str]) -> bool:
    return any(term in text for term in terms)


def _salary_fit(
    profile_salary_min: int | None,
    profile_salary_max: int | None,
    job_salary_min: int | None,
    job_salary_max: int | None,
) -> dict[str, object]:
    candidate_range = _format_salary_range(profile_salary_min, profile_salary_max)
    job_range = _format_salary_range(job_salary_min, job_salary_max)

    if not profile_salary_min and not profile_salary_max:
        return _fit_item(50, "unknown", "Candidate salary target is not set.")

    if not job_salary_min and not job_salary_max:
        return _fit_item(50, "unknown", f"Job salary is missing; clarify against target {candidate_range}.")

    if profile_salary_min and job_salary_max and job_salary_max < profile_salary_min:
        return _fit_item(
            25,
            "weak",
            f"Job salary {job_range} is below candidate target {candidate_range}.",
        )

    if profile_salary_max and job_salary_min and job_salary_min > profile_salary_max:
        return _fit_item(
            85,
            "strong",
            f"Job salary {job_range} starts above target {candidate_range}.",
        )

    if (
        profile_salary_min
        and profile_salary_max
        and job_salary_min
        and job_salary_max
        and job_salary_max >= profile_salary_min
        and job_salary_min <= profile_salary_max
    ):
        return _fit_item(
            85,
            "strong",
            f"Job salary {job_range} overlaps candidate target {candidate_range}.",
        )

    if profile_salary_min and job_salary_max and job_salary_max >= profile_salary_min:
        return _fit_item(70, "medium", f"Job salary {job_range} reaches target {candidate_range}.")

    return _fit_item(55, "unknown", f"Salary needs clarification: job {job_range}, target {candidate_range}.")


def _skills_fit(
    profile: dict[str, Any],
    job_text: str,
    overlap_words: list[str],
    avoid_hits: list[str],
) -> dict[str, object]:
    lowered_job = job_text.lower()
    lowered_profile = _profile_text(profile)
    js_ts_terms = {
        "typescript",
        "javascript",
        "react",
        "angular",
        "vue",
        "nuxt",
        "next",
        "node",
        "frontend",
        "front-end",
        "full-stack",
    }
    frontend_terms = {"react", "angular", "vue", "nuxt", "next", "frontend", "front-end"}

    if avoid_hits:
        return _fit_item(35, "weak", f"Role mentions avoided areas: {', '.join(avoid_hits[:4])}.")

    if (
        _contains_any(lowered_profile, js_ts_terms)
        and "typescript" in lowered_job
        and _contains_any(lowered_job, frontend_terms)
    ):
        return _fit_item(90, "strong", "TypeScript frontend stack aligns with the JS/TS profile.")

    if len(overlap_words) >= 4:
        return _fit_item(82, "strong", f"Several profile terms match: {', '.join(overlap_words[:5])}.")

    if len(overlap_words) >= 2:
        return _fit_item(66, "medium", f"Some profile terms match: {', '.join(overlap_words[:4])}.")

    return _fit_item(35, "weak", "Few concrete profile skills appear in the job text.")


def _location_remote_fit(profile: dict[str, Any], job: dict[str, Any]) -> dict[str, object]:
    remote_type = str(job.get("remoteType") or "unknown")
    location = str(job.get("location") or "").strip()
    accepted = {
        str(item)
        for item in profile.get("acceptableRemoteTypes", [])
        if str(item).strip()
    }
    preferred = [
        str(item).lower()
        for item in profile.get("preferredLocations", [])
        if str(item).strip()
    ]
    location_lower = location.lower()
    location_matches = bool(location_lower and any(item in location_lower for item in preferred))

    if remote_type == "unknown":
        return _fit_item(55, "unknown", "Remote policy is unknown; clarify before treating location as a blocker.")

    if remote_type in {"remote", "remote_first"} and remote_type in accepted:
        return _fit_item(88, "strong", f"{remote_type} is accepted by the candidate.")

    if remote_type in accepted and (location_matches or not location):
        return _fit_item(78, "strong", f"{remote_type} is accepted and location has no clear blocker.")

    if remote_type in accepted:
        return _fit_item(65, "medium", f"{remote_type} is accepted; confirm commute or location fit for {location or 'the role'}.")

    if remote_type == "onsite":
        return _fit_item(35, "weak", f"Onsite role in {location or 'an unknown location'} may conflict with preferences.")

    return _fit_item(50, "unknown", f"Remote type {remote_type} needs clarification against preferences.")


def _language_fit(profile: dict[str, Any], job_text: str) -> dict[str, object]:
    lowered = job_text.lower()
    german_level = str(profile.get("germanLevel") or "").strip().upper()

    hard_german = any(term in lowered for term in ["native german", "german native", "deutsch muttersprache"])
    c1_german = "german c1" in lowered or "deutsch c1" in lowered or " c1 deutsch" in lowered
    fluent_german = any(term in lowered for term in ["fluent german", "fließend deutsch", "fliessend deutsch"])
    german_required = hard_german or c1_german or fluent_german or "german" in lowered or "deutsch" in lowered

    if not german_required:
        return _fit_item(60, "unknown", "No explicit German requirement found.")

    if hard_german or c1_german:
        if german_level in {"C1", "C2", "NATIVE", "MUTTERSPRACHE"}:
            return _fit_item(90, "strong", f"German level {german_level} matches the explicit requirement.")
        return _fit_item(35, "weak", f"Role appears to require C1/native German; profile has {german_level or 'unknown'}.")

    if fluent_german and german_level == "B2":
        return _fit_item(62, "medium", "German B2 may satisfy fluent German, but clarify whether C1 is expected.")

    if german_level in {"B2", "C1", "C2", "NATIVE", "MUTTERSPRACHE"}:
        return _fit_item(75, "medium", f"German requirement appears compatible with profile level {german_level}.")

    return _fit_item(45, "unknown", "German requirement found, but candidate level is unclear.")


def _seniority_fit(profile: dict[str, Any], job_text: str) -> dict[str, object]:
    lowered_job = job_text.lower()
    lowered_profile = _profile_text(profile)
    senior_role = any(term in lowered_job for term in ["senior", "lead", "principal", "staff"])
    junior_role = any(term in lowered_job for term in ["junior", "entry level", "entry-level"])
    candidate_experienced = any(
        term in lowered_profile
        for term in ["full-stack", "full stack", "production", "experience", "senior", "lead"]
    )

    if senior_role and candidate_experienced:
        return _fit_item(68, "medium", "Senior wording appears plausible but should be checked against years and scope.")

    if senior_role:
        return _fit_item(45, "unknown", "Role seniority appears high; candidate seniority evidence is unclear.")

    if junior_role and candidate_experienced:
        return _fit_item(55, "medium", "Role may be below the candidate's current experience level.")

    return _fit_item(60, "unknown", "No explicit seniority blocker found in the available text.")


def _source_quality_fit(source_quality: str, job_text: str) -> dict[str, object]:
    if source_quality == "full_description":
        return _fit_item(92, "strong", "Full job description is available for this review.")

    if len(job_text) < 180:
        return _fit_item(35, "weak", "Source text is short, so the review is less reliable.")

    return _fit_item(50, "unknown", f"Source quality is {source_quality}; enrich with the full description if possible.")


def _build_fit_breakdown(
    candidate_profile: dict[str, Any],
    job: dict[str, Any],
    job_text: str,
    overlap_words: list[str],
    avoid_hits: list[str],
    profile_salary_min: int | None,
    profile_salary_max: int | None,
    job_salary_min: int | None,
    job_salary_max: int | None,
    source_quality: str,
) -> dict[str, object]:
    return {
        "skills": _skills_fit(candidate_profile, job_text, overlap_words, avoid_hits),
        "salary": _salary_fit(profile_salary_min, profile_salary_max, job_salary_min, job_salary_max),
        "locationRemote": _location_remote_fit(candidate_profile, job),
        "language": _language_fit(candidate_profile, job_text),
        "seniority": _seniority_fit(candidate_profile, job_text),
        "sourceQuality": _source_quality_fit(source_quality, job_text),
    }


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

    def extract_jobs(
        self,
        source_text: str,
        source_type: str | None = None,
        source_name: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, object]:
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

        salary_min, salary_max = _salary_preferences(candidate_profile)
        job_salary_min = job.get("salaryMinEur")
        job_salary_max = job.get("salaryMaxEur")
        if not isinstance(job_salary_min, int) or not isinstance(job_salary_max, int):
            text_range = _salary_range(str(job.get("salaryText") or ""))
            if text_range:
                job_salary_min, job_salary_max = text_range

        if salary_min and isinstance(job_salary_max, int) and job_salary_max < salary_min:
            risk_flags.append("Listed salary appears below the candidate target range.")
            score -= 25
        elif salary_min and not job.get("salaryText") and job_salary_max is None:
            clarification_questions.append("What salary range is available for this role?")
        elif salary_min and salary_max and isinstance(job_salary_min, int) and job_salary_min > salary_max:
            clarification_questions.append("The salary range appears above the target range; confirm expectations.")

        if str(job.get("remoteType") or "unknown") == "unknown":
            clarification_questions.append("What remote or hybrid policy is available for this role?")

        if (
            str(candidate_profile.get("germanLevel") or "").strip().upper() == "B2"
            and any(term in job_text.lower() for term in ["fluent german", "fließend deutsch", "fliessend deutsch"])
        ):
            clarification_questions.append("Does fluent German mean B2 is acceptable, or is C1/native expected?")

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
        normalized_job_salary_min = job_salary_min if isinstance(job_salary_min, int) else None
        normalized_job_salary_max = job_salary_max if isinstance(job_salary_max, int) else None
        fit_breakdown = _build_fit_breakdown(
            candidate_profile=candidate_profile,
            job=job,
            job_text=job_text,
            overlap_words=overlap_words,
            avoid_hits=avoid_hits,
            profile_salary_min=salary_min,
            profile_salary_max=salary_max,
            job_salary_min=normalized_job_salary_min,
            job_salary_max=normalized_job_salary_max,
            source_quality=source_quality,
        )

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
            "fitBreakdown": fit_breakdown,
            "confidence": confidence,
        }
