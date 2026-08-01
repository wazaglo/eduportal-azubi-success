# Development Guide

## Prerequisites

| Tool | Version | Installation |
|------|---------|-------------|
| Node.js | >= 20.x LTS | `nvm install 20` |
| npm | >= 10.x | Comes with Node.js |
| AWS CLI | >= 2.x (optional for local dev) | `brew install awscli` or [installer](https://aws.amazon.com/cli/) |

## Clone and Install

```bash
git clone git@github.com:wazaglo/eduportal-azubi-success.git
cd eduportal-azubi-success
```

## Backend Development

### Setup

```bash
cd backend
cp ../.env.example .env
# Edit .env with your local configuration
```

### Environment Variables

Key variables for local development:

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_REGION` | `eu-west-1` | AWS region for SDK clients |
| `AWS_ENDPOINT` | `http://localhost:8000` | DynamoDB Local endpoint |
| `TABLE_USERS` through `TABLE_KNOWLEDGE` | `ai-student-*` | Table names (can be anything for local testing) |
| `COGNITO_USER_POOL_ID` | - | Required if using Cognito |
| `COGNITO_CLIENT_ID` | - | Required if using Cognito |
| `COGNITO_CLIENT_ID` | - | Cognito app client id |
| `LOG_LEVEL` | `DEBUG` | Log detail level |

### Build

```bash
cd backend
npm run build:all
```

This runs the esbuild bundler and produces one zip per Lambda handler in `backend/deployments/`. Each handler is compiled into a single CJS file with all dependencies (except AWS SDK packages) bundled inline.

Output:

```
backend/deployments/
├── auth/register.zip
├── auth/login.zip
├── auth/verify-email.zip
├── auth/reset-password.zip
├── auth/refresh-token.zip
├── auth/resend-verification-code.zip
├── question/ask.zip
├── question/list.zip
├── question/faq.zip
├── question/delete.zip
├── user/get-profile.zip
├── user/update-profile.zip
├── feedback/submit-feedback.zip
├── feedback/get-feedback.zip
├── knowledge-base/presign-upload.zip
├── knowledge-base/complete-upload.zip
├── knowledge-base/list-documents.zip
├── knowledge-base/delete-document.zip
├── knowledge-base/get-download-url.zip
├── admin/list-users.zip
├── admin/manage-user.zip
├── admin/get-analytics.zip
└── admin/system-health.zip
```

### Tests

Unit tests use **vitest** and never import or mock the AWS SDK. Handlers are tested through `createHandler(deps)` factories with in-memory fake repositories:

```bash
cd backend
npm test             # run once
npm run test:watch   # watch mode
```

Test files live next to their source (`knowledge-retrieval.test.ts`, `question-service.test.ts`, `question/*.test.ts`).

### Type Check

```bash
cd backend
npm run typecheck
```

## Frontend Development

### Setup

```bash
cd frontend
npm install
```

### Dev Server

```bash
cd frontend
npm run dev
```

The development server starts at `http://localhost:8081` with Hot Module Replacement (HMR).

### Build for Production

```bash
cd frontend
npm run build
```

Output is written to `frontend/dist/`.

## Coding Standards

### TypeScript Configuration

The project uses strict TypeScript. Key settings:

- `strict: true` — Enables all strict type-checking options
- `noUncheckedIndexedAccess` — Protects against undefined array indexing
- `noImplicitReturns` — Ensures all code paths return a value
- `target: ES2022` — Modern JavaScript output

### Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| Files and directories | `kebab-case` | `auth-service.ts` |
| Classes | `PascalCase` | `AuthService` |
| Interfaces | `PascalCase` | `AuthResult` |
| Types | `PascalCase` | `TokenResult` |
| Functions and methods | `camelCase` | `sendMessage()` |
| Variables and parameters | `camelCase` | `conversationId` |
| Constants and enums | `UPPER_SNAKE_CASE` | `TABLE_NAMES` |
| Environment variables | `UPPER_SNAKE_CASE` | `COGNITO_CLIENT_ID` |

### Backend Patterns

**Lambda Handler Pattern:**

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { MyService } from '../../services/my-service';
import { successResponse } from '../../utils/response';
import { wrapHandler } from '../../utils/error-handler';
import { validateSchema } from '../../utils/validator';

const mySchema = z.object({
  field: z.string().min(1),
});

const service = new MyService();

async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body ?? '{}');
  const input = validateSchema(mySchema, body);
  const result = await service.execute(input);
  return successResponse(result);
}

export const main = wrapHandler(handler);
```

**Dependency Injection:** Handlers are built with `createHandler(deps)` factories returning `wrapHandler(...)`; the exported `main` wires real dependencies. Tests call `createHandler` with fakes — see `backend/src/functions/question/ask.test.ts`.

**Error Handling:** Use custom error classes:

```typescript
throw new ValidationError('Invalid email format');
throw new AuthenticationError('Invalid credentials');
throw new AuthorizationError('Admin access required');
throw new NotFoundError('User', userId);
throw new ConflictError('Email already in use');
```

### Frontend Patterns

**Components:** Use `component$` from Qwik:

```typescript
import { component$ } from '@builder.io/qwik';

interface Props {
  label: string;
  onClick$: () => void;
}

export const MyComponent = component$<Props>(({ label, onClick$ }) => {
  return <button onClick$={onClick$}>{label}</button>;
});
```

**State Management:** Use Qwik stores for local state. Global state lives in `src/stores/`. API calls go through `src/utils/api-client.ts` which handles auth token injection.

**Routing:** Qwik City file-based routing. Directories under `src/routes/` map to URL paths. `layout.tsx` files define shared layouts.

## Git Workflow

### Branch Naming

| Prefix | Purpose |
|--------|---------|
| `feature/*` | New feature |
| `fix/*` | Bug fix |
| `refactor/*` | Code refactoring |
| `chore/*` | Maintenance, deps, tooling |

### Commit Convention

Use conventional commits:

```
feat(question): add cache lookup for similar queries
fix(auth): handle expired refresh tokens
chore(deps): update aws-sdk to v3.600
```
