# MVP Scope

The MVP should prove the core loop:

```text
candidate profile -> job import -> AI review -> human decision -> application pipeline
```

## MVP must include

- Candidate profile settings.
- Job inbox.
- Manual job creation.
- Paste import for job descriptions and job alert emails.
- AI extraction from messy text.
- AI review against candidate profile.
- Application pipeline.
- Automation run logs.
- AI provider abstraction with mock and Groq.

## MVP should not include

- Gmail background polling.
- Calendar integration.
- Browser extension.
- Job board scraping.
- Automatic applications.
- Hosted multi-user SaaS.
- Payments.
- Teams.
- Mobile app.
- Complex background queue infrastructure.

## MVP success criteria

The MVP is successful when a user can:

1. run the project locally
2. edit their candidate profile
3. paste a StepStone-style email or job description
4. extract one or more jobs
5. analyze a full-description job
6. see a fit review and risk flags
7. move the job into an application pipeline
8. track at least one application
9. run everything in mock mode without API keys
10. switch to Groq by adding their own key
