import { applicationStatusOptions, userDecisionOptions } from "./types";
import { formatStateLabel } from "./StatusBadge";

type JobFiltersProps = {
  searchQuery: string;
  userDecisionFilter: string;
  applicationStatusFilter: string;
  setSearchQuery: (value: string) => void;
  setUserDecisionFilter: (value: string) => void;
  setApplicationStatusFilter: (value: string) => void;
};

export function JobFilters({
  searchQuery,
  userDecisionFilter,
  applicationStatusFilter,
  setSearchQuery,
  setUserDecisionFilter,
  setApplicationStatusFilter
}: JobFiltersProps) {
  return (
    <div className="filter-row" aria-label="Job filters">
      <label className="wide">
        Search
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Title, company, location, status, salary"
          type="search"
        />
      </label>

      <label>
        User decision
        <select value={userDecisionFilter} onChange={(event) => setUserDecisionFilter(event.target.value)}>
          <option value="">All decisions</option>
          {userDecisionOptions.map((option) => (
            <option key={option} value={option}>
              {formatStateLabel(option)}
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
              {formatStateLabel(option)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
