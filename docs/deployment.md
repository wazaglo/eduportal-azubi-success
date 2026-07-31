# Deployment Guide — Manual AWS Workflow

This document describes the step-by-step process for deploying the AI-Powered Student Support System to AWS without Infrastructure as Code. All resources are created manually via the AWS Management Console.

---

## 1. Prerequisites

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >= 20.x LTS | Runtime |
| npm | >= 10.x | Package manager |
| AWS CLI | >= 2.x | Uploading Lambda zips, verifying resources |
| Git | >= 2.x | Version control |

Install Node.js via [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm):

```bash
nvm install 20
nvm use 20
```

Configure AWS CLI:

```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, region (us-east-1), and output format (json)
```

### AWS Account

An AWS account with ability to create the following resources:

- DynamoDB tables
- Cognito user pools
- Lambda functions
- API Gateway REST APIs
- SQS queues
- SNS topics
- SES identities
- IAM roles and policies
- CloudWatch log groups, dashboards, and alarms
- Amplify apps
- Bedrock model access

---

## 2. Provision AWS Resources

Before deploying any code, all AWS infrastructure must be created manually.

Follow the complete guide at **[docs/aws-resources.md](aws-resources.md)** to provision:

1. **DynamoDB** — 8 tables with GSIs (including `ai-student-knowledge`)
2. **S3** — knowledge base bucket `eduportal-azubi-success-knowledge-base`
3. **Cognito** — User pool, app client, domain
4. **Bedrock** — Model access, guardrails (optional)
5. **SQS** — FIFO queue + DLQ
6. **SNS** — Alert topic + email subscription
7. **SES** — Domain/email verification
8. **IAM** — Lambda execution role with full policy (including S3 knowledge base access)
9. **Lambda** — 23 functions (created after builds)
10. **API Gateway** — REST API with Cognito authorizer
11. **Amplify** — Frontend hosting app

> **Important:** Resource creation order matters — IAM roles and DynamoDB tables must exist before Lambda functions. All resources listed above must be created before proceeding to Step 3.

---

## 3. Build Lambda Bundles

```bash
cd backend
npm install
npm run build:all
```

This runs the esbuild bundler, producing one zip file per Lambda function in `backend/deployments/`:

```
backend/deployments/
├── auth/
│   ├── register.zip
│   ├── login.zip
│   ├── verify-email.zip
│   ├── reset-password.zip
│   ├── refresh-token.zip
│   └── resend-verification-code.zip
├── chat/
│   ├── send-message.zip
│   ├── get-conversations.zip
│   ├── get-conversation.zip
│   └── delete-conversation.zip
├── user/
│   ├── get-profile.zip
│   └── update-profile.zip
├── feedback/
│   ├── submit-feedback.zip
│   └── get-feedback.zip
├── knowledge-base/
│   ├── presign-upload.zip
│   ├── complete-upload.zip
│   ├── list-documents.zip
│   └── delete-document.zip
├── admin/
│   ├── list-users.zip
│   ├── manage-user.zip
│   ├── get-analytics.zip
│   └── system-health.zip
└── ai/
    └── process-async.zip
```

---

## 4. Upload Lambda Zip Files

For each of the 23 Lambda functions:

1. Navigate to AWS Console > Lambda > [function name]
2. Go to the **Code** tab
3. Click **Upload from** > `.zip file`
4. Select the appropriate zip from `backend/deployments/{group}/{name}.zip`
5. Set the **Handler** field to: `index.main`
6. Click **Save**

**Lambda configuration per function** (refer to aws-resources.md for exact memory/timeout per function):

| Setting | Value |
|---------|-------|
| Runtime | Node.js 20.x |
| Architecture | x86_64 |
| Handler | `index.main` |
| Memory | 512 MB (most) / 1024 MB (send-message, process-async) / 256 MB (knowledge-base) |
| Timeout | 30s (most) / 120s (send-message, process-async) |
| IAM Role | `ai-student-support-lambda-role` |

**Set environment variables** for each function (all variables from `.env.example`).

