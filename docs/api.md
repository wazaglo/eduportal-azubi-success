# API Reference

Base URL (dev stage): `https://kzhykroge1.execute-api.eu-west-1.amazonaws.com/dev`

## Authentication

All endpoints require a Bearer token in the `Authorization` header, except the public auth endpoints:

```
Authorization: Bearer <id_token>
```

Tokens are issued by Amazon Cognito. **API Gateway validates the Cognito ID token** (`COGNITO_USER_POOLS` authorizer) before the request reaches a Lambda; each handler then resolves the user and role from the users table via the `sub` claim (`extractAndVerifyUser`, `defaultRoleResolver`). Admin endpoints additionally require the `admin` role (`requireAdmin`). Send the **ID token** (`tokens.idToken`), not the access token — the gateway accepts ID tokens.

### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Request body or parameters failed validation |
| 401 | `AUTHENTICATION_ERROR` | Missing, invalid, or expired token |
| 403 | `AUTHORIZATION_ERROR` | Insufficient role permissions |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Resource already exists (e.g., duplicate email) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 503 | `SERVICE_UNAVAILABLE` | Health check degraded/unhealthy |

Error response format:

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Missing Authorization header"
  }
}
```

---

## Questions (Cognito)

The core domain. Asking a question searches the NaCCA knowledge base for the best matching curriculum section and returns a grounded answer, falling back to AI when nothing matches well.

### POST /ask

Ask a question.

**Request:**

```json
{
  "question": "What is photosynthesis in plants?",
  "subject": "Integrated Science"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| question | string | Yes | Question text (1-2000 chars) |
| subject | string | No | Hint: one of `English Language`, `Core Mathematics`, `Integrated Science`, `Social Studies` |

**Response** `201 Created`:

```json
{
  "success": true,
  "data": {
    "questionId": "cf4ba04f-c051-44c0-afee-87a0eebd8161",
    "question": "What is photosynthesis in plants?",
    "answer": "<curriculum excerpt or AI answer>",
    "subject": "Integrated Science",
    "source": "knowledge_base",
    "status": "answered",
    "documentTitle": "PROCESSES_FOR_LIVING/Integrated_Science-SHS1-sprocesses-for-living_essentials-for-survival.txt",
    "createdAt": "2026-08-01T18:15:40.545Z"
  }
}
```

`source` is `knowledge_base` when the answer is grounded in the curriculum, `ai` when it fell back to the model.

### GET /question

List the current user's questions, newest first.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | integer | 20 | Max items (1-100) |
| nextToken | string | - | Pagination token from a previous response |

**Response** `200 OK`:

```json
{
  "success": true,
  "data": [
    {
      "questionId": "cf4ba04f-c051-44c0-afee-87a0eebd8161",
      "question": "What is photosynthesis in plants?",
      "normalizedQuestion": "what is photosynthesis in plants?",
      "subject": "Integrated Science",
      "documentTitle": "PROCESSES_FOR_LIVING/...txt",
      "status": "answered",
      "createdAt": "2026-08-01T18:15:40.545Z",
      "updatedAt": "2026-08-01T18:15:40.545Z",
      "response": "<answer text>",
      "userId": "c285f4b4-5071-7024-ffa5-a81e73c1447b"
    }
  ],
  "metadata": {
    "limit": 20,
    "total": 1
  }
}
```

### GET /FAQ

Top asked questions across all users, by ask count.

**Response** `200 OK`:

```json
{
  "success": true,
  "data": [
    {
      "question": "What is photosynthesis in Integrated Science?",
      "count": 4,
      "response": "<sample answer text>",
      "subject": "Integrated Science"
    }
  ],
  "metadata": {
    "limit": 10,
    "total": 1
  }
}
```

### DELETE /question/{id}

Delete the current user's question. Only the owner (or an admin) may delete it.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| id | uuid | Question ID |

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "message": "Question deleted successfully"
  }
}
```

Deleting a question that does not exist (or belongs to another user) returns `404 NOT_FOUND`.

---

## Auth Endpoints (public)

### POST /auth/register

Create a new user account. Default role is `student`.

**Request:**

```json
{
  "email": "student@university.edu",
  "password": "SecureP@ss123",
  "fullName": "Jane Doe",
  "role": "student",
  "department": "Computer Science",
  "enrollmentYear": 2025,
  "courseOfStudy": "BSc Computer Science"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |
| password | string | Yes | 8-128 chars |
| fullName | string | Yes | Display name (max 100) |
| role | string | No | `student` (default), `support`, or `admin` |
| department | string | No | Academic department |
| enrollmentYear | number | No | Year of enrollment |
| courseOfStudy | string | No | Course or program name |

**Response** `201 Created` — `data` contains `user` and `tokens` (access + refresh).

### POST /auth/login

Authenticate with email and password.

**Request:**

```json
{
  "email": "student@university.edu",
  "password": "SecureP@ss123"
}
```

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "user": {
      "userId": "c285f4b4-5071-7024-ffa5-a81e73c1447b",
      "email": "student@university.edu",
      "fullName": "Jane Doe",
      "role": "student"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "...",
      "expiresIn": 3600
    }
  }
}
```

### POST /auth/refresh-token

Obtain a new access token from a refresh token.

**Request:** `{ "refreshToken": "..." }`

### POST /auth/verify-email

Confirm a user's email address with the verification code sent during registration.

**Request:** `{ "email": "student@university.edu", "code": "123456" }`

### POST /auth/resend-verification-code

Resend the email verification code.

**Request:** `{ "email": "student@university.edu" }`

### POST /auth/reset-password

Request a reset code (`{ "email": "..." }`) or confirm a reset (`{ "email": "...", "code": "...", "newPassword": "..." }`). The `newPassword` must be 8-128 chars.

---

## User Endpoints (Cognito)

### GET /user/profile

Retrieve the authenticated user's profile.

### POST /user/profile

Update the authenticated user's profile.

**Request:**

```json
{
  "fullName": "Jane Smith",
  "department": "Mathematics",
  "courseOfStudy": "MSc Applied Mathematics",
  "preferences": {
    "theme": "dark",
    "language": "en",
    "notifications": false
  }
}
```

---

## Feedback Endpoints (Cognito)

### POST /feedback

Submit feedback on an AI response. Submitting again for the same `messageId` overwrites the previous entry.

**Request:**

```json
{
  "messageId": "d4e5f6a7-b8c9-0123-defa-234567890123",
  "conversationId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "rating": 5,
  "category": "helpfulness",
  "comment": "This answer was exactly what I needed!"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| messageId | string (uuid) | Yes | The AI message to rate |
| conversationId | string (uuid) | No | Conversation the message belongs to |
| rating | integer | Yes | 1-5 |
| category | string | No | `accuracy`, `relevance`, `helpfulness`, `clarity`, `other` |
| comment | string | No | Max 2000 chars |

### GET /feedback

List the current user's feedback (`limit` ≤ 100, `nextToken`).

---

## Knowledge Base Endpoints (Cognito)

The knowledge base stores parsed NaCCA curriculum sections for **4 subjects**: English Language, Core Mathematics, Integrated Science, Social Studies. Documents live in `knowledge/{Subject}/{Strand}/` in the `eduportal-azubi-success-knowledge-base` bucket. Listing requires any authenticated user; upload/delete require `admin`.

### GET /knowledge-base/documents

List documents, optionally filtered.

**Query Parameters:** `year` (`SHS1`-`SHS3`), `subject`, `strand`, `substrand`, `limit` (default 1000, max 1000).

### GET /knowledge-base/download-url

Get a presigned S3 download URL for a subject's curriculum PDF.

### POST /knowledge-base/presign-upload

*Admin only.* Obtain a presigned S3 PUT URL. `year` must be `SHS1`/`SHS2`/`SHS3`; `subject` must be one of the 4 supported subjects.

### POST /knowledge-base/complete-upload

*Admin only.* Register document metadata after uploading to S3.

### DELETE /knowledge-base/documents

*Admin only.* Delete a document. Request: `{ "documentId": "...", "s3Key": "..." }`.

---

## Admin Endpoints (Cognito + admin role)

### GET /admin/users

List all users (`role` filter, `limit` ≤ 100, `nextToken`).

### PUT /admin/users/{id}

Update a user. Body fields: `role` (`student`/`support`/`admin`), `isActive`, `department`, `fullName`.

### GET /admin/analytics

Usage analytics. Query params: `startDate`, `endDate` (ISO 8601; default last 7 days).

### GET /admin/health

System health over the users, questions, and cache stores.

**Response** `200 OK` (healthy) / `503` (degraded):

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 123.4,
    "responseTimeMs": 12,
    "timestamp": "2026-08-01T18:00:00.000Z",
    "checks": {
      "users": { "healthy": true, "count": 3 },
      "questions": { "healthy": true, "count": 12 },
      "cache": { "healthy": true, "entries": 4 }
    }
  }
}
```

---

## Common Behavior

- **Pagination**: list endpoints use cursor-based pagination via `nextToken`. A missing `nextToken` in `metadata` indicates the last page.
- **CORS**: all routes respond to `OPTIONS` (MOCK) with `Access-Control-Allow-Origin: *`, methods `GET,POST,PUT,DELETE,OPTIONS`, headers `Content-Type,Authorization,X-Correlation-Id`.
- **Correlation ID**: requests may include an `X-Correlation-Id` header, echoed in CORS allow-headers.
