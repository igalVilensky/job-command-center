# Status Model

## Job status

Use lowercase enum values in the database:

```text
imported
needs_full_description
ready_for_analysis
analysis_pending
analyzed
shortlisted
applied
follow_up_needed
interviewing
rejected
offer
archived
error
```

## AI decision

AI decision is separate from job status:

```text
apply
maybe
skip
review_manually
unknown
```

## User decision

The user's decision is separate from AI decision and job status:

```text
undecided
interested
maybe
not_interested
applied
rejected
interviewing
offer
archived
```

## Application status

Application status tracks the user's real application progress:

```text
not_started
preparing
applied
follow_up_needed
interviewing
rejected
offer
accepted
declined
```

## Source quality

```text
full_description
digest_summary
email_summary
manual_note
unknown
```

## Imported email import status

```text
imported
```

## Imported email extraction status

```text
not_started
succeeded
failed
```

## Email account status

```text
connected
disconnected
```

## Remote type

```text
remote
remote_first
hybrid
homeoffice_possible
onsite
unknown
```

## Important rules

- AI decision does not automatically change application status.
- Failed AI analysis should not delete or hide the job.
- A job can be `analyzed` and still have AI decision `skip`.
- A job can be `needs_full_description` and still be manually archived.
- User decision and application status are manually controlled by the user.
- When application status becomes `applied`, `applied_at` should be set if missing.
- When application status becomes `rejected`, `rejected_at` should be set if missing.
