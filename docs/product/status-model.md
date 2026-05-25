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

## Source quality

```text
full_description
digest_summary
email_summary
manual_note
unknown
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
