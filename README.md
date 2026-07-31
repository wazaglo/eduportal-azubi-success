# eduportal-azubi-success

AI-powered student support platform. Students ask academic questions and receive AI-generated responses.

Built as a serverless application on AWS. The frontend is a Qwik City SPA with mock data for standalone development.

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
├── frontend/          # Qwik City SPA (UI, stores, mock data)
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

18 TypeScript handlers in `backend/src/functions/`, deployed to Lambda as `eduportal-<name>`. Auth is JWT via `Authorization: Bearer <token>`; admin endpoints also require the `admin` role.

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
