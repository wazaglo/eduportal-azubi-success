# eduportal-azubi-success

AI-powered student support platform. Students ask academic questions and receive AI-generated responses.

Built as a serverless application on AWS. The frontend is a Qwik City SPA with mock data for standalone development.

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
