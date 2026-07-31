# API Reference

Base URL: `https://api.student-support.ai/v1`

## Authentication

All authenticated endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens are JSON Web Tokens (JWT) issued by Amazon Cognito. Access tokens expire after 1 hour. Use the refresh token endpoint to obtain a new access token without re-authenticating.

### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Request body or parameters failed validation |
| 401 | `AUTHENTICATION_ERROR` | Missing, invalid, or expired token |
| 403 | `AUTHORIZATION_ERROR` | Insufficient role permissions |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Resource already exists (e.g., duplicate email) |
| 429 | `RATE_LIMIT` | Too many requests (rate limit exceeded) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 503 | `SERVICE_UNAVAILABLE` | Service temporarily unavailable |

Error response format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "issues": [
        {
          "path": "email",
          "message": "Invalid email address",
          "code": "invalid_string"
        }
      ]
    }
  }
}
```

---

## Auth Endpoints

### POST /auth/register

Create a new user account. Triggers a verification email via Cognito.

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
| email | string | Yes | Valid university email address |
| password | string | Yes | Min 8 chars, must include uppercase, lowercase, digit, and special character |
| fullName | string | Yes | Full display name |
| role | string | No | `student` (default), `support`, or `admin` |
| department | string | No | Academic department |
| enrollmentYear | number | No | Year of enrollment |
| courseOfStudy | string | No | Course or program name |

**Response** `201 Created`:

```json
{
  "user": {
    "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "student@university.edu",
    "fullName": "Jane Doe",
    "role": "student",
    "department": "Computer Science",
    "enrollmentYear": 2025,
    "courseOfStudy": "BSc Computer Science",
    "isActive": false,
    "isEmailVerified": false,
    "createdAt": "2025-08-15T10:30:00Z"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIs...",
    "idToken": "eyJhbGciOiJSUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

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
  "user": {
    "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "student@university.edu",
    "fullName": "Jane Doe",
    "role": "student"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIs...",
    "idToken": "eyJhbGciOiJSUzI1NiIs...",
    "expiresIn": 3600
  }
}
```

### POST /auth/verify-email

Confirm a user's email address using the verification code sent during registration.

**Request:**

```json
{
  "email": "student@university.edu",
  "code": "123456"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Email address to verify |
| code | string | Yes | 6-digit verification code from email |

**Response** `200 OK`:

```json
{
  "message": "Email verified successfully"
}
```

### POST /auth/reset-password

Request a password reset or confirm a password reset.

**Step 1 - Request reset code:**

```json
{
  "email": "student@university.edu",
  "action": "request"
}
```

**Step 2 - Confirm reset with code:**

```json
{
  "email": "student@university.edu",
  "action": "confirm",
  "code": "654321",
  "newPassword": "NewSecureP@ss456"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Account email address |
| action | string | Yes | `request` or `confirm` |
| code | string | For confirm | 6-digit reset code from email |
| newPassword | string | For confirm | New password meeting complexity requirements |

**Response** `200 OK`:

```json
{
  "message": "Password reset successful"
}
```

### POST /auth/refresh-token

Obtain a new access token using a valid refresh token.

**Request:**

```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response** `200 OK`:

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "idToken": "eyJhbGciOiJSUzI1NiIs...",
  "expiresIn": 3600
}
```

---

## Chat Endpoints

Requires `Bearer` token. Available to `student`, `support`, and `admin` roles.

### POST /chat/send

Send a message to the AI assistant or continue an existing conversation. If `conversationId` is omitted, a new conversation is created.

**Request:**

```json
{
  "conversationId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "content": "Can you help me understand the requirements for my calculus assignment?",
  "queryType": "academic",
  "requireAsync": false
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| conversationId | string (uuid) | No | null | Existing conversation ID. Omit to start a new conversation |
| content | string | Yes | - | Message text (max 10,000 characters) |
| queryType | string | No | `general` | `academic`, `administrative`, or `general` |
| requireAsync | boolean | No | `false` | If `true`, processes asynchronously via SQS; returns 202 with a `messageId` |

**Response** `200 OK` (synchronous):

```json
{
  "conversationId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "userMessage": {
    "messageId": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "role": "user",
    "content": "Can you help me understand the requirements for my calculus assignment?",
    "queryType": "academic",
    "timestamp": "2025-08-15T10:31:00Z"
  },
  "aiMessage": {
    "messageId": "d4e5f6a7-b8c9-0123-defa-234567890123",
    "role": "assistant",
    "content": "I'd be happy to help with your calculus assignment! Could you tell me which specific topic you're working on? Topics include limits, derivatives, integrals, and series. Knowing the area will help me provide the most relevant guidance.",
    "queryType": "academic",
    "modelUsed": "amazon.nova-lite-v1:0",
    "latencyMs": 1240,
    "tokensUsed": {
      "prompt": 245,
      "completion": 58,
      "total": 303
    },
    "timestamp": "2025-08-15T10:31:02Z"
  },
  "sources": [
    {
      "title": "Calculus I Syllabus 2025",
      "relevance": 0.92,
      "url": "/knowledge-base/calc1-syllabus-2025"
    }
  ]
}
```

**Response** `202 Accepted` (async):

```json
{
  "conversationId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "messageId": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "status": "processing"
}
```

### GET /chat/conversations

List all conversations for the authenticated user. Supports pagination.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | integer | 20 | Max items per page (1-100) |
| nextToken | string | - | Pagination token from previous response |
| status | string | - | Filter by status: `active`, `archived`, `resolved` |
| sortOrder | string | `DESC` | `ASC` or `DESC` (by last activity) |

**Response** `200 OK`:

```json
{
  "conversations": [
    {
      "conversationId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "title": "Calculus Assignment Help",
      "status": "active",
      "messageCount": 12,
      "lastMessageAt": "2025-08-15T10:31:02Z",
      "createdAt": "2025-08-14T09:00:00Z",
      "lastMessagePreview": "I'd be happy to help with your calculus assignment!"
    }
  ],
  "pagination": {
    "limit": 20,
    "total": 1,
    "nextToken": "eyJsYXN0RXZhbHVhdGVkS2V5Ijp7fQ=="
  }
}
```

### GET /chat/conversations/{id}

Retrieve a full conversation with all messages.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| id | uuid | Conversation ID |

**Response** `200 OK`:

```json
{
  "conversationId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "title": "Calculus Assignment Help",
  "status": "active",
  "metadata": {
    "queryTypes": ["academic", "general"],
    "totalTokensUsed": 1250,
    "averageLatencyMs": 980
  },
  "messages": [
    {
      "messageId": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "role": "user",
      "content": "Can you help me understand the requirements for my calculus assignment?",
      "queryType": "academic",
      "timestamp": "2025-08-15T10:31:00Z"
    },
    {
      "messageId": "d4e5f6a7-b8c9-0123-defa-234567890123",
      "role": "assistant",
      "content": "I'd be happy to help with your calculus assignment!...",
      "queryType": "academic",
      "modelUsed": "amazon.nova-lite-v1:0",
      "latencyMs": 1240,
      "tokensUsed": { "prompt": 245, "completion": 58, "total": 303 },
      "timestamp": "2025-08-15T10:31:02Z"
    }
  ],
  "feedback": [
    {
      "rating": 5,
      "category": "helpfulness",
      "comment": "Very helpful explanation!",
      "createdAt": "2025-08-15T11:00:00Z"
    }
  ],
  "createdAt": "2025-08-14T09:00:00Z",
  "updatedAt": "2025-08-15T10:31:02Z"
}
```

### DELETE /chat/conversations/{id}

Delete a conversation and all its messages.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| id | uuid | Conversation ID |

**Response** `204 No Content`.

---

## User Endpoints

Requires `Bearer` token. Available to all authenticated users.

### GET /user/profile

Retrieve the authenticated user's profile.

**Response** `200 OK`:

```json
{
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "student@university.edu",
  "fullName": "Jane Doe",
  "role": "student",
  "department": "Computer Science",
  "enrollmentYear": 2025,
  "courseOfStudy": "BSc Computer Science",
  "isActive": true,
  "isEmailVerified": true,
  "avatarUrl": "https://cdn.student-support.ai/avatars/a1b2c3d4.jpg",
  "preferences": {
    "theme": "light",
    "language": "en",
    "notificationsEnabled": true
  },
  "stats": {
    "totalConversations": 15,
    "totalMessages": 89,
    "averageRating": 4.7,
    "memberSince": "2025-01-10T08:00:00Z"
  },
  "createdAt": "2025-01-10T08:00:00Z",
  "updatedAt": "2025-08-15T10:30:00Z"
}
```

### PUT /user/profile

Update the authenticated user's profile.

**Request:**

```json
{
  "fullName": "Jane Smith",
  "department": "Mathematics",
  "courseOfStudy": "MSc Applied Mathematics",
  "preferences": {
    "theme": "dark",
    "notificationsEnabled": false
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| fullName | string | No | Updated display name |
| department | string | No | Academic department |
| courseOfStudy | string | No | Course or program |
| preferences.theme | string | No | `light` or `dark` |
| preferences.language | string | No | Locale code (e.g., `en`, `es`, `fr`) |
| preferences.notificationsEnabled | boolean | No | Toggle push notifications |

**Response** `200 OK`:

```json
{
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "student@university.edu",
  "fullName": "Jane Smith",
  "role": "student",
  "department": "Mathematics",
  "courseOfStudy": "MSc Applied Mathematics",
  "isActive": true,
  "preferences": {
    "theme": "dark",
    "language": "en",
    "notificationsEnabled": false
  },
  "updatedAt": "2025-08-15T11:00:00Z"
}
```

---

## Feedback Endpoints

Requires `Bearer` token. Available to `student` role.

### POST /feedback

Submit feedback on an AI response. Each message can receive feedback only once per user; subsequent submissions overwrite the previous.

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
| rating | integer | Yes | 1-5 star rating |
| category | string | No | `accuracy`, `relevance`, `helpfulness`, `clarity`, `other` |
| comment | string | No | Optional text feedback (max 2,000 characters) |

**Response** `201 Created`:

```json
{
  "feedback": {
    "feedbackId": "e5f6a7b8-c9d0-1234-efab-345678901234",
    "messageId": "d4e5f6a7-b8c9-0123-defa-234567890123",
    "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "rating": 5,
    "category": "helpfulness",
    "comment": "This answer was exactly what I needed!",
    "createdAt": "2025-08-15T11:30:00Z"
  }
}
```

### GET /feedback

Retrieve feedback submitted by the authenticated user. Supports pagination.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | integer | 20 | Items per page (1-100) |
| nextToken | string | - | Pagination token |
| sortOrder | string | `DESC` | `ASC` or `DESC` (by creation date) |

**Response** `200 OK`:

```json
{
  "feedback": [
    {
      "feedbackId": "e5f6a7b8-c9d0-1234-efab-345678901234",
      "conversationId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "messageId": "d4e5f6a7-b8c9-0123-defa-234567890123",
      "rating": 5,
      "category": "helpfulness",
      "comment": "This answer was exactly what I needed!",
      "createdAt": "2025-08-15T11:30:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "total": 1,
    "nextToken": null
  }
}
```

---

## Knowledge Base Endpoints

The knowledge base stores Ghana SHS curriculum documents (NaCCA) in S3, organized by `Year / Subject / Strand / Sub-Strand`. Chat answers can reference these documents.

Requires `Bearer` token. Listing is available to any authenticated user; upload and delete require the `admin` role.

### GET /knowledge-base/documents

List documents, optionally filtered.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| year | string | - | Filter by level: `SHS1`, `SHS2`, `SHS3` |
| subject | string | - | Filter by subject (e.g., `Integrated Science`) |
| strand | string | - | Filter by strand name |
| substrand | string | - | Filter by sub-strand name |
| limit | integer | 1000 | Max items to return (1-1000) |

**Response** `200 OK`:

```json
{
  "data": [
    {
      "documentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "s3Key": "knowledge/SHS1/Integrated_Science/Vigour_Behind_Life/Consumer_Electronics/integrated-science-SHS1-vigour-behind-life-consumer-electronics.md",
      "fileName": "integrated-science-SHS1-vigour-behind-life-consumer-electronics.md",
      "year": "SHS1",
      "subject": "Integrated Science",
      "strand": "Vigour Behind Life",
      "substrand": "Consumer Electronics",
      "size": 3549,
      "contentType": "text/markdown",
      "status": "indexed",
      "uploadedBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "uploadedAt": "2026-07-31T14:00:00Z",
      "downloads": 0
    }
  ]
}
```

### POST /knowledge-base/presign-upload

*Admin only.* Obtain a presigned S3 PUT URL for a new document. After uploading the file to that URL, call `complete-upload`.

**Request:**

```json
{
  "fileName": "integrated-science-SHS1-vigour-behind-life-consumer-electronics.md",
  "contentType": "text/markdown",
  "year": "SHS1",
  "subject": "Integrated Science",
  "strand": "Vigour Behind Life",
  "substrand": "Consumer Electronics"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| fileName | string | Yes | File name (max 255 chars) |
| contentType | string | Yes | MIME type of the file |
| year | string | Yes | `SHS1`, `SHS2`, or `SHS3` |
| subject | string | Yes | One of the 28 supported subjects |
| strand | string | Yes | Strand name (max 120 chars) |
| substrand | string | Yes | Sub-strand name (max 120 chars) |

**Response** `200 OK`:

```json
{
  "data": {
    "uploadUrl": "https://eduportal-azubi-success-knowledge-base.s3.eu-west-1.amazonaws.com/knowledge/SHS1/...?X-Amz-Signature=...",
    "s3Key": "knowledge/SHS1/Integrated_Science/Vigour_Behind_Life/Consumer_Electronics/integrated-science-SHS1-vigour-behind-life-consumer-electronics.md",
    "expiresIn": 300,
    "uploadedBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

The upload URL expires after 300 seconds. Spaces in `year`/`subject`/`strand`/`substrand` are replaced with underscores in the S3 key.

### POST /knowledge-base/complete-upload

*Admin only.* Register document metadata after the file has been uploaded to S3.

**Request:**

```json
{
  "s3Key": "knowledge/SHS1/Integrated_Science/Vigour_Behind_Life/Consumer_Electronics/integrated-science-SHS1-vigour-behind-life-consumer-electronics.md",
  "fileName": "integrated-science-SHS1-vigour-behind-life-consumer-electronics.md",
  "year": "SHS1",
  "subject": "Integrated Science",
  "strand": "Vigour Behind Life",
  "substrand": "Consumer Electronics",
  "size": 3549,
  "contentType": "text/markdown"
}
```

**Response** `201 Created` — returns the created document record.

### DELETE /knowledge-base/documents

*Admin only.* Delete a document from the knowledge base (removes both the S3 object and its metadata).

**Request:**

```json
{
  "documentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "s3Key": "knowledge/SHS1/Integrated_Science/Vigour_Behind_Life/Consumer_Electronics/integrated-science-SHS1-vigour-behind-life-consumer-electronics.md"
}
```

**Response** `200 OK`:

```json
{
  "data": {
    "deleted": true
  }
}
```

---

## Admin Endpoints

Requires `Bearer` token with `admin` role.

### GET /admin/users

List all users in the system with optional role filtering and pagination.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| role | string | - | Filter by role: `student`, `support`, `admin` |
| limit | integer | 20 | Items per page (1-100) |
| nextToken | string | - | Pagination token |
| sortOrder | string | `DESC` | `ASC` or `DESC` |

**Response** `200 OK`:

```json
{
  "users": [
    {
      "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "student@university.edu",
      "fullName": "Jane Doe",
      "role": "student",
      "department": "Computer Science",
      "isActive": true,
      "isEmailVerified": true,
      "createdAt": "2025-01-10T08:00:00Z",
      "lastLoginAt": "2025-08-15T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "total": 1,
    "nextToken": null
  }
}
```

### GET /admin/analytics

Retrieve system-wide analytics and metrics.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| startDate | string | 30 days ago | ISO 8601 start date |
| endDate | string | now | ISO 8601 end date |
| granularity | string | `day` | `hour`, `day`, `week`, `month` |

**Response** `200 OK`:

```json
{
  "summary": {
    "totalUsers": 1250,
    "activeUsers": 342,
    "totalConversations": 8750,
    "totalMessages": 45200,
    "averageResponseTimeMs": 890,
    "averageSatisfactionScore": 4.3,
    "resolutionRate": 0.87,
    "escalationRate": 0.12
  },
  "trends": [
    {
      "period": "2025-08-15",
      "conversations": 320,
      "messages": 1650,
      "newUsers": 28,
      "avgSatisfaction": 4.2,
      "avgResponseTimeMs": 920
    }
  ],
  "topQueries": [
    {
      "queryType": "academic",
      "count": 4200,
      "percentage": 48.0
    },
    {
      "queryType": "administrative",
      "count": 2800,
      "percentage": 32.0
    },
    {
      "queryType": "general",
      "count": 1750,
      "percentage": 20.0
    }
  ],
  "peakHours": [
    { "hour": 10, "conversations": 450 },
    { "hour": 14, "conversations": 520 },
    { "hour": 20, "conversations": 380 }
  ]
}
```

### PUT /admin/users/{id}

Update any user's account details. Admin-only.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| id | uuid | User ID |

**Request:**

```json
{
  "role": "support",
  "department": "IT Support",
  "isActive": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| role | string | No | `student`, `support`, or `admin` |
| department | string | No | Department assignment |
| isActive | boolean | No | Activate or deactivate account |

**Response** `200 OK`:

```json
{
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "student@university.edu",
  "fullName": "Jane Doe",
  "role": "support",
  "department": "IT Support",
  "isActive": true,
  "updatedAt": "2025-08-15T12:00:00Z"
}
```

### GET /admin/health

System health check endpoint. Does not require authentication.

**Response** `200 OK`:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-08-15T12:00:00Z",
  "uptime": 3600000,
  "services": {
    "database": {
      "status": "healthy",
      "latencyMs": 12
    },
    "aiProvider": {
      "status": "healthy",
      "model": "amazon.nova-lite-v1:0",
      "latencyMs": 850
    },
    "cache": {
      "status": "healthy",
      "hitRate": 0.76
    },
    "auth": {
      "status": "healthy"
    },
    "queue": {
      "status": "healthy",
      "messagesAvailable": 0,
      "messagesInFlight": 3
    }
  },
  "environment": "production",
  "region": "us-east-1"
}
```

---

## Rate Limiting

Requests are rate-limited per user per endpoint group:

| Tier | Rate Limit | Burst |
|------|-----------|-------|
| Chat endpoints | 60 req/min | 100 |
| Auth endpoints | 20 req/min | 30 |
| Admin endpoints | 120 req/min | 200 |
| Health check | 300 req/min | 500 |

Exceeded limits return `429 Too Many Requests` with a `Retry-After` header.

## Pagination

List endpoints use cursor-based pagination. The `nextToken` in the response is an opaque string. Pass it as a query parameter to retrieve the next page. A `null` or absent `nextToken` indicates the last page.

## Common Headers

| Header | Description |
|--------|-------------|
| `X-Request-ID` | Correlation ID for request tracing |
| `X-RateLimit-Remaining` | Number of requests remaining in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the rate limit resets |
