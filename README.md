# eduportal-azubi-success

AI-powered student support platform. Students ask academic questions and get answers grounded in the NaCCA Senior High School curriculum knowledge base.

Serverless on AWS; the frontend is a Qwik City SPA.

## Branch Strategy

Work on **`dev`**; `main` is protected and requires pull request reviews.

## Quick Start

Docker:

```bash
docker compose -f docker/docker-compose.yml up frontend
```

Open **http://localhost:8081**.

No Docker:

```bash
cd frontend && npm install && npm run dev -- --port 8081
```

## Project Structure

```
frontend/    Qwik City SPA (UI, stores, API wiring)
backend/     AWS Lambda handlers (serverless)
infra/       DynamoDB table definition (dynamodb.yml)
docker/      Docker Compose for local dev
docs/        Architecture, API, and deployment docs
.github/     CI/CD workflows
amplify.yml  Amplify hosting config for the frontend
```

## Architecture

- **API**: API Gateway (REST). A **Cognito user pool authorizer** protects every route except `/auth/*` and `OPTIONS`. Clients send the Cognito **ID token** as `Authorization: Bearer <idToken>`.
- **Auth**: Cognito owns user accounts; each Lambda resolves the user's role (`student`, `admin`, `support`) from the `ai-student-users` table via the `sub` claim. Admin endpoints additionally require the `admin` role.
- **Compute**: 23 Lambda handlers (`nodejs20.x`); `question/ask` is 120s / 1024MB, the rest 30s / 256MB.
- **Data**: DynamoDB (on-demand tables), S3 knowledge base.
- **AI**: OpenAI fallback when the knowledge base cannot answer — provider written but not yet wired (see [AI Integration](#ai-integration)).
- **Monitoring**: CloudWatch access/execution logging, alarms → SNS, `eduportal-monitoring` dashboard.

Details: [docs/architecture.md](docs/architecture.md), [docs/aws-resources.md](docs/aws-resources.md).

## Lambda Backend

23 TypeScript handlers in `backend/src/functions/`, deployed to Lambda as `eduportal-<name>`.

Scripts (in `backend/`):

```bash
npm run build      # bundle handlers with esbuild into dist/
npm run package    # zip each handler into deployments/
npm test           # vitest unit tests (43, no AWS SDK mocks)
npm run typecheck  # tsc --noEmit
```

## Knowledge Base

NaCCA Senior High School curriculum PDFs are parsed into searchable text sections in S3 (`knowledge/{Subject}/{Strand}/{Subject}-SHS{n}-{...}.txt`; 108 documents + 4 source PDFs). Subjects: Core Mathematics, English Language, Integrated Science, Social Studies. Metadata lives in the `ai-student-knowledge` table.

## API

Core flow: `POST /ask` searches the knowledge base and falls back to AI; `GET /question`, `GET /FAQ`, and `DELETE /question/{id}` manage questions. Auth endpoints live under `/auth/*`, profile under `/user/profile`, feedback under `/feedback`, knowledge-base and admin under `/knowledge-base/*` and `/admin/*`.

Full endpoint reference (methods, request/response, lambdas): [docs/api.md](docs/api.md).

## AI Integration

When the knowledge base cannot answer confidently, the backend falls back to OpenAI to refine a clean answer from the closest curriculum excerpt. The provider is `backend/src/infrastructure/ai/openai-provider.ts` (default via `AI_PROVIDER=openai`) and is **already wired into the answer flow**. Until an API key is set, unanswered questions return a `"[Model integration pending] ..."` placeholder.

To enable it:

1. Create an OpenAI API key at platform.openai.com. Never commit it.
2. Store it as a GitHub secret:
   ```bash
   gh secret set OPENAI_API_KEY -R wazaglo/eduportal-azubi-success
   ```
   The deploy workflow injects `AI_PROVIDER=openai`, `OPENAI_MODEL=gpt-4o-mini`, and `OPENAI_API_KEY` into every Lambda. Without a secret, the variable is empty and the fallback is skipped.
3. `OPENAI_MODEL` defaults to `gpt-4o-mini`; `gpt-4o` is used automatically for questions that request reasoning.

No code or frontend changes are needed.

## CI/CD

GitHub Actions deploys the backend on push to `dev`/`main` (path `backend/**`) or `workflow_dispatch`: lint-and-test → deploy (assumes the OIDC role, updates the 23 `eduportal-*` lambdas). The frontend is hosted on Amplify.

See [docs/deployment.md](docs/deployment.md) and [docs/aws-resources.md](docs/aws-resources.md).
