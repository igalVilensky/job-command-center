import { applicationStatusOptions, userDecisionOptions } from "./types";

type JobFiltersProps = {
  userDecisionFilter: string;
  applicationStatusFilter: string;
  setUserDecisionFilter: (value: string) => void;
  setApplicationStatusFilter: (value: string) => void;
};

export function JobFilters({
  userDecisionFilter,
  applicationStatusFilter,
  setUserDecisionFilter,
  setApplicationStatusFilter
}: JobFiltersProps) {
  return (
    <div className="filter-row" aria-label="Job filters">
      <label>
        User decision
        <select value={userDecisionFilter} onChange={(event) => setUserDecisionFilter(event.target.value)}>
          <option value="">All decisions</option>
          {userDecisionOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label>
        Application status
        <select
          value={applicationStatusFilter}
          onChange={(event) => setApplicationStatusFilter(event.target.value)}
        >
          <option value="">All statuses</option>
          {applicationStatusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
