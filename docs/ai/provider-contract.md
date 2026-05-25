# AI Provider Contract

The app must support multiple AI providers behind one contract.

## Providers

Initial:

- mock
- groq

Later:

- gemini
- ollama
- openai-compatible

## Conceptual interface

```ts
interface AiProvider {
  extractJobs(input: ExtractJobsInput): Promise<ExtractJobsResult>;
  reviewJob(input: ReviewJobInput): Promise<JobReviewResult>;
}
```

## Provider requirements

Providers must:

- keep API keys server-side
- return validated data
- fail with structured errors
- avoid throwing raw provider objects to the frontend
- support model config through environment variables
- be replaceable without changing web UI

## Mock provider

The mock provider should not call external services and should return deterministic results.

## Groq provider

The Groq provider should use an OpenAI-compatible chat completion endpoint and compact prompts to avoid TPM errors.

## Ollama provider

Future provider. Calls local Ollama HTTP API.
