# AWS Resources — Inventory

This document lists the AWS resources backing the platform and how they are provisioned. Account `814330181503`, region `eu-west-1`, profile `terrence`.

## 1. API Gateway

- REST API `kzhykroge1` (name **Students_API**), endpoint type regional
- Invoke URLs:
  - dev: `https://kzhykroge1.execute-api.eu-west-1.amazonaws.com/dev`
  - prod: `https://kzhykroge1.execute-api.eu-west-1.amazonaws.com/prod`
- **Cognito authorizer** on all routes except `/auth/*` and `OPTIONS`: authorizer `o9cesj` (`CognitoUserPoolAuthorizer`, type `COGNITO_USER_POOLS`, identity source `method.request.header.Authorization`, pool `eu-west-1_58jU3t3eE`). Clients send the Cognito **ID token** as `Authorization: Bearer <idToken>`; the Lambda reads the role from the users table via the `sub` claim.
- Access + execution logging enabled on the `dev` stage (log group `API-Gateway-Execution-Logs_kzhykroge1/dev`, 14-day retention), role `APIGatewayCloudWatchRole`.
- `OPTIONS` is a MOCK integration with CORS: origin `*`, methods `GET,POST,PUT,DELETE,OPTIONS`, headers `Content-Type,Authorization,X-Correlation-Id`

### Resources and Methods

| Resource | Method | Lambda |
|----------|--------|--------|
| `/ask` | POST | `eduportal-question-ask` |
| `/question` | GET | `eduportal-question-list` |
| `/question/{id}` | DELETE | `eduportal-question-delete` |
| `/FAQ` | GET | `eduportal-question-faq` |
| `/auth/register` | POST | `eduportal-auth-register` |
| `/auth/login` | POST | `eduportal-auth-login` |
| `/auth/verify-email` | POST | `eduportal-auth-verify-email` |
| `/auth/resend-verification-code` | POST | `eduportal-auth-resend-verification-code` |
| `/auth/reset-password` | POST | `eduportal-auth-reset-password` |
| `/auth/refresh-token` | POST | `eduportal-auth-refresh-token` |
| `/user/profile` | GET | `eduportal-user-get-profile` |
| `/user/profile` | POST | `eduportal-user-update-profile` |
| `/feedback` | GET | `eduportal-feedback-get-feedback` |
| `/feedback` | POST | `eduportal-feedback-submit-feedback` |
| `/knowledge-base/documents` | GET | `eduportal-knowledge-base-list-documents` |
| `/knowledge-base/documents` | DELETE | `eduportal-knowledge-base-delete-document` |
| `/knowledge-base/download-url` | GET | `eduportal-knowledge-base-get-download-url` |
| `/knowledge-base/presign-upload` | POST | `eduportal-knowledge-base-presign-upload` |
| `/knowledge-base/complete-upload` | POST | `eduportal-knowledge-base-complete-upload` |
| `/admin/users` | GET | `eduportal-admin-list-users` |
| `/admin/users/{id}` | PUT | `eduportal-admin-manage-user` |
| `/admin/analytics` | GET | `eduportal-admin-get-analytics` |
| `/admin/health` | GET | `eduportal-admin-system-health` |

## 2. Lambda Functions (23)

All functions use runtime `nodejs20.x`, x86_64, handler `{source-path}.main` (e.g., `question/ask.main`), and the shared IAM role `eduportal-lambda-role`. Default memory 256 MB / timeout 30s; `question/ask` is 1024 MB / 120s.

| Function | Source | Memory | Timeout |
|----------|--------|--------|---------|
| `eduportal-question-ask` | `question/ask.ts` | 1024 MB | 120s |
| `eduportal-question-list` | `question/list.ts` | 256 MB | 30s |
| `eduportal-question-delete` | `question/delete.ts` | 256 MB | 30s |
| `eduportal-question-faq` | `question/faq.ts` | 256 MB | 30s |
| `eduportal-auth-register` | `auth/register.ts` | 256 MB | 30s |
| `eduportal-auth-login` | `auth/login.ts` | 256 MB | 30s |
| `eduportal-auth-verify-email` | `auth/verify-email.ts` | 256 MB | 30s |
| `eduportal-auth-resend-verification-code` | `auth/resend-verification-code.ts` | 256 MB | 30s |
| `eduportal-auth-reset-password` | `auth/reset-password.ts` | 256 MB | 30s |
| `eduportal-auth-refresh-token` | `auth/refresh-token.ts` | 256 MB | 30s |
| `eduportal-user-get-profile` | `user/get-profile.ts` | 256 MB | 30s |
| `eduportal-user-update-profile` | `user/update-profile.ts` | 256 MB | 30s |
| `eduportal-feedback-get-feedback` | `feedback/get-feedback.ts` | 256 MB | 30s |
| `eduportal-feedback-submit-feedback` | `feedback/submit-feedback.ts` | 256 MB | 30s |
| `eduportal-knowledge-base-list-documents` | `knowledge-base/list-documents.ts` | 256 MB | 30s |
| `eduportal-knowledge-base-get-download-url` | `knowledge-base/get-download-url.ts` | 256 MB | 30s |
| `eduportal-knowledge-base-presign-upload` | `knowledge-base/presign-upload.ts` | 256 MB | 30s |
| `eduportal-knowledge-base-complete-upload` | `knowledge-base/complete-upload.ts` | 256 MB | 30s |
| `eduportal-knowledge-base-delete-document` | `knowledge-base/delete-document.ts` | 256 MB | 30s |
| `eduportal-admin-list-users` | `admin/list-users.ts` | 256 MB | 30s |
| `eduportal-admin-manage-user` | `admin/manage-user.ts` | 256 MB | 30s |
| `eduportal-admin-get-analytics` | `admin/get-analytics.ts` | 256 MB | 30s |
| `eduportal-admin-system-health` | `admin/system-health.ts` | 256 MB | 30s |

