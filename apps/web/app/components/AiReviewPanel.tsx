import { type Job, type User } from "./types";
import { FitBreakdownPanel } from "./FitBreakdownPanel";

type AiReviewPanelProps = {
  job: Job;
  user: User | null;
  isBusy: boolean;
  onRunReview: (id: string) => void;
};

export function AiReviewPanel({ job, user, isBusy, onRunReview }: AiReviewPanelProps) {
  const review = job.latestAiReview;

  return (
    <section className="detail-section" aria-label="AI Review">
      <div className="section-heading">
        <h4>AI Review</h4>
        <button disabled={isBusy || !user} type="button" onClick={() => onRunReview(job.id)}>
          Run AI review
        </button>
      </div>

      {job.status === "ready_for_analysis" && review ? (
        <p className="muted">Job details changed. Rerun AI review for updated recommendation.</p>
      ) : null}

      {review ? (
        <div className="review-block">
          <dl className="detail-list">
            <div>
              <dt>Score</dt>
              <dd>{review.score}</dd>
            </div>
            <div>
              <dt>Decision</dt>
              <dd>{review.decision}</dd>
            </div>
          </dl>
          <p className="muted">
            Overall score and decision are the final result. Fit breakdown shows dimension-level
            reasoning.
          </p>
          <p>{review.reviewText}</p>

          <h5>Fit Breakdown</h5>
          <FitBreakdownPanel breakdown={review.fitBreakdownJson} />

          {job.sourceQuality !== "full_description" ? (
            <p className="muted">Review may be less reliable until job is enriched.</p>
          ) : null}

          <h5>Risk flags</h5>
          {review.riskFlags.length > 0 ? (
            <ul className="compact-list">
              {review.riskFlags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No risk flags.</p>
          )}

          <h5>CV angle</h5>
          <p>{review.cvAngle}</p>

          <h5>Clarification questions</h5>
          {review.clarificationQuestions.length > 0 ? (
            <ul className="compact-list">
              {review.clarificationQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No clarification questions.</p>
          )}
        </div>
      ) : (
        <div className="empty-action">
          <p className="muted">No AI review yet.</p>
          <button disabled={isBusy || !user} type="button" onClick={() => onRunReview(job.id)}>
            Run first review
          </button>
        </div>
      )}
    </section>
  );
}
