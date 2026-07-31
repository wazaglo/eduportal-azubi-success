# AWS Resources — Manual Provisioning Guide

This document describes every AWS resource that must be created manually via the AWS Management Console for the AI-Powered Student Support System. No Infrastructure as Code (Terraform, CDK, SAM) is used.

---

## Table of Contents

1. [DynamoDB Tables](#1-dynamodb-tables)
2. [Cognito User Pool](#2-cognito-user-pool)
3. [Amazon Bedrock](#3-amazon-bedrock)
4. [SQS Queue (FIFO)](#4-sqs-queue-fifo)
5. [SNS Topic](#5-sns-topic)
6. [SES (Simple Email Service)](#6-ses-simple-email-service)
7. [Lambda Functions](#7-lambda-functions)
8. [API Gateway](#8-api-gateway)
9. [Amplify Hosting](#9-amplify-hosting)
10. [IAM Roles](#10-iam-roles)
11. [CloudWatch](#11-cloudwatch)

---

## 1. DynamoDB Tables

### Table Naming Convention

All table names are configurable via environment variables. The defaults below are what the application code expects.

### Table: `ai-student-users`

| Attribute | Type | Description |
|-----------|------|-------------|
| userId (PK) | String | Cognito sub / UUID |
| email | String | User email address |
| fullName | String | Display name |
| role | String | `student`, `support`, `admin` |
| organizationId | String (optional) | Org ID |
| department | String (optional) | Academic dept |
| enrollmentYear | Number (optional) | Year enrolled |
| courseOfStudy | String (optional) | Course name |
| isEmailVerified | Boolean | Email verified flag |
| isActive | Boolean | Account active flag |
| cognitoSub | String | Cognito user sub |
| preferences | Map (optional) | `{ language, notifications, theme }` |
| createdAt | String | ISO 8601 timestamp |
| updatedAt | String | ISO 8601 timestamp |

**GSIs:**
- `EmailIndex` — PK: `email` (String) — for lookup by email
- `RoleIndex` — PK: `role` (String) — for admin user listing by role

**Settings:**
- Billing mode: Pay per request (On-demand)
- Encryption: AWS owned key (default)
- Point-in-time recovery: Enable for production

**Env var:** `TABLE_USERS`

---

### Table: `ai-student-conversations`

| Attribute | Type | Description |
|-----------|------|-------------|
| conversationId (PK) | String | UUID |
| userId | String | Owner user ID |
| title | String | Conversation title (first 100 chars of first message) |
| status | String | `active`, `archived`, `resolved` |
| queryType | String (optional) | `academic`, `administrative`, `general` |
| summary | String (optional) | AI-generated summary |
| messageCount | Number | Total messages in conversation |
| tags | String[] (optional) | User-applied tags |
| metadata | Map (optional) | Flexible metadata |
| createdAt | String | ISO 8601 timestamp |
| updatedAt | String | ISO 8601 timestamp |
| lastMessageAt | String | ISO 8601 timestamp |

**GSIs:**
- `UserConversationsIndex` — PK: `userId` (String), SK: `lastMessageAt` (String)
- `StatusIndex` — PK: `status` (String), SK: `lastMessageAt` (String)

**Env var:** `TABLE_CONVERSATIONS`

---

### Table: `ai-student-messages`

| Attribute | Type | Description |
|-----------|------|-------------|
| messageId (PK) | String | UUID |
| conversationId | String | Parent conversation ID |
| userId | String | Sender user ID |
| sender | String | `user`, `ai`, `system` |
| content | String | Message text |
| status | String | `sent`, `delivered`, `processing`, `failed` |
| queryType | String (optional) | `academic`, `administrative`, `general` |
| metadata | Map (optional) | `{ modelUsed, latencyMs, tokensUsed, cached, confidence, guardrailTriggered }` |
| createdAt | String | ISO 8601 timestamp |

**GSIs:**
- `ConversationMessagesIndex` — PK: `conversationId` (String), SK: `createdAt` (String)
- `StatusIndex` — PK: `status` (String) — for message status queries
- `CreatedAtIndex` — PK: `createdAt` (String) — for daily message count queries

**Env var:** `TABLE_MESSAGES`

---

### Table: `ai-student-cache`

| Attribute | Type | Description |
|-----------|------|-------------|
| cacheId (PK) | String | UUID |
| query | String | Original user query |
| queryEmbedding | Number[] (optional) | Vector embedding |
| response | String | AI response text |
| queryType | String | `academic`, `administrative`, `general` |
| modelUsed | String | Model that generated the response |
| tokensUsed | Number | Token count |
| hitCount | Number | Number of cache hits |
| similarityHash | String | Hash for similarity lookup |
| source | String (optional) | Content source |
| metadata | Map (optional) | Flexible metadata |
| createdAt | String | ISO 8601 timestamp |
| expiresAt | String | ISO 8601 TTL timestamp |
| lastAccessedAt | String | ISO 8601 timestamp |

**GSIs:**
- `HashIndex` — PK: `similarityHash` (String) — for cache lookup by query hash
- `QueryTypeIndex` — PK: `queryType` (String) — for finding similar cached responses

**Env var:** `TABLE_CACHE`

---

### Table: `ai-student-feedback`

| Attribute | Type | Description |
|-----------|------|-------------|
| feedbackId (PK) | String | UUID |
| userId | String | User who submitted feedback |
| messageId | String | AI message being rated |
| conversationId | String (optional) | Parent conversation |
| rating | Number | 1–5 star rating |
| category | String (optional) | `accuracy`, `relevance`, `helpfulness`, `clarity`, `other` |
| comment | String (optional) | Free-text comment |
| isResolved | Boolean | Whether feedback has been addressed |
| metadata | Map (optional) | Flexible metadata |
| createdAt | String | ISO 8601 timestamp |
| updatedAt | String | ISO 8601 timestamp |

**GSIs:**
- `UserFeedbackIndex` — PK: `userId` (String), SK: `createdAt` (String)
- `MessageFeedbackIndex` — PK: `messageId` (String)

**Env var:** `TABLE_FEEDBACK`

---

### Table: `ai-student-analytics`

| Attribute | Type | Description |
|-----------|------|-------------|
| eventId (PK) | String | UUID |
| eventType | String | e.g. `user_login`, `ai_response`, `cache_hit` |
| userId | String (optional) | Associated user |
| sessionId | String (optional) | Session identifier |
| correlationId | String (optional) | Request trace ID |
| properties | Map (optional) | Event-specific data |
| timestamp | String | ISO 8601 timestamp |

**GSIs:**
- `EventTypeIndex` — PK: `eventType` (String), SK: `timestamp` (String) — for event type queries
- `UserEventsIndex` — PK: `userId` (String), SK: `timestamp` (String) — for per-user event history

**Env var:** `TABLE_ANALYTICS`

---

### Table: `ai-student-audit-log`

| Attribute | Type | Description |
|-----------|------|-------------|
| logId (PK) | String | UUID |
| action | String | e.g. `user.create`, `admin.role_change` |
| actorId | String | User who performed the action |
| actorEmail | String (optional) | Actor's email |
| actorRole | String (optional) | Actor's role |
| targetId | String (optional) | Target resource ID |
| targetType | String (optional) | Target resource type |
| changes | Map (optional) | Before/after values |
| ipAddress | String (optional) | Client IP |
| userAgent | String (optional) | Client user agent |
| correlationId | String (optional) | Request trace ID |
| status | String | `success` or `failure` |
| failureReason | String (optional) | Error details |
| timestamp | String | ISO 8601 timestamp |

**GSIs:**
- `ActorIndex` — PK: `actorId` (String), SK: `timestamp` (String)
- `ActionIndex` — PK: `action` (String), SK: `timestamp` (String)

**Env var:** `TABLE_AUDIT_LOG`

---

### Table: `ai-student-knowledge`

Stores metadata for documents in the S3 knowledge base (the file content itself lives in S3).

| Attribute | Type | Description |
|-----------|------|-------------|
| documentId (PK) | String | UUID |
| s3Key | String | S3 object key (`knowledge/{level}/{subject}/{strand}/{substrand}/{file}`) |
| fileName | String | Original file name |
| year | String | `SHS1`, `SHS2`, `SHS3` |
| subject | String | One of 28 supported subjects |
| strand | String | Curriculum strand |
| substrand | String | Curriculum sub-strand |
| size | Number | Content length in bytes |
| contentType | String | MIME type (e.g., `text/markdown`) |
| status | String | `indexed`, `indexing`, `failed` |
| uploadedBy | String | Admin user ID |
| uploadedAt | String | ISO 8601 timestamp |
| downloads | Number | Download counter |

**GSIs:**
- `SubjectIndex` — PK: `subject` (String), SK: `uploadedAt` (String) — for listing by subject
- `YearIndex` — PK: `year` (String), SK: `uploadedAt` (String) — for listing by year

**Settings:**
- Billing mode: Pay per request (On-demand)
- Encryption: AWS owned key (default)

**Env var:** `TABLE_KNOWLEDGE`

---

### S3 Bucket: `eduportal-azubi-success-knowledge-base`

Stores the knowledge base document files (NaCCA curriculum study guides).

| Setting | Value |
|---------|-------|
| Region | eu-west-1 (or your deployment region) |
| Bucket name | `eduportal-azubi-success-knowledge-base` |
| Encryption | SSE-S3 (AES-256) |
| Public access | Block all public access |
| Key layout | `knowledge/{SHS1\|SHS2\|SHS3}/{Subject}/{Strand}/{Sub-Strand}/{file}` |

Objects are uploaded by admins via presigned PUT URLs issued by `eduportal-knowledge-base-presign-upload` and read by `eduportal-knowledge-base-list-documents`, `eduportal-knowledge-base-delete-document`, and `eduportal-chat-send-message` (via `KnowledgeService`).

**Env var:** `KNOWLEDGE_BUCKET`

---

## 2. Cognito User Pool

### Create User Pool

1. Navigate to AWS Console > Cognito > User Pools > Create user pool
2. Configure sign-in experience:
   - **Cognito user pool sign-in options**: User name (`username`), Email
   - **Required attributes**: `email`, `name`
   - **Self-service sign-up**: Enabled
   - **Verification**: Email verification (verify email)
   - **SES configuration** (optional): Use the SES verified domain/email
3. Configure password policy:
   - Min length: 8 characters
   - Require uppercase, lowercase, digits
   - Password expiration: 90 days
4. Configure MFA: Optional (recommend TOTP for admin accounts)
5. Configure app client:
   - **App client name**: `ai-student-support-app`
   - **Generate client secret**: Unchecked (public client for JS frontend)
   - **Authentication flows**: ALLOW_USER_PASSWORD_AUTH, ALLOW_REFRESH_TOKEN_AUTH
   - **Callback URLs**: `https://app.student-support.ai/auth/callback`, `http://localhost:8081/auth/callback`
   - **Sign-out URLs**: `https://app.student-support.ai/auth/login`, `http://localhost:8081/auth/login`
   - **ID token and access token expiry**: 1 hour / 1 hour
6. Create the pool
7. Note the **Pool ID** (e.g., `us-east-1_xxxxxxxxx`) — set as `COGNITO_USER_POOL_ID`
8. Note the **App Client ID** — set as `COGNITO_CLIENT_ID`

### Setup App Client

- Go to App integration > App client list > [your client]
- Enable `ALLOW_USER_PASSWORD_AUTH` and `ALLOW_REFRESH_TOKEN_AUTH`
- Add callback and logout URLs for both production and local dev

### (Optional) Configure Domain

- App integration > Cognito domain
- Create a domain: `ai-student-support-[env].auth.us-east-1.amazoncognito.com`

---

## 3. Amazon Bedrock

### Model Access

1. Navigate to AWS Console > Bedrock > Model access
2. Request access to the following models:
   - **Amazon**: Nova Lite (`amazon.nova-lite-v1:0`)
   - **Anthropic**: Claude 3.5 Sonnet (`anthropic.claude-3-5-sonnet-20241022-v2:0`)
   - **Anthropic**: Claude 3 Haiku (`anthropic.claude-3-haiku-20240307-v1:0`)
3. Wait for access approval (usually takes a few minutes)
4. Verify access in the Bedrock console under Model access

### Guardrails (Optional)

1. Navigate to Bedrock > Guardrails > Create guardrail
2. Guardrail name: `ai-student-support-guardrail`
3. Configure content filters:
   - Hate: High threshold
   - Insults: High threshold
   - Sexual: High threshold
   - Violence: Medium threshold
   - Misconduct: High threshold
4. Configure topic filters (optional):
   - Block topics like "weapon instructions", "illegal activities"
5. Configure word filters (optional):
   - Add custom blocked words
6. Create the guardrail
7. Note the **Guardrail ID** — set as `BEDROCK_GUARDRAIL_ID`
8. Publish a version — set as `BEDROCK_GUARDRAIL_VERSION` (default: `DRAFT`)

### Knowledge Base (Optional)

1. Navigate to Bedrock > Knowledge Base > Create knowledge base
2. Knowledge base name: `ai-student-support-kb`
3. Data source: S3 bucket containing institutional documents
4. Embeddings model: Titan Embeddings v2
5. Vector store: Choose a vector store (Pinecone, or use OpenSearch Serverless)
6. Create and sync
7. Note the **Knowledge Base ID** — set as `KNOWLEDGE_BASE_ID`

---

## 4. SQS Queue (FIFO)

### Create Queue

1. Navigate to AWS Console > SQS > Create queue
2. Type: FIFO
3. Name: `ai-student-async-processing.fifo` (must end with `.fifo`)
4. Content-based deduplication: Enabled
5. Visibility timeout: 5 minutes (300 seconds)
6. Message retention: 4 days
7. Max message size: 256 KB
8. Delivery delay: 0 seconds
9. Receive message wait: 20 seconds (long polling)
10. Enable redrive allow policy
11. Create the queue
12. Note the **Queue URL** — set as `ASYNC_QUEUE_URL`

### Create DLQ (Dead-Letter Queue)

1. Create another FIFO queue: `ai-student-async-dlq.fifo`
2. Same settings as above
3. Return to the main queue
4. Redrive policy: Enable
5. DLQ ARN: Select the DLQ queue ARN
6. Max receives: 3

### Queue Permissions

Attach a resource policy that allows the Lambda execution role to send, receive, and delete messages:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:role/ai-student-support-lambda-role"
      },
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueUrl",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:us-east-1:ACCOUNT_ID:ai-student-async-processing.fifo"
    }
  ]
}
```

---

## 5. SNS Topic

### Create Topic

1. Navigate to AWS Console > SNS > Topics > Create topic
2. Type: Standard
3. Name: `ai-student-support-alerts`
4. Display name: `AI Student Alerts`
5. Create the topic
6. Note the **Topic ARN** — set as `SNS_ALERT_TOPIC_ARN`

### Email Subscription

1. On the topic page, go to Subscriptions > Create subscription
2. Protocol: Email
3. Endpoint: Your monitoring email address (e.g., `alerts@your-domain.com`)
4. Create subscription
5. Confirm the subscription by clicking the link in the confirmation email

### Topic Policy

Attach a resource policy allowing the Lambda execution role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:role/ai-student-support-lambda-role"
      },
      "Action": "sns:Publish",
      "Resource": "arn:aws:sns:us-east-1:ACCOUNT_ID:ai-student-support-alerts"
    }
  ]
}
```

---

## 6. SES (Simple Email Service)

### Domain Verification

1. Navigate to AWS Console > SES > Configuration > Verified identities
2. Create identity > Domain
3. Enter your domain (e.g., `student-support.ai`)
4. Generate DKIM settings: Enabled
5. Create
6. Add the provided MX and DKIM records to your domain's DNS configuration (Route53 or external registrar)
7. Wait for verification (DNS propagation can take up to 72 hours)

### Email Address Verification

1. In Verified identities, create identity > Email address
2. Enter `noreply@student-support.ai`
3. Click the verification link sent to the email (or verify the domain above, which auto-verifies all addresses)

### Sending Authorization (Optional)

If SES is in sandbox mode:
1. Request production access via SES > Account > Sending statistics
2. Describe your use case (transactional emails for student support)

### Verified Sender

Once verified, the email address is set as `SES_FROM_EMAIL`.

---

## 7. Lambda Functions

### Common Configuration

- **Runtime**: Node.js 20.x
- **Architecture**: x86_64
- **Handler**: `index.handler` (the bundled output renames the main export)
- **Memory**: 512 MB (for most functions), 1024 MB (for chat/send-message and process-async)
- **Timeout**: 30 seconds (most), 2 minutes (chat/send-message and process-async)
- **IAM Role**: `ai-student-support-lambda-role` (see Section 10)
- **Environment variables**: All 22 env vars listed in `.env.example` must be set on every function

### All Lambda Functions (23 total)

**Note:** After building with `npm run build:all` in the `backend/` directory, each function produces a zip file in `backend/deployments/`. Each function is a separate file named after the handler.

Each function must be created as a separate Lambda function in the AWS Console. The handler name for every function is `main` (the exported handler), so the Handler field would be `index.main` (since esbuild outputs them as `index.js`).

To create each function:
1. Go to AWS Console > Lambda > Create function
2. Author from scratch
3. Function name: Use the naming convention below
4. Runtime: Node.js 20.x
5. Architecture: x86_64
6. Permissions: Use existing role `ai-student-support-lambda-role`
7. Create
8. Upload the zip file from `backend/deployments/{group}/{name}.zip`
9. Set the handler to `index.main`
10. Configure timeout and memory per the table below
11. Set all environment variables from `.env.example`

| # | Function Name | Source File | Memory | Timeout | Trigger |
|---|---------------|-------------|--------|---------|---------|
| 1 | `ai-student-auth-register` | `auth/register.ts` | 512 MB | 30s | API Gateway |
| 2 | `ai-student-auth-login` | `auth/login.ts` | 512 MB | 30s | API Gateway |
| 3 | `ai-student-auth-verify-email` | `auth/verify-email.ts` | 512 MB | 30s | API Gateway |
| 4 | `ai-student-auth-reset-password` | `auth/reset-password.ts` | 512 MB | 30s | API Gateway |
| 5 | `ai-student-auth-refresh-token` | `auth/refresh-token.ts` | 512 MB | 30s | API Gateway |
| 6 | `ai-student-auth-resend-verification-code` | `auth/resend-verification-code.ts` | 512 MB | 30s | API Gateway |
| 7 | `ai-student-chat-send-message` | `chat/send-message.ts` | 1024 MB | 120s | API Gateway |
| 8 | `ai-student-chat-get-conversations` | `chat/get-conversations.ts` | 512 MB | 30s | API Gateway |
| 9 | `ai-student-chat-get-conversation` | `chat/get-conversation.ts` | 512 MB | 30s | API Gateway |
| 10 | `ai-student-chat-delete-conversation` | `chat/delete-conversation.ts` | 512 MB | 30s | API Gateway |
| 11 | `ai-student-user-get-profile` | `user/get-profile.ts` | 512 MB | 30s | API Gateway |
| 12 | `ai-student-user-update-profile` | `user/update-profile.ts` | 512 MB | 30s | API Gateway |
| 13 | `ai-student-feedback-submit` | `feedback/submit-feedback.ts` | 512 MB | 30s | API Gateway |
| 14 | `ai-student-feedback-get` | `feedback/get-feedback.ts` | 512 MB | 30s | API Gateway |
| 15 | `ai-student-admin-list-users` | `admin/list-users.ts` | 512 MB | 30s | API Gateway |
| 16 | `ai-student-admin-manage-user` | `admin/manage-user.ts` | 512 MB | 30s | API Gateway |
| 17 | `ai-student-admin-get-analytics` | `admin/get-analytics.ts` | 512 MB | 30s | API Gateway |
| 18 | `ai-student-admin-system-health` | `admin/system-health.ts` | 512 MB | 30s | API Gateway |
| 19 | `ai-student-ai-process-async` | `ai/process-async.ts` | 1024 MB | 120s | SQS Trigger |
| 20 | `eduportal-knowledge-base-presign-upload` | `knowledge-base/presign-upload.ts` | 256 MB | 30s | API Gateway |
| 21 | `eduportal-knowledge-base-complete-upload` | `knowledge-base/complete-upload.ts` | 256 MB | 30s | API Gateway |
| 22 | `eduportal-knowledge-base-list-documents` | `knowledge-base/list-documents.ts` | 256 MB | 30s | API Gateway |
| 23 | `eduportal-knowledge-base-delete-document` | `knowledge-base/delete-document.ts` | 256 MB | 30s | API Gateway |

**Function 19 (process-async) special trigger:** Instead of API Gateway, this function is triggered by the SQS FIFO queue. In the Lambda console, add the SQS trigger:
- SQS queue: `ai-student-async-processing.fifo`
- Batch size: 5
- Enable trigger

---

## 8. API Gateway

### Create REST API

1. Navigate to AWS Console > API Gateway > Create API > REST API (not HTTP API)
2. Protocol: REST
3. Create new API: `ai-student-support-api`
4. Endpoint type: Regional
5. Create

### Resources and Methods

Create the following resource tree and attach each to its corresponding Lambda function with Lambda Proxy integration:

| Resource | Method | Lambda Function | Auth |
|----------|--------|-----------------|------|
| `/auth/register` | POST | `ai-student-auth-register` | None |
| `/auth/login` | POST | `ai-student-auth-login` | None |
| `/auth/verify-email` | POST | `ai-student-auth-verify-email` | None |
| `/auth/reset-password` | POST | `ai-student-auth-reset-password` | None |
| `/auth/refresh-token` | POST | `ai-student-auth-refresh-token` | None |
| `/chat/send` | POST | `ai-student-chat-send-message` | Cognito Authorizer |
| `/chat/conversations` | GET | `ai-student-chat-get-conversations` | Cognito Authorizer |
| `/chat/conversations/{id}` | GET | `ai-student-chat-get-conversation` | Cognito Authorizer |
| `/chat/conversations/{id}` | DELETE | `ai-student-chat-delete-conversation` | Cognito Authorizer |
| `/user/profile` | GET | `ai-student-user-get-profile` | Cognito Authorizer |
| `/user/profile` | PUT | `ai-student-user-update-profile` | Cognito Authorizer |
| `/feedback` | POST | `ai-student-feedback-submit` | Cognito Authorizer |
| `/feedback` | GET | `ai-student-feedback-get` | Cognito Authorizer |
| `/knowledge-base/documents` | GET | `eduportal-knowledge-base-list-documents` | Cognito Authorizer |
| `/knowledge-base/documents` | DELETE | `eduportal-knowledge-base-delete-document` | Cognito Authorizer (admin role in Lambda) |
| `/knowledge-base/presign-upload` | POST | `eduportal-knowledge-base-presign-upload` | Cognito Authorizer (admin role in Lambda) |
| `/knowledge-base/complete-upload` | POST | `eduportal-knowledge-base-complete-upload` | Cognito Authorizer (admin role in Lambda) |
| `/admin/users` | GET | `ai-student-admin-list-users` | Cognito Authorizer |
| `/admin/users/{id}` | PUT | `ai-student-admin-manage-user` | Cognito Authorizer |
| `/admin/analytics` | GET | `ai-student-admin-get-analytics` | Cognito Authorizer |
| `/admin/health` | GET | `ai-student-admin-system-health` | None |

### Cognito Authorizer

1. In API Gateway, go to Authorizers > Create authorizer
2. Authorizer name: `ai-student-support-cognito-authorizer`
3. Type: Cognito
4. Cognito user pool: Select the user pool created in Section 2
5. Token source: `Authorization`
6. Token validation: Unchecked (Lambda handles validation)

### CORS Configuration

Enable CORS on the API:
1. For each resource, Actions > Enable CORS
2. Access-Control-Allow-Origin: `*` (or your Amplify domain)
3. Access-Control-Allow-Methods: `GET,POST,PUT,DELETE,OPTIONS`
4. Access-Control-Allow-Headers: `Content-Type,Authorization,X-Correlation-Id`

### Deploy API

1. Actions > Deploy API
2. Stage: `v1`
3. Stage name: `v1`
4. Enable CloudWatch logging if desired
5. Note the **Invoke URL** (e.g., `https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/v1`)
6. This URL is the API base URL for the frontend

### Usage Plans (Optional)

1. Create a usage plan: `ai-student-support-plan`
2. Throttling: 1000 req/s, burst 2000
3. Quota: 1,000,000 requests per month
4. No API key required for this plan (authentication is via Cognito)

---

## 9. Amplify Hosting

### Create Amplify App

1. Navigate to AWS Console > Amplify > Create app
2. Deploy type: Host web app
3. Source code: GitHub (or another Git provider)
4. Select your repository and the `frontend/` directory
5. App name: `ai-student-support-frontend`

### Branch Settings

Connect the following branches:

| Branch | Environment |
|--------|-------------|
| `main` | Production |
| `develop` | Development |

### Build Settings

In the Amplify console, add `amplify.yml` (or create it in the repository root):

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: frontend/dist
    files:
      - "**/*"
  cache:
    paths:
      - node_modules/**/*
```

### Environment Variables

Set the following environment variables in the Amplify console for each branch:

| Variable | Description |
|----------|-------------|
| `PUBLIC_API_URL` | API Gateway invoke URL (e.g., `https://xxxxx.execute-api.us-east-1.amazonaws.com/v1`) |

### Domain (Optional)

1. In the Amplify console > Custom domains
2. Add your domain (e.g., `app.student-support.ai`)
3. Follow the DNS setup instructions (add a CNAME to Route53)
4. Amplify automatically provisions an SSL certificate

---

## 10. IAM Roles

### Lambda Execution Role

Create an IAM role named `ai-student-support-lambda-role` that all Lambda functions will use.

#### Trust Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

#### Managed Policies to Attach

1. `AWSLambdaBasicExecutionRole` — CloudWatch Logs access
2. `AWSLambdaSQSQueueExecutionRole` — SQS polling (for process-async function)

#### Inline / Custom Policy: `ai-student-support-policy`

Attach a customer-managed policy with the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoDBAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ai-student-users",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ai-student-conversations",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ai-student-messages",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ai-student-cache",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ai-student-feedback",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ai-student-analytics",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ai-student-audit-log",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ai-student-users/index/*",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ai-student-conversations/index/*",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ai-student-messages/index/*",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ai-student-cache/index/*",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ai-student-feedback/index/*",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ai-student-analytics/index/*",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ai-student-audit-log/index/*"
      ]
    },
    {
      "Sid": "BedrockAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:Retrieve",
        "bedrock:RetrieveAndGenerate"
      ],
      "Resource": "*"
    },
    {
      "Sid": "SQSAccess",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueUrl",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:us-east-1:ACCOUNT_ID:ai-student-async-processing.fifo"
    },
    {
      "Sid": "SNSAccess",
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "arn:aws:sns:us-east-1:ACCOUNT_ID:ai-student-support-alerts"
    },
    {
      "Sid": "SESAccess",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ses:FromAddress": "noreply@student-support.ai"
        }
      }
    },
    {
      "Sid": "CognitoAccess",
      "Effect": "Allow",
      "Action": [
        "cognito-idp:SignUp",
        "cognito-idp:InitiateAuth",
        "cognito-idp:ConfirmSignUp",
        "cognito-idp:ForgotPassword",
        "cognito-idp:ConfirmForgotPassword",
        "cognito-idp:ResendConfirmationCode",
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminUpdateUserAttributes"
      ],
      "Resource": "arn:aws:cognito-idp:us-east-1:ACCOUNT_ID:userpool/us-east-1_XXXXXXXXX"
    },
    {
      "Sid": "KnowledgeBaseS3Access",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::eduportal-azubi-success-knowledge-base",
        "arn:aws:s3:::eduportal-azubi-success-knowledge-base/*"
      ]
    },
    {
      "Sid": "CloudWatchMetrics",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    }
  ]
}
```

Replace `ACCOUNT_ID` with your AWS account ID and `us-east-1_XXXXXXXXX` with your actual Cognito user pool ID.

---

## 11. CloudWatch

### Log Groups

Lambda functions automatically create log groups named `/aws/lambda/{function-name}`. Log retention should be configured:

1. Navigate to AWS Console > CloudWatch > Log groups
2. For each function group (e.g., `/aws/lambda/ai-student-*`)
3. Actions > Edit retention
4. Set retention: 14 days (development) or 90 days (production)

### Metric Filters

Create metric filters on the log groups for monitoring:

**Error Count Filter:**
- Filter pattern: `ERROR`
- Metric namespace: `AIStudentSupport`
- Metric name: `ErrorCount`
- Value: 1

**Guardrail Triggered Filter:**
- Filter pattern: `guardrailTriggered`
- Metric namespace: `AIStudentSupport`
- Metric name: `GuardrailTriggers`
- Value: 1

### CloudWatch Dashboard

Create a dashboard `ai-student-support-dashboard` with the following widgets:

1. **Lambda Invocations** — Line graph of `AWS/Lambda Invocations` across all functions
2. **Lambda Errors** — Line graph of `AWS/Lambda Errors`
3. **Lambda Duration** — Line graph of `AWS/Lambda Duration` (p50 and p99)
4. **API Gateway Requests** — Line graph of `AWS/ApiGateway Count`
5. **API Gateway Latency** — Line graph of `AWS/ApiGateway Latency`
6. **DynamoDB Consumed Capacity** — Line graph of `AWS/DynamoDB ConsumedReadCapacityUnits` and `ConsumedWriteCapacityUnits`
7. **DynamoDB Throttled Requests** — Line graph of `AWS/DynamoDB ThrottledRequests`
8. **SQS Queue Depth** — Line graph of `AWS/SQS ApproximateNumberOfMessagesVisible`

### CloudWatch Alarms

| Alarm Name | Metric | Threshold | Action |
|------------|--------|-----------|--------|
| `ai-student-lambda-error-rate` | `Errors` / `Invocations` | > 1% for 5 min | Send to SNS topic |
| `ai-student-api-5xx-rate` | `5XXError` / `Count` | > 0.5% for 5 min | Send to SNS topic |
| `ai-student-dynamodb-throttles` | `ThrottledRequests` | > 0 for 5 min | Send to SNS topic |
| `ai-student-sqs-depth` | `ApproximateNumberOfMessagesVisible` | > 100 for 5 min | Send to SNS topic |
| `ai-student-lambda-duration` | `Duration` (p99) | > 80% of timeout for 5 min | Send to SNS topic |

Each alarm should:
- Period: 5 minutes
- Evaluation periods: 1 (to minimize false positives, set to 2 for production)
- Alarm actions: Publish to `ai-student-support-alerts` SNS topic
- OK actions: Same SNS topic (for recovery notifications)