### Environment Variables (set on every function)

`TABLE_USERS=ai-student-users`, `TABLE_QUESTIONS=ai-student-questions`, `TABLE_CACHE=ai-student-cache`, `TABLE_ANALYTICS=ai-student-analytics`, `TABLE_FEEDBACK=ai-student-feedback`, `TABLE_KNOWLEDGE=ai-student-knowledge`, `CORS_ORIGIN`, `COGNITO_CLIENT_ID`, `COGNITO_USER_POOL_ID`, `KNOWLEDGE_BUCKET`, `AI_PROVIDER=bedrock`, `AI_MODEL_CHAIN`, `AI_DAILY_LIMIT`, `GEMINI_API_KEY`.

## 3. DynamoDB Tables (on-demand)

| Table | Key | GSIs | Provisioned by |
|-------|-----|------|----------------|
| `ai-student-users` | `userId` (HASH) | `EmailIndex`, `RoleIndex` | manual |
| `ai-student-questions` | `questionId` (HASH) | `UserQuestionsIndex` (`userId` + `createdAt`), PITR enabled | `infra/dynamodb.yml` |
| `ai-student-cache` | `cacheId` (HASH) | `QueryTypeIndex`, `HashIndex` | manual |
| `ai-student-analytics` | `eventId` (HASH) | `EventTypeIndex`, `UserEventsIndex` | manual |
| `ai-student-feedback` | `feedbackId` (HASH) | `UserFeedbackIndex`, `MessageFeedbackIndex` | manual |
| `ai-student-knowledge` | `documentId` (HASH) | `SubjectIndex`, `YearIndex` | manual |

The questions table is deployed from `infra/dynamodb.yml` (stack `eduportal-questions-table`).

## 4. S3 Knowledge Base

- Bucket: `eduportal-azubi-success-knowledge-base` (SSE-S3 AES-256, public access blocked)
- Layout: `knowledge/{Subject}/{Strand}/{Subject}-SHS{n}-{...}.txt`
- Content: 4 subjects (English Language, Core Mathematics, Integrated Science, Social Studies) — 108 parsed documents + 4 source PDFs in `knowledge/sources/`

## 5. Cognito

- User pool: `eu-west-1_58jU3t3eE` (name "User pool - b2thbc")
- App client: `5u2cc85m997rvttujel00a0ngd` (flows: `ALLOW_REFRESH_TOKEN_AUTH`, `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_USER_SRP_AUTH`; email auto-verified)
- Login/refresh via Cognito (`USER_PASSWORD_AUTH` / `REFRESH_TOKEN_AUTH`). API Gateway's Cognito authorizer accepts the **ID token**; the users table is keyed by the Cognito `sub`.

## 6. Monitoring (CloudWatch)

- API Gateway access + execution logging on the `dev` stage (log group `API-Gateway-Execution-Logs_kzhykroge1/dev`), IAM role `APIGatewayCloudWatchRole`
- Lambda log retention: 14 days on all `/aws/lambda/eduportal-*` groups
- SNS topic `eduportal-alerts` (email subscription: `wazaglo87@gmail.com`, requires confirmation)
- Alarms: `eduportal-ask-errors`, `eduportal-ask-duration-p95`, `eduportal-api-5xx-errors`, `eduportal-lambda-throttles`, `eduportal-dynamodb-throttles`
- Dashboard: `eduportal-monitoring`

## 7. IAM Roles

### `eduportal-lambda-role` (Lambda execution)
Trusts `lambda.amazonaws.com`. Inline policies:

| Policy | Scope |
|--------|-------|
| `EduportalDynamoDB` | `dynamodb:GetItem/PutItem/UpdateItem/DeleteItem/Query/Scan` on `ai-student-*` tables + indexes |
| `EduportalCloudWatchLogs` | Create log groups, put log events |
| `EduportalCognito` | Cognito auth actions on the user pool |
| `EduportalS3` | Get/Put/Delete objects in the knowledge base bucket |

### `eduportal-github-actions-oidc` (CI/CD)
Trusts GitHub's OIDC provider `token.actions.githubusercontent.com` for `repo:wazaglo/eduportal-azubi-success` (both the classic slug and the immutable-ID `repo:wazaglo@272252837/eduportal-azubi-success@1315937987` form, `aud` = `sts.amazonaws.com`). Permissions: Lambda create/update/delete, `iam:PassRole` on `eduportal-lambda-role`, DynamoDB table management, CloudWatch log retention.

OIDC provider: `token.actions.githubusercontent.com` (client `sts.amazonaws.com`), registered in IAM with GitHub's current thumbprint.
