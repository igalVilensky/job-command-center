export type ImportedEmailClassification =
  | "likely_candidate"
  | "maybe_relevant"
  | "likely_irrelevant"
  | "needs_check";

export type ImportedEmailClassificationResult = {
  classification: ImportedEmailClassification;
  reason: string;
};

type KeywordSpec = {
  label: string;
  pattern: RegExp;
};

type ClassifiableEmail = {
  subject: string;
  snippet?: string | null;
  bodyText?: string | null;
};

const strongPositiveKeywords: KeywordSpec[] = [
  { label: "frontend", pattern: /\bfront[-\s]?end\b/i },
  { label: "react", pattern: /\breact(?:\.js|js)?\b/i },
  { label: "vue", pattern: /\bvue(?:\.js|js)?\b/i },
  { label: "javascript", pattern: /\bjava\s*script\b|\bjavascript\b/i },
  { label: "typescript", pattern: /\btype\s*script\b|\btypescript\b/i },
  { label: "web developer", pattern: /\bweb\s+developer\b/i },
  { label: "fullstack", pattern: /\bfull[-\s]?stack\b/i },
  { label: "ui developer", pattern: /\bui\s+developer\b/i },
  { label: "nuxt", pattern: /\bnuxt(?:\.js|js)?\b/i },
  { label: "next", pattern: /\bnext(?:\.js|js)?\b/i }
];

const maybeKeywords: KeywordSpec[] = [
  { label: "node", pattern: /\bnode(?:\.js|js)?\b/i },
  { label: "express", pattern: /\bexpress(?:\.js|js)?\b/i },
  { label: "python", pattern: /\bpython\b/i },
  { label: "fastapi", pattern: /\bfastapi\b/i },
  { label: "angular", pattern: /\bangular\b/i },
  { label: "api", pattern: /\bapis?\b/i },
  { label: "software developer", pattern: /\bsoftware\s+developer\b/i },
  { label: "webentwickler", pattern: /\bwebentwickler(?:in)?\b/i },
  { label: "softwareentwickler", pattern: /\bsoftwareentwickler(?:in)?\b/i }
];

const negativeKeywords: KeywordSpec[] = [
  { label: "java developer", pattern: /\bjava\s+developer\b/i },
  { label: "spring", pattern: /\bspring(?:\s+boot)?\b/i },
  { label: "php", pattern: /\bphp\b/i },
  { label: "symfony", pattern: /\bsymfony\b/i },
  { label: "laravel", pattern: /\blaravel\b/i },
  { label: ".net", pattern: /\b\.net\b|\bdotnet\b/i },
  { label: "c#", pattern: /\bc#\b|\bc\s*sharp\b/i },
  { label: "sales", pattern: /\bsales\b/i },
  { label: "support", pattern: /\bsupport\b/i },
  { label: "qa", pattern: /\bqa\b|\bquality\s+assurance\b/i },
  { label: "tester", pattern: /\btester\b|\btesting\b/i },
  { label: "data scientist", pattern: /\bdata\s+scientist\b/i },
  { label: "devops only", pattern: /\bdevops\s+only\b|\bonly\s+devops\b/i },
  { label: "wordpress only", pattern: /\bwordpress\s+only\b|\bonly\s+wordpress\b/i }
];

const keywordMatches = (text: string, specs: KeywordSpec[]) =>
  specs.filter((spec) => spec.pattern.test(text)).map((spec) => spec.label);

const listPreview = (items: string[]) => {
  if (items.length === 0) {
    return "none";
  }

  return items.slice(0, 4).join(", ");
};

const classificationReason = (
  classification: ImportedEmailClassification,
  strongMatches: string[],
  maybeMatches: string[],
  negativeMatches: string[]
) => {
  const signal = `Classification: ${classification}. Strong: ${listPreview(
    strongMatches
  )}. Maybe: ${listPreview(maybeMatches)}. Mismatch: ${listPreview(negativeMatches)}.`;

  if (classification === "likely_irrelevant") {
    return `${signal} No frontend or adjacent web signal was found.`;
  }

  if (negativeMatches.length > 0) {
    return `${signal} Kept for review because relevant web/frontend signals also appear.`;
  }

  if (classification === "needs_check") {
    return `${signal} No decisive keyword signal was found.`;
  }

  return signal;
};

export const classifyImportedEmail = (
  email: ClassifiableEmail
): ImportedEmailClassificationResult => {
  const previewText = [email.subject, email.snippet, email.bodyText?.slice(0, 1200)]
    .filter(Boolean)
    .join("\n");
  const strongMatches = keywordMatches(previewText, strongPositiveKeywords);
  const maybeMatches = keywordMatches(previewText, maybeKeywords);
  const negativeMatches = keywordMatches(previewText, negativeKeywords);

  let classification: ImportedEmailClassification;

  if (strongMatches.length > 0 && negativeMatches.length === 0) {
    classification = "likely_candidate";
  } else if (strongMatches.length > 0 || (maybeMatches.length > 0 && negativeMatches.length === 0)) {
    classification = "maybe_relevant";
  } else if (maybeMatches.length > 0 && negativeMatches.length > 0) {
    classification = "needs_check";
  } else if (negativeMatches.length > 0) {
    classification = "likely_irrelevant";
  } else {
    classification = "needs_check";
  }

  return {
    classification,
    reason: classificationReason(classification, strongMatches, maybeMatches, negativeMatches)
  };
};
