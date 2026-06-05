import {
  type Job,
  type QueueFilter,
  jobIsStrongMatch,
  jobNeedsClarification,
  jobNeedsPipelineFollowUp,
  jobNeedsReview,
  queueFilterLabels,
  sourceNeedsFullDescription
} from "./types";

type DashboardPanelProps = {
  jobs: Job[];
  onOpenJobsFilter: (filter: QueueFilter) => void;
};

type DashboardCard = {
  filter: QueueFilter;
  label: string;
  value: number;
  helper: string;
};

export function DashboardPanel({ jobs, onOpenJobsFilter }: DashboardPanelProps) {
  const needsDescription = jobs.filter(sourceNeedsFullDescription).length;
  const readyForReview = jobs.filter(jobNeedsReview).length;
  const strongMatches = jobs.filter(jobIsStrongMatch).length;
  const maybeClarify = jobs.filter(jobNeedsClarification).length;
  const followUps = jobs.filter(jobNeedsPipelineFollowUp).length;

  const cards: DashboardCard[] = [
    {
      filter: "needs_description",
      label: queueFilterLabels.needs_description,
      value: needsDescription,
      helper: "Paste full descriptions before trusting review output."
    },
    {
      filter: "ready_for_review",
      label: queueFilterLabels.ready_for_review,
      value: readyForReview,
      helper: "Jobs with enough detail for AI scoring."
    },
    {
      filter: "apply",
      label: queueFilterLabels.apply,
      value: strongMatches,
      helper: "Reviewed jobs worth a decision."
    },
    {
      filter: "maybe",
      label: queueFilterLabels.maybe,
      value: maybeClarify,
      helper: "Jobs with caveats or open questions."
    },
    {
      filter: "follow_up",
      label: queueFilterLabels.follow_up,
      value: followUps,
      helper: "Pipeline items with next actions or dates."
    },
    {
      filter: "all",
      label: "Total active jobs",
      value: jobs.length,
      helper: "Everything currently unarchived."
    }
  ];

  const nextActions = [
    { label: "Enrich jobs missing full descriptions", count: needsDescription, filter: "needs_description" },
    { label: "Review ready jobs", count: readyForReview, filter: "ready_for_review" },
    { label: "Decide on high-scoring jobs", count: strongMatches, filter: "apply" },
    { label: "Follow up pipeline items", count: followUps, filter: "follow_up" }
  ] satisfies { label: string; count: number; filter: QueueFilter }[];

  return (
    <section className="dashboard-page" aria-label="Dashboard">
      <div className="page-title-row">
        <div>
          <h2>Dashboard</h2>
          <p className="muted">Active work, grouped by what needs attention next.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {cards.map((card) => (
          <button
            className="dashboard-card"
            key={card.filter}
            type="button"
            onClick={() => onOpenJobsFilter(card.filter)}
          >
            <span className="dashboard-card-label">{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.helper}</small>
          </button>
        ))}
      </div>

      <section className="next-actions-panel" aria-label="Next best actions">
        <div className="section-heading">
          <h3>Next best actions</h3>
        </div>

        <ul className="action-list">
          {nextActions.map((action) => (
            <li key={action.filter}>
              <button type="button" onClick={() => onOpenJobsFilter(action.filter)}>
                <span>{action.label}</span>
                <em>{action.count}</em>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
