const DEFAULT_TARGET_ROLES = [
  "Full-Stack Software Developer",
  "Frontend Developer",
  "React Developer",
  "Vue/Nuxt Developer",
  "TypeScript Developer"
];

const SKILL_TERMS = [
  "TypeScript",
  "JavaScript",
  "Vue",
  "Nuxt",
  "React",
  "Next",
  "React Native",
  "Node",
  "Express",
  "Python",
  "FastAPI",
  "SQL",
  "NoSQL",
  "REST APIs",
  "Git",
  "Docker",
  "CI/CD",
  "Testing",
  "QA",
  "Firebase",
  "AWS basics",
  "LLM API Integration",
  "Prompt Engineering",
  "AI Agents",
  "n8n",
  "Make",
  "AI Product Features"
];

const ENGINEERING_TERMS = [
  "REST APIs",
  "Git",
  "Docker",
  "CI/CD",
  "Testing",
  "QA",
  "Firebase",
  "AWS basics"
];

const AI_TERMS = [
  "LLM API Integration",
  "Prompt Engineering",
  "AI Agents",
  "n8n",
  "Make",
  "AI Product Features"
];

const LOCATION_TERMS = ["Leipzig", "Germany"];

const HEADING_ALIASES: Record<string, string[]> = {
  profession: ["profession", "role", "title"],
  bio: ["bio", "summary", "profile"],
  techStack: ["tech stack", "skills", "technical skills", "technologies"],
  engineering: ["engineering"],
  ai: ["ai", "artificial intelligence"],
  languages: ["languages", "language"],
  experience: ["experience highlights", "experience", "work experience"]
};

export type ParsedCandidateProfile = {
  profession: string | null;
  bio: string | null;
  targetRoles: string[];
  strongSkills: string[];
  secondarySkills: string[];
  engineeringSkills: string[];
  aiSkills: string[];
  preferredLocations: string[];
  germanLevel: string | null;
  englishLevel: string | null;
  languagesJson: Record<string, string>;
  experienceSummary: string | null;
  profileNotes: string | null;
};

const cleanTypstMarkup = (value: string) =>
  value
    .replace(/#[a-zA-Z]+\([^)]*\)/g, " ")
    .replace(/[=*`_[\]{}]/g, " ")
    .replace(/\r\n?/g, "\n");

const compact = (value: string) => value.replace(/[ \t]+/g, " ").trim();

const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const canonicalHeading = (value: string) => {
  const key = normalizeKey(value.replace(/:$/, ""));

  for (const [canonical, aliases] of Object.entries(HEADING_ALIASES)) {
    if (aliases.includes(key)) {
      return canonical;
    }
  }

  return null;
};

const sectionMap = (sourceText: string) => {
  const sections = new Map<string, string[]>();
  let current: string | null = null;

  for (const rawLine of cleanTypstMarkup(sourceText).split("\n")) {
    const line = compact(rawLine.replace(/^[-*]\s*/, ""));
    if (!line) {
      continue;
    }

    const colonMatch = line.match(/^([A-Za-z][A-Za-z /&-]{1,40}):\s*(.*)$/);
    const heading = canonicalHeading(colonMatch ? colonMatch[1] : line);

    if (heading) {
      current = heading;
      if (!sections.has(current)) {
        sections.set(current, []);
      }

      if (colonMatch?.[2]) {
        sections.get(current)?.push(compact(colonMatch[2]));
      }
      continue;
    }

    if (current) {
      sections.get(current)?.push(line);
    }
  }

  return sections;
};

const splitListText = (values: string[]) =>
  values
    .flatMap((value) => value.split(/[,;|]|\s+\/\s+/))
    .map((item) => compact(item.replace(/^[-*]\s*/, "")))
    .filter(Boolean);

const unique = (items: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const key = normalizeKey(item);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
};

const termsInText = (sourceText: string, terms: string[]) => {
  const normalized = ` ${sourceText.toLowerCase().replace(/[^a-z0-9+#/]+/g, " ")} `;

  return terms.filter((term) => {
    const termKey = term.toLowerCase().replace(/[^a-z0-9+#/]+/g, " ").trim();
    return normalized.includes(` ${termKey} `);
  });
};

const languageLevels = (sourceText: string, explicitLines: string[]) => {
  const text = [sourceText, ...explicitLines].join("\n");
  const languages: Record<string, string> = {};

  for (const language of ["Hebrew", "Russian", "English", "German"]) {
    const match = text.match(new RegExp(`\\b${language}\\b\\s*[:\\-]?\\s*(Native|C2|C1|B2|B1|A2|A1)`, "i"));
    if (match) {
      languages[language] = match[1].toUpperCase() === "NATIVE" ? "Native" : match[1].toUpperCase();
    }
  }

  return languages;
};

const firstSectionLine = (sections: Map<string, string[]>, key: string) =>
  compact(sections.get(key)?.join(" ") ?? "") || null;

const locationsInText = (sourceText: string) =>
  LOCATION_TERMS.filter((location) => new RegExp(`\\b${location}\\b`, "i").test(sourceText));

export const parseCandidateCvSource = (sourceText: string): ParsedCandidateProfile => {
  const sections = sectionMap(sourceText);
  const source = cleanTypstMarkup(sourceText);
  const profession =
    firstSectionLine(sections, "profession") ||
    (/\bfull[- ]stack\b/i.test(source) ? "Full-Stack Software Developer" : null);
  const bio = firstSectionLine(sections, "bio");
  const techStack = unique([
    ...splitListText(sections.get("techStack") ?? []),
    ...termsInText(source, SKILL_TERMS)
  ]);
  const engineeringSkills = unique([
    ...splitListText(sections.get("engineering") ?? []),
    ...termsInText(source, ENGINEERING_TERMS)
  ]);
  const aiSkills = unique([...splitListText(sections.get("ai") ?? []), ...termsInText(source, AI_TERMS)]);
  const languagesJson = languageLevels(source, sections.get("languages") ?? []);
  const experienceSummary = firstSectionLine(sections, "experience");
  const targetRoles = unique([profession, ...DEFAULT_TARGET_ROLES].filter((item): item is string => Boolean(item)));
  const strongSkills = unique([
    ...techStack.filter((skill) =>
      /typescript|javascript|vue|nuxt|react|next|node|express|rest api|saas/i.test(skill)
    ),
    ...engineeringSkills.filter((skill) => /rest api|docker|ci\/cd|testing|firebase|aws/i.test(skill)),
    ...aiSkills
  ]);
  const secondarySkills = unique(
    techStack.filter((skill) => !strongSkills.some((strongSkill) => normalizeKey(strongSkill) === normalizeKey(skill)))
  );

  return {
    profession,
    bio,
    targetRoles,
    strongSkills,
    secondarySkills,
    engineeringSkills,
    aiSkills,
    preferredLocations: unique(locationsInText(source)),
    germanLevel: languagesJson.German ?? null,
    englishLevel: languagesJson.English ?? null,
    languagesJson,
    experienceSummary,
    profileNotes: "Generated from CV source. Review and edit before relying on recommendations."
  };
};