For the **process-async** function only, add an SQS trigger:
1. Go to the function > Configuration > Triggers > Add trigger
2. Select SQS
3. Choose the `ai-student-async-processing.fifo` queue
4. Batch size: 5

---

## 5. Configure API Gateway Endpoints

1. Navigate to AWS Console > API Gateway > `ai-student-support-api`
2. Create resources and methods as described in [aws-resources.md Section 8](aws-resources.md#8-api-gateway)
3. For each method, configure:
   - **Integration type**: Lambda Function
   - **Lambda proxy**: Enabled (checked)
   - **Lambda function**: Select the corresponding function
   - **Default timeout**: Use the Lambda timeout value
4. Enable CORS for each resource
5. Deploy the API:
   - Actions > Deploy API
   - Deployment stage: `v1`
   - Stage name: `v1`
   - Note the **Invoke URL**: `https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/v1`

---

## 6. Configure Cognito Authorizer on API Gateway

1. In API Gateway > Authorizers > Create authorizer
2. Name: `ai-student-support-cognito-authorizer`
3. Type: Cognito
4. Cognito user pool: Select the pool created in Step 2
5. Token source: `Authorization`
6. Create
7. For each protected method (all except auth and health), select the method, go to **Method Request**, and set **Authorization** to the Cognito authorizer

---

## 7. Configure Amplify App

1. In AWS Console > Amplify > Create app
2. Connect to your GitHub repository
3. App name: `ai-student-support-frontend`
4. Select the `main` branch for production
5. Use the following build settings:

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

6. Set environment variables:

| Variable | Value |
|----------|-------|
| `PUBLIC_API_URL` | API Gateway Invoke URL (from Step 5) |

7. Save and deploy

---

## 8. Set Environment Variables

### Lambda Functions (23 total)

Every Lambda function must have the same set of environment variables. In the Lambda console, under Configuration > Environment variables, set all variables from `.env.example`.

Key variables to configure:

| Variable | How to get the value |
|----------|---------------------|
| `AWS_REGION` | Your deployment region (e.g., `eu-west-1`) |
| `TABLE_USERS` through `TABLE_KNOWLEDGE` | DynamoDB table names you created |
| `COGNITO_USER_POOL_ID` | Cognito console > User pool ID |
| `COGNITO_CLIENT_ID` | Cognito console > App client ID |
| `JWT_SECRET` | Generate a random string (e.g., `openssl rand -hex 32`) |
| `SES_FROM_EMAIL` | The verified SES email address |
| `SNS_ALERT_TOPIC_ARN` | SNS topic ARN |
| `ASYNC_QUEUE_URL` | SQS queue URL |
| `AI_PROVIDER` | `bedrock` |
| `BEDROCK_GUARDRAIL_ID` | (Optional) Guardrail ID |
| `KNOWLEDGE_BUCKET` | S3 knowledge base bucket name (`eduportal-azubi-success-knowledge-base`) |
| `CORS_ORIGIN` | Amplify app URL (e.g., `https://dev.xxxxx.amplifyapp.com`) |

### Amplify App

Set `PUBLIC_API_URL` in the Amplify console environment variables for each branch.

---

## 9. Test the Deployment

### Backend Smoke Test

```bash
# Health check
curl https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/v1/admin/health

# Expected response:
# {"success":true,"data":{"status":"healthy",...}}
```

### Frontend Verification

1. Open the Amplify app URL in a browser
2. Register a new account
3. Verify the email
4. Log in
5. Start a chat conversation
6. Verify the AI responds

### Common Issues

| Issue | Solution |
|-------|----------|
| Lambda returns 502 | Check CloudWatch logs for the function; verify env vars are set |
| Cognito auth fails | Verify user pool ID and client ID match exactly |
| API returns 403 | Check the Cognito authorizer is correctly attached to the method |
| Amplify build fails | Check build log; ensure `npm ci` succeeds |
| SQS trigger not firing | Verify the queue's resource policy allows Lambda invocation |
| DynamoDB query fails | Verify table names match env vars; check GSIs are created |
