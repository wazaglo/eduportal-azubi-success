# eduportal-azubi-success

AI-powered student support platform. Students ask academic questions and receive answers sourced from the NaCCA curriculum knowledge base.

Built as a serverless application on AWS. The frontend is a Qwik City SPA.

## Branch Strategy

All development work should be done on the **`dev`** branch. The `main` branch is protected and requires pull request reviews.

```bash
git checkout dev
git pull origin dev
```

## Quick Start (Docker)

```bash
docker compose -f docker/docker-compose.yml up frontend
```

Open **http://localhost:8081**

## Dev (no Docker)

```bash
cd frontend
npm install
npm run dev -- --port 8081
```

## Project Structure

```
├── frontend/          # Qwik City SPA (UI, stores, API wiring)
├── backend/           # AWS Lambda handlers (serverless)
├── docker/            # Docker Compose for local dev
├── docs/              # Architecture and deployment docs
└── .github/           # CI/CD workflows
```

## Serverless Architecture

All backend components are serverless on AWS:

- **Compute**: AWS Lambda
- **API**: Amazon API Gateway
- **Database**: Amazon DynamoDB
- **Storage**: Amazon S3 (knowledge base)
- **Auth**: Amazon Cognito
- **AI**: Amazon Bedrock

## Lambda Backend

24 TypeScript handlers in `backend/src/functions/`, deployed to Lambda as `eduportal-<name>`. Auth is JWT via `Authorization: Bearer <token>`; admin endpoints also require the `admin` role.

## Knowledge Base

Authentic NaCCA Senior High School curriculum PDFs (all 33 subjects) are parsed into searchable text sections and stored in S3, referenced by the chat assistant:

- **Bucket**: `eduportal-azubi-success-knowledge-base` (SSE-S3 AES-256, public access blocked)
- **Layout**: `knowledge/{Subject}/{Strand}/{file}` (year is stored per-document)
- **Source PDFs**: `knowledge/sources/{Subject}/{Subject}-Curriculum.pdf` (downloadable via the API)
- **Metadata**: DynamoDB table `ai-student-knowledge` (documentId HASH; GSIs `SubjectIndex`, `YearIndex`)
- **Seed data**: 777 documents across all 33 subjects, covering SHS 1-3 (English Language, Core Mathematics, Integrated Science, Social Studies, ICT, Computing, Biology, Chemistry, Physics, History, Geography, Economics, French, Spanish, Arabic, and more)
- Chat answers reference these documents; see [docs/architecture.md](docs/architecture.md) and [docs/api.md](docs/api.md)

## Auth Flow (Cognito)

Amazon Cognito sits in front of the API as the **API Gateway authorizer**:

```
Frontend ──► Cognito User Pool (login, tokens) ──► API Gateway (Cognito authorizer) ──► Lambda
```

- **User Pool**: sign-up/sign-in, JWT/refresh tokens (`COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`)
- **Authorizer**: `ai-student-support-cognito-authorizer` attached to all routes except `/auth/*`
- **Lambda verification**: handlers self-verify the JWT against `JWT_SECRET` and check roles (`admin`) for admin endpoints
- Full setup steps: `docs/aws-resources.md` §2

## API Reference

### Auth (public)

| Method | Path | Lambda | Description |
|--------|------|--------|-------------|
| POST | `/auth/register` | `eduportal-auth-register` | Create account (email, password, fullName) |
| POST | `/auth/login` | `eduportal-auth-login` | Sign in, returns JWT + refresh token |
| POST | `/auth/refresh-token` | `eduportal-auth-refresh-token` | Get new JWT from refresh token |
| POST | `/auth/verify-email` | `eduportal-auth-verify-email` | Verify email with code |
| POST | `/auth/reset-password` | `eduportal-auth-reset-password` | Request reset (email) or confirm (email, code, newPassword) |

### User (JWT)

| Method | Path | Lambda | Description |
|--------|------|--------|-------------|
| GET | `/user/profile` | `eduportal-user-get-profile` | Get current user profile |
| PUT | `/user/profile` | `eduportal-user-update-profile` | Update profile |

### Chat (JWT)

| Method | Path | Lambda | Description |
|--------|------|--------|-------------|
| POST | `/chat/send` | `eduportal-chat-send-message` | Send message (content; optional conversationId, queryType, requireAsync) |
| GET | `/chat/conversations` | `eduportal-chat-get-conversations` | List conversations (limit, nextToken) |
| GET | `/chat/conversations/{id}` | `eduportal-chat-get-conversation` | Get conversation + messages |
| DELETE | `/chat/conversations/{id}` | `eduportal-chat-delete-conversation` | Delete conversation |

### Feedback (JWT)

| Method | Path | Lambda | Description |
|--------|------|--------|-------------|
| POST | `/feedback` | `eduportal-feedback-submit` | Submit feedback (messageId, rating 1-5; optional comment, category) |
| GET | `/feedback` | `eduportal-feedback-get` | Get your feedback (limit, nextToken) |

### Knowledge Base (JWT)

| Method | Path | Lambda | Description |
|--------|------|--------|-------------|
| GET | `/knowledge-base/documents` | `eduportal-knowledge-base-list-documents` | List documents (year, subject, strand, substrand, limit) |
| GET | `/knowledge-base/download-url` | `eduportal-knowledge-base-get-download-url` | Get a presigned URL to download a subject's curriculum PDF |
| POST | `/knowledge-base/presign-upload` | `eduportal-knowledge-base-presign-upload` | Admin: get presigned S3 PUT URL (fileName, contentType, year, subject, strand, substrand) |
| POST | `/knowledge-base/complete-upload` | `eduportal-knowledge-base-complete-upload` | Admin: register document metadata after S3 upload |
| DELETE | `/knowledge-base/documents` | `eduportal-knowledge-base-delete-document` | Admin: delete document (documentId, s3Key) |

Upload is restricted to the `admin` role; listing is available to any authenticated user.

### Admin (JWT + admin role)

| Method | Path | Lambda | Description |
|--------|------|--------|-------------|
| GET | `/admin/users` | `eduportal-admin-list-users` | List users (limit, nextToken, role) |
| PUT | `/admin/users/{id}` | `eduportal-admin-manage-user` | Update user (role, isActive, etc.) |
| GET | `/admin/analytics` | `eduportal-admin-get-analytics` | Usage analytics (startDate, endDate) |
| GET | `/admin/health` | `eduportal-admin-system-health` | System health |

### AI (async, SQS-triggered — not HTTP)

| Trigger | Handler | Description |
|---------|---------|-------------|
| SQS FIFO queue | `eduportal-ai-process-async` | Processes async chat messages (conversationId, messageId, userId) |
