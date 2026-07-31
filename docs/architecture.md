# System Architecture

## Overview

The AI-Powered Student Support System is a cloud-native, serverless application built on AWS. It provides students with an intelligent conversational assistant for academic and administrative inquiries.

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────┐
│                    Students / Users                        │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
              ┌────────────────────┐
              │   AWS CloudFront   │
              │   (CDN + WAF)     │
              └────────┬───────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
 ┌─────────────┐ ┌──────────────┐ ┌────────────────┐
 │  Amplify    │ │  API Gateway │ │  Cognito       │
 │  (Frontend) │ │  (REST API)  │ │  (Auth)        │
 └──────┬──────┘ └──────┬───────┘ └────────────────┘
        │                │
        │         ┌──────▼──────┐
        │         │ Lambda      │
        │         │ (Node.js 20)│
        │         └──────┬──────┘
        │                │
        │    ┌───────────┼───────────┐
        │    │           │           │
        │    ▼           ▼           ▼
        │ ┌────────┐ ┌───────┐ ┌──────────┐
        │ │DynamoDB│ │Bedrock│ │  SQS     │
        │ │(Primary│ │(AI    │ │(Async    │
        │ │ Store) │ │Guard) │ │ Processing)│
        │ └────────┘ └───────┘ └──────────┘
        │           │
        │      ┌────▼────┐
        │      │  SNS    │
        │      │(Alerts) │
        │      └─────────┘
        │
        ▼
   ┌──────────┐
   │   SES    │
   │(Emails)  │
   └──────────┘
```

## Data Flow

1. User sends message via Qwik frontend → CloudFront → API Gateway
2. API Gateway invokes Lambda with Cognito JWT authorizer
3. Lambda checks DynamoDB cache for existing answer (multi-layer strategy)
4. If cache miss, Lambda searches the S3 knowledge base for a relevant document (`knowledge/{level}/` prefix) and uses its content as context
5. If a KB document matches, its excerpt is returned as the answer and cached for reuse
6. Otherwise Lambda invokes Amazon Bedrock (Nova Lite for simple, Claude for complex)
7. Guardrails filter unsafe content before response reaches user
8. New response cached in DynamoDB for future reuse
9. Analytics event recorded in DynamoDB

## Component Descriptions

### Frontend (Qwik City)
- Server-rendered React-like framework with resumability
- Tailwind CSS v4 for styling
- Lucide-Qwik for icons
- Atomic design component structure
- Dark mode support via CSS variables
- Responsive mobile-first design

### API Gateway + Lambda
- REST API with 23 endpoints across 6 groups: Auth, Chat, User, Feedback, Knowledge Base, Admin
- Cognito User Pool authorizer for protected endpoints
- Rate limiting via API Gateway throttling
- Structured JSON logging
- Dead-letter queue for failed async processing

### DynamoDB Tables (8 tables)
- **Users**: `pk` (userId), `sk` (metadata), GSI1 for email lookups
- **Conversations**: `pk` (userId), `sk` (conversationId), GSI1 for query type
- **Messages**: `pk` (conversationId), `sk` (timestamp), GSI1 for userId
- **Cached Responses**: `pk` (queryHash), `sk` (queryType), TTL for expiry
- **Feedback**: `pk` (userId), `sk` (timestamp), GSI1 for rating
- **Analytics Events**: `pk` (date), `sk` (eventType), GSI1 for userId
- **Audit Log**: `pk` (userId), `sk` (timestamp), GSI1 for action type
- **Knowledge Documents**: `documentId` (HASH), GSIs `SubjectIndex` (subject → uploadedAt) and `YearIndex` (year → uploadedAt)

### S3 Knowledge Base
- Bucket: `eduportal-azubi-success-knowledge-base` (SSE-S3 AES-256, public access blocked)
- Key layout: `knowledge/{SHS1|SHS2|SHS3}/{Subject}/{Strand}/{Sub-Strand}/{file}`
- Seeds: 140 documents generated from NaCCA SHS curriculum covering the 6 core subjects
- Admin uploads via presigned PUT URLs; chat lookup scans `knowledge/{level}/` for matching content

### Bedrock Integration
- Abstract `AIProvider` interface decouples business logic from AI service
- `BedrockProvider` implements the interface using Nova Lite + Claude
- `ProviderFactory` enables swapping providers via environment variable
- Bedrock Guardrails filter harmful content (content policy, topic policy, word policy)
- Automatic fallback to Claude Haiku if Claude Sonnet fails

### Cost Optimization
- Multi-layer caching: DynamoDB cache → S3 knowledge base context → Bedrock
- Async processing via SQS for non-urgent AI responses
- Conversation summarization every 5 messages to reduce context length
- Intelligent model routing (Nova Lite for routine, Claude for complex)
- TTL-based cache expiry (24 hours)

### Monitoring & Observability
- CloudWatch Logs for all Lambda functions (14-day retention)
- CloudWatch Dashboard with API latency, error rates, cache hit ratio
- CloudWatch Alarms for Lambda errors, API 5xx, DynamoDB throttling
- SNS notifications for critical alerts
- Structured JSON logging with correlation IDs

## Security Architecture

- **Authentication**: Amazon Cognito with JWT tokens
- **Authorization**: Role-based access (Student, Admin) via Cognito groups
- **API Security**: Cognito authorizer on all protected endpoints, rate limiting
- **Data Encryption**: AES-256 at rest (DynamoDB SSE, S3 SSE)
- **Transport**: TLS 1.3 via CloudFront and API Gateway
- **Secrets**: No secrets in code - all via environment variables and AWS Systems Manager
- **IAM**: Least-privilege permissions for each Lambda function
- **Audit**: All actions logged to DynamoDB audit table

## Scalability Design

- **Lambda**: Auto-scales from 0 to thousands of concurrent executions
- **DynamoDB**: Pay-per-request billing, auto-scaling capacity
- **API Gateway**: Built-in throttling and auto-scaling
- **CloudFront**: Global edge network for frontend caching
- **SQS**: Decouples async processing, absorbs traffic spikes

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend Framework | Qwik | Resumability minimizes JS, SSR for SEO |
| Styling | Tailwind CSS v4 | Utility-first, consistent design system |
| Backend Runtime | Node.js 20 (Lambda) | Shared language with frontend TypeScript |
| Database | DynamoDB | Serverless, single-digit ms latency, scales automatically |
| AI Platform | Amazon Bedrock | Multi-model, guardrails, no vendor lock-in |
| Auth | Amazon Cognito | Managed, JWT-based, integrates with API Gateway |
| Async Processing | SQS | Decouples AI processing, handles spikes |
| Deployment | AWS Amplify | Git-based CI/CD for frontend, serverless for backend |