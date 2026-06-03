import { type FitBreakdown, fitBreakdownRows } from "./types";

type FitBreakdownPanelProps = {
  breakdown: FitBreakdown | null | undefined;
};

export function FitBreakdownPanel({ breakdown }: FitBreakdownPanelProps) {
  if (!breakdown) {
    return <p className="muted">No fit breakdown for this review.</p>;
  }

  return (
    <div className="fit-breakdown-grid">
      {fitBreakdownRows.map(({ key, label }) => {
        const item = breakdown[key];

        if (!item) {
          return null;
        }

        return (
          <div className="fit-breakdown-card" key={key}>
            <div className="fit-breakdown-heading">
              <strong>{label}</strong>
              <span className={`fit-verdict ${item.verdict}`}>{item.verdict}</span>
            </div>
            <div className="fit-breakdown-score">{item.score}</div>
            <p>{item.notes}</p>
          </div>
        );
      })}
    </div>
  );
}
