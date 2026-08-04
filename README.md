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
- **AI**: OpenAI fallback when the knowledge base cannot answer — already wired into the answer flow (see [AI Integration](#ai-integration)).
- **Monitoring**: CloudWatch access/execution logging, alarms → SNS, `eduportal-monitoring` dashboard.

Details: [docs/architecture.md](docs/architecture.md), [docs/aws-resources.md](docs/aws-resources.md).

## Lambda Backend

23 TypeScript handlers in `backend/src/functions/`, deployed to Lambda as `eduportal-<name>`.

Scripts (in `backend/`):

```bash
npm run build      # bundle handlers with esbuild into dist/
npm run package    # zip each handler into deployments/
npm test           # vitest unit tests (45, no AWS SDK mocks)
npm run typecheck  # tsc --noEmit
```

## Knowledge Base

NaCCA Senior High School curriculum PDFs are parsed into searchable text sections in S3 (`knowledge/{Subject}/{Strand}/{Subject}-SHS{n}-{...}.txt`; 108 documents + 4 source PDFs). Subjects: Core Mathematics, English Language, Integrated Science, Social Studies. Metadata lives in the `ai-student-knowledge` table.

## API

Core flow: `POST /ask` searches the knowledge base and falls back to AI; `GET /question`, `GET /FAQ`, and `DELETE /question/{id}` manage questions. Auth endpoints live under `/auth/*`, profile under `/user/profile`, feedback under `/feedback`, knowledge-base and admin under `/knowledge-base/*` and `/admin/*`.

Full endpoint reference (methods, request/response, lambdas): [docs/api.md](docs/api.md).

## AI Integration

When the knowledge base cannot answer confidently, the backend falls back to an AI provider chain to refine a clean answer from the closest curriculum excerpt. With `AI_PROVIDER=bedrock`, `ProviderFactory` builds a `FailoverProvider` that tries the models listed in the **`AI_MODEL_CHAIN`** env var:
1. Amazon Nova **Micro** (`eu.amazon.nova-micro-v1:0`) — cheap, answers most queries
2. Amazon Nova **Lite** (`eu.amazon.nova-lite-v1:0`)
3. Google **Gemini Flash** (`gemini`) — free Google API, `GEMINI_API_KEY`
4. Amazon Nova **Pro** (`eu.amazon.nova-pro-v1:0`) — most capable

Bedrock is invoked over the Converse API using the Lambda role's IAM credentials (no API key); Gemini is a free HTTPS API. Each model failure (error, throttle, unavailability, or empty answer) advances to the next. Each answered question records `modelUsed` and logs `ai_response`/`model_switched` analytics events, surfaced in the admin analytics report.

**Why `eu.` prefix?** On-demand Nova calls require the regional **inference-profile** ID, not the bare model ID (`amazon.nova-micro-v1:0` fails).

**Rate limiting:** each user is capped at **10 AI-generated answers per day** (configurable via the `AI_DAILY_LIMIT` env var, default `10`). Knowledge-base answers are unlimited and don't count toward the cap; the 11th AI answer returns HTTP `429` with a friendly frontend message.

### Enable/configure (console)
1. **Bedrock** → Model access → enable Nova Micro/Lite/Pro in eu-west-1.
2. **IAM** → role `eduportal-lambda-role` → attach the inline policy `EduportalBedrock`
   (`bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream`).
3. **Google AI Studio** → get a free Gemini API key (never commit it).
4. **GitHub** repo secrets (`gh secret set` on `wazaglo/eduportal-azubi-success`):
   ```bash
   gh secret set AI_MODEL_CHAIN   # e.g. eu.amazon.nova-micro-v1:0,eu.amazon.nova-lite-v1:0,gemini,eu.amazon.nova-pro-v1:0
   gh secret set GEMINI_API_KEY   # from Google AI Studio
   gh secret set AI_DAILY_LIMIT   # optional, defaults to 10
   ```
   The deploy workflow injects `AI_PROVIDER=bedrock` and these secrets into every Lambda. Reorder/remove a model by editing `AI_MODEL_CHAIN` — no code changes needed.

## CI/CD

GitHub Actions deploys the backend on push to `dev`/`main` (path `backend/**`) or `workflow_dispatch`: lint-and-test → deploy (assumes the OIDC role, updates the 23 `eduportal-*` lambdas). The frontend is hosted on Amplify.

See [docs/deployment.md](docs/deployment.md) and [docs/aws-resources.md](docs/aws-resources.md).
