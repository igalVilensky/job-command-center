import {
  type ApplicationPrepStrengthCard,
  type Job,
  type JobDetailTab,
  type User,
  applicationPrepKeywordLabels,
  extractApplicationPrepKeywords,
  getApplicationPrep,
  jobNeedsReview,
  previewText,
  sourceNeedsFullDescription
} from "./types";
import { StatusBadge } from "./StatusBadge";

type ApplicationPrepPanelProps = {
  job: Job;
  user: User | null;
  isBusy: boolean;
  onRunReview: (id: string) => void;
  onTabChange: (tab: JobDetailTab) => void;
};

const checklistStatusLabel = (status: "done" | "todo" | "warning") => {
  if (status === "done") {
    return "Done";
  }

  if (status === "warning") {
    return "Check";
  }

  return "To do";
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlightPattern = new RegExp(
  `\\b(${applicationPrepKeywordLabels.map(escapeRegExp).join("|")})\\b`,
  "gi"
);

function HighlightTerms({ text }: { text: string }) {
  const parts = text.split(highlightPattern);

  return (
    <>
      {parts.map((part, index) => {
        const isKeyword = applicationPrepKeywordLabels.some(
          (keyword) => keyword.toLowerCase() === part.toLowerCase()
        );

        return isKeyword ? (
          <mark className="prep-keyword" key={`${part}-${index}`}>
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        );
      })}
    </>
  );
}

function SkillChips({ chips, emptyText }: { chips: string[]; emptyText: string }) {
  if (chips.length === 0) {
    return emptyText ? <p className="prep-empty-state">{emptyText}</p> : null;
  }

  return (
    <div className="skill-chip-row" aria-label="Application prep skill highlights">
      {chips.map((chip) => (
        <span className="skill-chip" key={chip}>
          {chip}
        </span>
      ))}
    </div>
  );
}

function StrengthCard({ card }: { card: ApplicationPrepStrengthCard }) {
  return (
    <article className={`prep-strength-card strength-${card.tone}`}>
      <div className="prep-strength-heading">
        <span>{card.label}</span>
      </div>
      <strong>
        <HighlightTerms text={card.summary} />
      </strong>
      {card.detail ? (
        <p>
          <HighlightTerms text={card.detail} />
        </p>
      ) : null}
      {card.chips.length > 0 ? <SkillChips chips={card.chips} emptyText="" /> : null}
    </article>
  );
}

const splitPrepItem = (value: string) => {
  const [possibleLabel, ...rest] = value.split(":");
  const detail = rest.join(":").trim();

  if (detail && possibleLabel.length <= 26) {
    return {
      label: possibleLabel,
      detail
    };
  }

  return {
    label: "Check",
    detail: value
  };
};

export function ApplicationPrepPanel({
  job,
  user,
  isBusy,
  onRunReview,
  onTabChange
}: ApplicationPrepPanelProps) {
  const prep = getApplicationPrep(job);
  const needsDescription = sourceNeedsFullDescription(job);
  const needsReview = jobNeedsReview(job);
  const reviewButtonLabel = job.latestAiReview ? "Rerun AI review" : "Run AI review";
  const primaryAction = needsDescription
    ? {
        label: "Go to Enrichment",
        disabled: false,
        run: () => onTabChange("enrichment")
      }
    : needsReview
      ? {
          label: reviewButtonLabel,
          disabled: isBusy || !user,
          run: () => onRunReview(job.id)
        }
      : {
          label: "Go to Pipeline",
          disabled: false,
          run: () => onTabChange("pipeline")
        };
  const positioningChips = extractApplicationPrepKeywords([prep.positioning]);

  return (
    <section className="detail-section application-prep" aria-label="Application Prep">
      <div className={`prep-hero hero-${prep.readiness.tone}`}>
        <div className="prep-readiness">
          <span className="prep-kicker">Readiness</span>
          <StatusBadge
            className="prep-readiness-badge"
            label={prep.readiness.label}
            tone={prep.readiness.tone}
          />
          <p>
            <HighlightTerms text={prep.readiness.reason} />
          </p>
        </div>
        <button
          className="button-primary prep-primary-action"
          disabled={primaryAction.disabled}
          type="button"
          onClick={primaryAction.run}
        >
          {primaryAction.label}
        </button>
      </div>

      <div className="prep-grid">
        <section className="prep-card prep-card-wide positioning-card">
          <div className="prep-card-heading">
            <span>Positioning</span>
            <h4>CV angle</h4>
          </div>
          <p className="prep-positioning-text">
            <HighlightTerms text={prep.positioning} />
          </p>
          {positioningChips.length > 0 ? (
            <SkillChips chips={positioningChips} emptyText="" />
          ) : null}
        </section>

        <section className="prep-card prep-card-wide skill-emphasis-card">
          <div className="prep-card-heading">
            <span>Emphasis</span>
            <h4>Skills and terms to highlight</h4>
          </div>
          <SkillChips
            chips={prep.skillChips}
            emptyText="Run or rerun AI review to surface skill highlights."
          />
        </section>

        <section className="prep-strengths prep-card-wide">
          <div className="prep-card-heading">
            <span>Strengths</span>
            <h4>Fit signals</h4>
          </div>
          {prep.strengthCards.length > 0 ? (
            <div className="prep-strength-grid">
              {prep.strengthCards.map((card) => (
                <StrengthCard card={card} key={card.key} />
              ))}
            </div>
          ) : (
            <p className="prep-empty-state">No strong fit cards available yet.</p>
          )}
        </section>

        <section className="prep-card concerns-card">
          <div className="prep-card-heading">
            <span>Watchouts</span>
            <h4>Concerns</h4>
          </div>
          {prep.concernsToAddress.length > 0 ? (
            <div className="prep-concern-list">
              {prep.concernsToAddress.map((concern) => {
                const item = splitPrepItem(concern);
                const chips = extractApplicationPrepKeywords([concern]);

                return (
                  <article className="prep-concern-item" key={concern}>
                    <strong>{item.label}</strong>
                    <p>
                      <HighlightTerms text={previewText(item.detail, 150)} />
                    </p>
                    {chips.length > 0 ? <SkillChips chips={chips} emptyText="" /> : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="prep-empty-state success-state">No major concerns identified yet.</p>
          )}
        </section>

        <section className="prep-card questions-card">
          <div className="prep-card-heading">
            <span>Clarify</span>
            <h4>Questions</h4>
          </div>
          {prep.questionsToClarify.length > 0 ? (
            <ol className="prep-question-list">
              {prep.questionsToClarify.map((question) => (
                <li key={question}>
                  <HighlightTerms text={previewText(question, 160)} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="prep-empty-state">No clarification questions identified yet.</p>
          )}
        </section>

        <section className="prep-card prep-card-wide checklist-card">
          <div className="prep-card-heading">
            <span>Next steps</span>
            <h4>Checklist</h4>
          </div>
          <ul className="action-plan-checklist prep-checklist" aria-label="Application prep checklist">
            {prep.checklist.map((item) => (
              <li className={`checklist-${item.status}`} key={`${item.status}-${item.label}`}>
                <span>{item.label}</span>
                <em>{checklistStatusLabel(item.status)}</em>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
