import { type FitBreakdown, fitBreakdownRows } from "./types";
import { FitVerdictBadge } from "./StatusBadge";

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
              <FitVerdictBadge verdict={item.verdict} />
            </div>
            <div className="fit-breakdown-score">{item.score}</div>
            <p>{item.notes}</p>
          </div>
        );
      })}
    </div>
  );
}
