# Development Guide

## Prerequisites

| Tool | Version | Installation |
|------|---------|-------------|
| Node.js | >= 20.x LTS | `nvm install 20` |
| npm | >= 10.x | Comes with Node.js |
| AWS CLI | >= 2.x (optional for local dev) | `brew install awscli` or [installer](https://aws.amazon.com/cli/) |

## Clone and Install

```bash
git clone https://github.com/your-org/ai-student-support.git
cd ai-student-support
npm install
```

This installs dependencies for both `frontend/` and `backend/` packages.

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
| `AWS_REGION` | `us-east-1` | AWS region for SDK clients |
| `AWS_ENDPOINT` | `http://localhost:8000` | DynamoDB Local endpoint |
| `TABLE_USERS` through `TABLE_AUDIT_LOG` | `ai-student-*` | Table names (can be anything for local testing) |
| `COGNITO_USER_POOL_ID` | - | Required if using Cognito |
| `COGNITO_CLIENT_ID` | - | Required if using Cognito |
| `JWT_SECRET` | - | Secret for local JWT signing |
| `LOG_LEVEL` | `DEBUG` | Log detail level |

### Build

```bash
cd backend
npm run build
```

This runs the esbuild bundler and produces Lambda bundles in `backend/dist/`. Each handler is compiled into a single CJS file with all dependencies (except AWS SDK packages) bundled inline.

Output:

```
backend/dist/
├── auth/register/index.js
├── auth/login/index.js
├── auth/verify-email/index.js
├── auth/reset-password/index.js
├── auth/refresh-token/index.js
├── chat/send-message/index.js
├── chat/get-conversations/index.js
├── chat/get-conversation/index.js
├── chat/delete-conversation/index.js
├── user/get-profile/index.js
├── user/update-profile/index.js
├── feedback/submit-feedback/index.js
├── feedback/get-feedback/index.js
├── admin/list-users/index.js
├── admin/manage-user/index.js
├── admin/get-analytics/index.js
├── admin/system-health/index.js
└── ai/process-async/index.js
```

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
| Environment variables | `UPPER_SNAKE_CASE` | `JWT_SECRET` |

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

**Dependency Injection:** Services receive dependencies through the constructor. This enables unit testing with mock repositories.

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
feat(chat): add message caching layer
fix(auth): handle expired refresh tokens
chore(deps): update aws-sdk to v3.600
```
