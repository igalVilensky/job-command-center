import type { ImportedEmail } from "@prisma/client";

const MAX_CLEANED_SOURCE_CHARS = 15_000;
const PREVIEW_CHARS = 500;

const ENTITY_REPLACEMENTS: Record<string, string> = {
  amp: "&",
  nbsp: " ",
  quot: '"',
  apos: "'",
  euro: "EUR",
  lt: "<",
  gt: ">"
};

const SOCIAL_HOST_PARTS = [
  "facebook.",
  "instagram.",
  "linkedin.",
  "twitter.",
  "x.com",
  "youtube.",
  "tiktok."
];

const TRACKING_HOST_PARTS = [
  "click",
  "track",
  "tracking",
  "redirect",
  "newsletter",
  "mailing",
  "email",
  "link"
];

const TRACKING_QUERY_PARTS = [
  "utm_",
  "tracking",
  "track",
  "click",
  "redirect",
  "newsletter",
  "unsubscribe",
  "abmelden",
  "email-preferences",
  "preferences",
  "recipient",
  "token="
];

export type ImportedEmailSourceInput = Pick<
  ImportedEmail,
  | "subject"
  | "snippet"
  | "bodyText"
  | "provider"
  | "providerMessageId"
  | "providerThreadId"
  | "sourceLabel"
  | "fromName"
  | "fromEmail"
>;

export type PreparedImportedEmailSource = {
  sourceText: string;
  rawPreview: string;
  cleanedPreview: string;
  originalLength: number;
  cleanedLength: number;
};

const decodeHtmlEntities = (value: string) =>
  value.replace(/&#x([0-9a-f]+);|&#(\d+);|&([a-z][a-z0-9]+);/gi, (match, hex, decimal, named) => {
    const codePoint = hex ? Number.parseInt(hex, 16) : decimal ? Number.parseInt(decimal, 10) : null;

    if (codePoint !== null && Number.isFinite(codePoint)) {
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }

    return ENTITY_REPLACEMENTS[String(named).toLowerCase()] ?? match;
  });

const removeInvisibleCharacters = (value: string) =>
  value.replace(/[\u00ad\u034f\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, "");

const stripHtmlLeftovers = (value: string) =>
  value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(br|p|div|li|tr|h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

const isSocialUrl = (url: URL) => {
  const host = url.hostname.toLowerCase();
  return SOCIAL_HOST_PARTS.some((part) => host === part || host.includes(part));
};

const hasTrackingHost = (url: URL) => {
  const hostParts = url.hostname.toLowerCase().split(".").filter(Boolean);

  return hostParts.some((part) =>
    TRACKING_HOST_PARTS.some((trackingPart) => part === trackingPart || part.startsWith(trackingPart))
  );
};

const hasTrackingQuery = (url: URL) => {
  const searchable = `${url.pathname} ${url.search} ${url.hash}`.toLowerCase();
  return TRACKING_QUERY_PARTS.some((part) => searchable.includes(part));
};

const reduceUrlNoise = (value: string) =>
  value.replace(/https?:\/\/[^\s<>"']+/gi, (rawUrl) => {
    const trimmedUrl = rawUrl.replace(/[)\].,;!?]+$/g, "");

    try {
      const url = new URL(trimmedUrl);

      if (
        isSocialUrl(url) ||
        hasTrackingHost(url) ||
        hasTrackingQuery(url) ||
        trimmedUrl.length > 180
      ) {
        return " [link removed] ";
      }

      return trimmedUrl;
    } catch {
      return trimmedUrl.length > 180 ? " [link removed] " : trimmedUrl;
    }
  });

const reduceEncodedBlobs = (value: string) =>
  value
    .replace(/[A-Za-z0-9+/_=-]{140,}/g, " ")
    .replace(/(?:%[0-9a-f]{2}){20,}/gi, " ");

const normalizedLine = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+.#*]+/g, " ")
    .trim();

