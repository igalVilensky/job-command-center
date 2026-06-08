export type ImportedEmailClassification =
  | "likely_candidate"
  | "maybe_relevant"
  | "likely_irrelevant"
  | "needs_check";

export type ImportedEmailClassificationResult = {
  classification: ImportedEmailClassification;
  reason: string;
};

export type ImportedEmailPrefilterDecision =
  | "ignore_low_signal"
  | "possible_job_source"
  | "likely_job_source"
  | "recruiter_message"
  | "needs_manual_check"
  | "duplicate_source";

export type ImportedEmailPrefilterResult = {
  jobLikelihoodScore: number;
  prefilterDecision: ImportedEmailPrefilterDecision;
  stackHits: string[];
  blockerHits: string[];
  positiveSignals: string[];
  negativeSignals: string[];
  reason: string;
  aiExtractionEligible: boolean;
};

type KeywordSpec = {
  label: string;
  pattern: RegExp;
};

type ClassifiableEmail = {
  subject: string;
  fromEmail?: string | null;
  fromName?: string | null;
  snippet?: string | null;
  bodyText?: string | null;
  inboxStatus?: string | null;
  extractionStatus?: string | null;
};

type PrefilterOptions = {
  duplicateSource?: boolean;
};

const stackKeywords: KeywordSpec[] = [
  { label: "frontend", pattern: /\bfront[-\s]?end\b/i },
  { label: "react", pattern: /\breact(?:\.js|js)?\b/i },
  { label: "vue", pattern: /\bvue(?:\.js|js)?\b/i },
  { label: "javascript", pattern: /\bjava\s*script\b|\bjavascript\b/i },
  { label: "typescript", pattern: /\btype\s*script\b|\btypescript\b/i },
  { label: "web developer", pattern: /\bweb\s+developer\b/i },
  { label: "webentwickler", pattern: /\bwebentwickler(?:in)?\b/i },
  { label: "fullstack", pattern: /\bfull[-\s]?stack\b/i },
  { label: "ui developer", pattern: /\bui\s+developer\b/i },
  { label: "nuxt", pattern: /\bnuxt(?:\.js|js)?\b/i },
  { label: "next", pattern: /\bnext(?:\.js|js)?\b/i },
  { label: "node", pattern: /\bnode(?:\.js|js)?\b/i },
  { label: "express", pattern: /\bexpress(?:\.js|js)?\b/i },
  { label: "angular", pattern: /\bangular\b/i },
  { label: "softwareentwickler", pattern: /\bsoftwareentwickler(?:in)?\b/i },
  { label: "software developer", pattern: /\bsoftware\s+developer\b/i },
];

const jobSourceKeywords: KeywordSpec[] = [
  { label: "job alert", pattern: /\bjob\s+alert\b|\bjobangebote?\b|\bstellenangebote?\b/i },
  { label: "job opening", pattern: /\bjob\s+opening\b|\bopen\s+role\b|\bvacanc(?:y|ies)\b/i },
  { label: "position", pattern: /\bposition\b|\brole\b|\bstelle\b|\bjob\b/i },
  { label: "application", pattern: /\bapply\b|\bapplication\b|\bbewerb(?:en|ung)\b/i },
  { label: "company hiring", pattern: /\bhiring\b|\bwe\s+are\s+looking\b|\bwir\s+suchen\b/i }
];

const recruiterKeywords: KeywordSpec[] = [
  { label: "recruiter", pattern: /\brecruiter\b|\brecruiting\b|\btalent\s+acquisition\b/i },
  { label: "headhunter", pattern: /\bheadhunter\b|\bpersonalberater\b/i },
  { label: "opportunity outreach", pattern: /\bopportunit(?:y|ies)\b|\bpassend(?:e|en)?\s+stelle\b/i },
  { label: "interview outreach", pattern: /\binterview\b|\bgespr[aä]ch\b/i }
];

