# System Architecture

## Overview

The AI-Powered Student Support System is a cloud-native, serverless application built on AWS. Students ask academic questions and receive answers grounded in the NaCCA Senior High School curriculum knowledge base, with an AI fallback when no curriculum section matches.

## Architecture Diagram

```
┌────────────────────────────────────────────┐
│              Students / Users               │
└────────────────────┬───────────────────────┘
                     │
                     ▼
       ┌───────────────────────────┐
       │   AWS Amplify (Qwik SPA)  │
       └───────────┬───────────────┘
                   │ HTTPS (REST)
                   ▼
        ┌───────────────────────────┐
        │   API Gateway (REST)      │
        │  Cognito authorizer       │
        │  validates ID token       │
        │  + CORS MOCK (OPTIONS)    │
        └───────────┬───────────────┘
                    │
                    ▼
        ┌───────────────────────────┐
        │ Lambda (Node.js 20)       │
        │ 23 handlers, role from    │
        │ users table by sub claim  │
        └───────────┬───────────────┘
                   │
      ┌────────────┼──────────────┬─────────────┐
      ▼            ▼              ▼             ▼
┌──────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐
│ DynamoDB │ │ S3        │ │ Amazon    │ │ Amazon     │
│ 6 tables │ │ knowledge │ │ OpenAI    │ │ Cognito    │
│          │ │ base      │ │ (AI       │ │ (users)    │
│          │ │           │ │ fallback) │ │            │
└──────────┘ └───────────┘ └───────────┘ └────────────┘
```

## Data Flow

1. User asks a question via the Qwik frontend → API Gateway → `eduportal-question-ask`.
2. API Gateway's Cognito authorizer validates the ID token; the handler resolves the user (`sub`) and role (`extractAndVerifyUser`, role from the users table) and validates the request.
3. `QuestionService.ask` checks the DynamoDB cache for an existing answer to a similar query.
4. On a cache miss, `KnowledgeService` searches the S3 knowledge base:
   - `detectSubject` narrows the search to the 4 supported subjects
   - `knowledge-retrieval.ts` tokenizes and scores candidate documents, skipping NaCCA boilerplate sections
   - the best excerpt is returned as a grounded answer, or the answer is marked as a weak match
5. If no document matches well, the service falls back to OpenAI for a generated answer.
6. The question and answer are persisted to `ai-student-questions`, an analytics event is recorded, and the answer is cached.

## Component Descriptions

### Frontend (Qwik City)
- Server-rendered, resumable SPA (Qwik City, Tailwind CSS v4, Lucide-Qwik icons)
- Question domain UI: Ask page, question detail, My Questions / FAQ history tabs
- Deployed to AWS Amplify

### API Gateway + Lambda
- Single REST API (`kzhykroge1`), stage `dev`
- **Cognito authorizer** (`COGNITO_USER_POOLS`, pool `eu-west-1_58jU3t3eE`) on all routes except `/auth/*` and `OPTIONS`; clients send the Cognito ID token as `Authorization: Bearer <idToken>`
- `OPTIONS` is a MOCK integration with CORS headers (origin `*`, methods `GET,POST,PUT,DELETE,OPTIONS`, headers `Content-Type,Authorization,X-Correlation-Id`)
- 23 handlers in `backend/src/functions/`, deployed as `eduportal-<name>` (`nodejs20.x`). `question/ask` is 120s / 1024MB; all others are 30s / 256MB
- All handlers share one IAM role (`eduportal-lambda-role`) with scoped inline policies
- Roles are read from the users table by the token's `sub` claim (`cognitoSub` is the table's primary key); a missing user falls back to `student`

### DynamoDB Tables (on-demand)

| Table | Key | Notes |
|-------|-----|-------|
| `ai-student-users` | `userId` (HASH) | GSIs `EmailIndex`, `RoleIndex` |
| `ai-student-questions` | `questionId` (HASH) | GSI `UserQuestionsIndex` (`userId` + `createdAt`), PITR enabled |
| `ai-student-cache` | `cacheId` (HASH) | GSIs `QueryTypeIndex`, `HashIndex` |
| `ai-student-analytics` | `eventId` (HASH) | GSIs `EventTypeIndex`, `UserEventsIndex` |
| `ai-student-feedback` | `feedbackId` (HASH) | GSIs `UserFeedbackIndex`, `MessageFeedbackIndex` |
| `ai-student-knowledge` | `documentId` (HASH) | GSIs `SubjectIndex`, `YearIndex` |

### S3 Knowledge Base
- Bucket: `eduportal-azubi-success-knowledge-base` (SSE-S3 AES-256, public access blocked)
- Scoped to 4 subjects: English Language, Core Mathematics, Integrated Science, Social Studies
- Key layout: `knowledge/{Subject}/{Strand}/{Subject}-SHS{n}-{...}.txt` — 108 parsed curriculum documents plus 4 source PDFs in `knowledge/sources/`
- Retrieval is subject-scoped with boilerplate-aware scoring; see `backend/src/services/knowledge-retrieval.ts`

### OpenAI Integration
- Abstract `AIProvider` interface decouples business logic from the AI service
- `OpenAIProvider` (`backend/src/infrastructure/ai/openai-provider.ts`) implements the interface; `ProviderFactory` selects the provider (`AI_PROVIDER=openai`, the default)
- Called over HTTPS with the `OPENAI_API_KEY` (no IAM needed); used as the fallback in `question/ask` when the knowledge base cannot answer confidently

### Observability
- Structured JSON logging from all Lambda handlers to CloudWatch Logs
- Standard Lambda error/`Throttles` CloudWatch metrics

## Security Architecture

- **Authentication**: Amazon Cognito user pool manages accounts; Cognito issues ID/access/refresh tokens at login
- **API Security**: API Gateway's Cognito authorizer validates the ID token; each Lambda resolves the role (`student`/`admin`/`support`) from the users table via the `sub` claim, and admin endpoints enforce the `admin` role (`requireAdmin`)
- **Data Encryption**: AES-256 at rest (DynamoDB SSE, S3 SSE)
- **Transport**: TLS via API Gateway / Amplify
- **Secrets**: No secrets in source; Cognito IDs and the knowledge-bucket name are Lambda environment variables backed by GitHub secrets
- **IAM**: single least-privilege Lambda role with scoped inline policies (DynamoDB, CloudWatch Logs, Cognito, S3, SQS, Bedrock)

## CI/CD

GitHub Actions deploys on push to `dev`/`main` (`backend/**`) or `workflow_dispatch`:
1. `lint-and-test` — `npm ci`, `tsc --noEmit`, `vitest run`
2. `deploy` — builds/package handlers, assumes the `eduportal-github-actions-oidc` role via OIDC (no long-lived keys), updates all 23 lambdas

Frontend deploys via AWS Amplify; see `docs/deployment.md`.

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend Framework | Qwik City | Resumability minimizes JS, SSR for SEO |
| Backend Runtime | Node.js 20 (Lambda) | Shared TypeScript with the frontend |
| Database | DynamoDB (on-demand) | Serverless, single-digit ms latency, scales automatically |
| AI Platform | OpenAI | Simple HTTPS API + API key; no IAM required |
| Auth | Amazon Cognito + API Gateway authorizer | Managed users; tokens validated at the gateway, roles from the users table |
| Deployment | GitHub Actions (OIDC) + AWS Amplify | Git-based CI/CD, no long-lived credentials |