const isBoilerplateLine = (line: string) => {
  const normalized = normalizedLine(line);

  return (
    /^(unsubscribe|abmelden|e mail abbestellen|datenschutz|privacy|impressum|agb|kontakt|hilfe|newsletter)\b/.test(
      normalized
    ) ||
    /\b(unsubscribe|abmelden|e mail abbestellen|datenschutz|privacy|impressum|agb|newsletter)\b/.test(
      normalized
    ) ||
    /\b(du erhaltst diese e mail|sie erhalten diese e mail|diese e mail wurde|copyright|manage preferences|email preferences|view in browser|view this email|online version|browser anzeigen|im browser anzeigen|online ansehen)\b/.test(
      normalized
    ) ||
    /^(facebook|instagram|linkedin|twitter|youtube|tiktok|xing)$/.test(normalized)
  );
};

const isStandaloneCtaLine = (line: string) => {
  const normalized = normalizedLine(line);

  return /^(link removed|ich bin interessiert|jetzt bewerben|bewerben|zum job|job ansehen|alle jobs ansehen|mehr erfahren|apply|apply now|view job|see job|learn more|read more|more details)$/.test(
    normalized
  );
};

const cleanLines = (value: string) => {
  const lines = value
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0);
  const seen = new Map<string, number>();
  const cleaned: string[] = [];

  for (const line of lines) {
    if (isBoilerplateLine(line) || isStandaloneCtaLine(line)) {
      continue;
    }

    const normalized = normalizedLine(line);
    if (!normalized) {
      continue;
    }

    const count = seen.get(normalized) ?? 0;
    seen.set(normalized, count + 1);

    if (count > 0 && (line.length < 180 || count > 1)) {
      continue;
    }

    cleaned.push(line);
  }

  return cleaned.join("\n");
};

const cleanBodyText = (value: string) => {
  const decoded = decodeHtmlEntities(value.replace(/\r\n?/g, "\n"));

  return cleanLines(
    reduceEncodedBlobs(
      reduceUrlNoise(removeInvisibleCharacters(stripHtmlLeftovers(decoded))).replace(/[ \t]{2,}/g, " ")
    )
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const safePreview = (value: string) => {
  const compact = reduceUrlNoise(removeInvisibleCharacters(decodeHtmlEntities(value)))
    .replace(/https?:\/\/[^\s<>"']{140,}/gi, "[long url removed]")
    .replace(/\s+/g, " ")
    .trim();

  return compact.length > PREVIEW_CHARS ? compact.slice(0, PREVIEW_CHARS - 3).trimEnd() + "..." : compact;
};

const fromLine = (email: ImportedEmailSourceInput) => {
  const name = email.fromName?.trim();
  const address = email.fromEmail?.trim();

  if (name && address) {
    return `${name} <${address}>`;
  }

  return name || address || null;
};

const metadataLine = (label: string, value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? `${label}: ${trimmed}` : null;
};

const buildHeader = (email: ImportedEmailSourceInput) =>
  [
    "Imported email source",
    metadataLine("Subject", email.subject),
    metadataLine("From", fromLine(email)),
    metadataLine("Provider", email.provider),
    metadataLine("Provider message ID", email.providerMessageId),
    metadataLine("Provider thread ID", email.providerThreadId),
    metadataLine("Source label", email.sourceLabel),
    metadataLine("Snippet", email.snippet)
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

const limitSourceText = (header: string, cleanedBody: string) => {
  const sourceText = [header, cleanedBody ? `Cleaned body:\n${cleanedBody}` : null]
    .filter((part): part is string => Boolean(part))
    .join("\n\n")
    .trim();

  if (sourceText.length <= MAX_CLEANED_SOURCE_CHARS) {
    return sourceText;
  }

  const marker = "\n\n[cleaned source truncated]";
  const bodyPrefix = "Cleaned body:\n";
  const bodyBudget = Math.max(0, MAX_CLEANED_SOURCE_CHARS - header.length - marker.length - bodyPrefix.length - 2);
  const truncatedBody = cleanedBody.slice(0, bodyBudget).trimEnd();

  return [header, `${bodyPrefix}${truncatedBody}${marker}`].join("\n\n").trim();
};

export const prepareImportedEmailSource = (
  email: ImportedEmailSourceInput
): PreparedImportedEmailSource => {
  const rawBody = email.bodyText ?? "";
  const cleanedBody = cleanBodyText(rawBody);
  const sourceText = limitSourceText(buildHeader(email), cleanedBody);

  return {
    sourceText,
    rawPreview: safePreview(rawBody),
    cleanedPreview: safePreview(sourceText),
    originalLength: rawBody.length,
    cleanedLength: sourceText.length
  };
};