const blockerKeywords: KeywordSpec[] = [
  { label: "java-only", pattern: /\bjava\s+(?:developer|entwickler|engineer)\b|\bjava\b/i },
  { label: "spring-heavy", pattern: /\bspring(?:\s+boot)?\b/i },
  { label: "php-heavy", pattern: /\bphp\b/i },
  { label: "symfony-heavy", pattern: /\bsymfony\b/i },
  { label: "laravel-heavy", pattern: /\blaravel\b/i },
  { label: ".net-heavy", pattern: /\b\.net\b|\bdotnet\b|\basp\.net\b/i },
  { label: "c#-heavy", pattern: /\bc#\b|\bc\s*sharp\b/i },
  { label: "sales", pattern: /\bsales\b|\bvertrieb\b/i },
  { label: "customer support", pattern: /\bcustomer\s+support\b|\bkundenservice\b|\bkundensupport\b/i },
  { label: "support-only", pattern: /\bsupport\s+only\b|\bonly\s+support\b|\b1st\s+level\s+support\b/i },
  { label: "qa-only", pattern: /\bqa\s+only\b|\bonly\s+qa\b|\bquality\s+assurance\b/i },
  { label: "tester-only", pattern: /\btester\b|\btesting\b|\btestautomatisierung\b/i },
  { label: "data scientist", pattern: /\bdata\s+scientist\b/i },
  { label: "devops-only", pattern: /\bdevops\s+only\b|\bonly\s+devops\b/i },
  { label: "wordpress-only", pattern: /\bwordpress\s+only\b|\bonly\s+wordpress\b/i },
  {
    label: "native German required",
    pattern:
      /\b(?:native|mother\s+tongue)\s+german\b|\bdeutsch\s+(?:als\s+)?muttersprache\b|\bmuttersprachler(?:in)?\b/i
  }
];

const keywordMatches = (text: string, specs: KeywordSpec[]) =>
  Array.from(new Set(specs.filter((spec) => spec.pattern.test(text)).map((spec) => spec.label)));

const listPreview = (items: string[]) => {
  if (items.length === 0) {
    return "none";
  }

  return items.slice(0, 4).join(", ");
};

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

const sourceText = (email: ClassifiableEmail) =>
  [email.subject, email.fromName, email.fromEmail, email.snippet, email.bodyText?.slice(0, 2200)]
    .filter(Boolean)
    .join("\n");

const normalizeBlockers = (blockerHits: string[], stackHits: string[]) => {
  if (stackHits.some((hit) => hit === "javascript" || hit === "typescript")) {
    return blockerHits.filter((hit) => hit !== "java-only");
  }

  return blockerHits;
};

const prefilterReason = (result: Omit<ImportedEmailPrefilterResult, "reason">) => {
  const prefix = `Prefilter: ${result.prefilterDecision}. Score ${result.jobLikelihoodScore}. Stack: ${listPreview(
    result.stackHits
  )}. Blockers: ${listPreview(result.blockerHits)}.`;

  if (result.prefilterDecision === "duplicate_source") {
    return `${prefix} This Gmail message was already imported, so automated extraction is skipped for budget safety.`;
  }

  if (result.prefilterDecision === "ignore_low_signal") {
    return `${prefix} No useful frontend/full-stack signal was found, or the message looks like a clear mismatch.`;
  }

  if (result.prefilterDecision === "needs_manual_check") {
    return `${prefix} Kept for human review because the source has mixed, incomplete, or ambiguous signals.`;
  }

  if (result.prefilterDecision === "recruiter_message") {
    return `${prefix} Recruiter/outreach language makes this worth checking before spending more AI budget.`;
  }

  if (result.blockerHits.length > 0) {
    return `${prefix} Relevant stack signals are present, but blockers need a human decision.`;
  }

  return `${prefix} Enough job-source signal exists to justify AI extraction within the run budget.`;
};

export const prefilterImportedEmail = (
  email: ClassifiableEmail,
  options: PrefilterOptions = {}
): ImportedEmailPrefilterResult => {
  const text = sourceText(email);
  const compactText = text.replace(/\s+/g, " ").trim();
  const stackHits = keywordMatches(text, stackKeywords);
  const rawBlockerHits = keywordMatches(text, blockerKeywords);
  const blockerHits = normalizeBlockers(rawBlockerHits, stackHits);
  const jobSignals = keywordMatches(text, jobSourceKeywords);
  const recruiterSignals = keywordMatches(text, recruiterKeywords);
  const positiveSignals = [...stackHits, ...jobSignals, ...recruiterSignals];
  const negativeSignals = [
    ...blockerHits,
    ...(compactText.length < 80 ? ["source text too short"] : [])
  ];

  if (options.duplicateSource) {
    const result = {
      jobLikelihoodScore: 0,
      prefilterDecision: "duplicate_source" as const,
      stackHits,
      blockerHits,
      positiveSignals,
      negativeSignals: [...negativeSignals, "duplicate source"],
      aiExtractionEligible: false
    };

    return {
      ...result,
      reason: prefilterReason(result)
    };
  }

  const score = clampScore(
    stackHits.length * 18 +
      Math.min(jobSignals.length * 14, 28) +
      Math.min(recruiterSignals.length * 16, 28) +
      (compactText.length >= 180 ? 10 : 0) -
      Math.min(blockerHits.length * 12, 36) -
      (compactText.length < 80 ? 25 : 0)
  );
  const hasJobSignal = jobSignals.length > 0 || recruiterSignals.length > 0;
  const hasStackSignal = stackHits.length > 0;
  const clearMismatch = blockerHits.length > 0 && !hasStackSignal;
  let prefilterDecision: ImportedEmailPrefilterDecision;

  if (!hasJobSignal && !hasStackSignal) {
    prefilterDecision = "ignore_low_signal";
  } else if (clearMismatch) {
    prefilterDecision = "ignore_low_signal";
  } else if (recruiterSignals.length > 0 && (hasStackSignal || hasJobSignal)) {
    prefilterDecision = "recruiter_message";
  } else if (hasStackSignal && blockerHits.length > 0) {
    prefilterDecision = stackHits.length >= blockerHits.length ? "possible_job_source" : "needs_manual_check";
  } else if (stackHits.length >= 2 && hasJobSignal && score >= 60) {
    prefilterDecision = "likely_job_source";
  } else if (hasStackSignal || (hasJobSignal && score >= 45)) {
    prefilterDecision = "possible_job_source";
  } else {
    prefilterDecision = "needs_manual_check";
  }

  const aiExtractionEligible = [
    "likely_job_source",
    "possible_job_source",
    "recruiter_message",
    "needs_manual_check"
  ].includes(prefilterDecision);
  const result = {
    jobLikelihoodScore: score,
    prefilterDecision,
    stackHits,
    blockerHits,
    positiveSignals,
    negativeSignals,
    aiExtractionEligible
  };

  return {
    ...result,
    reason: prefilterReason(result)
  };
};

export const classifyImportedEmail = (
  email: ClassifiableEmail
): ImportedEmailClassificationResult => {
  const prefilter = prefilterImportedEmail(email);

  let classification: ImportedEmailClassification;

  if (prefilter.prefilterDecision === "likely_job_source" || prefilter.prefilterDecision === "recruiter_message") {
    classification = "likely_candidate";
  } else if (prefilter.prefilterDecision === "possible_job_source") {
    classification = "maybe_relevant";
  } else if (prefilter.prefilterDecision === "needs_manual_check") {
    classification = "needs_check";
  } else {
    classification = "likely_irrelevant";
  }

  return {
    classification,
    reason: prefilter.reason
  };
};
