# Deployment Guide

## 1. Prerequisites

- Node.js 20 LTS, npm
- AWS CLI configured (`aws configure`) with a profile that can manage Lambda, API Gateway, IAM, DynamoDB, and CloudWatch
- Git access to the repo (`git@github.com:wazaglo/eduportal-azubi-success.git`)
- `gh` CLI (for triggering/debugging GitHub Actions)

## 2. CI/CD (Primary Path)

The backend is deployed automatically by GitHub Actions. See `.github/workflows/deploy-backend.yml`:

1. **Triggers**: push to `dev` or `main` with `backend/**` changes, or `workflow_dispatch`.
2. **Job `lint-and-test`**: `npm ci` → `npm run typecheck` → `npm test` (vitest).
3. **Job `deploy`** (needs lint-and-test):
   - `npm run build` (esbuild) and `npm run package` (one zip per handler)
   - Assumes the `eduportal-github-actions-oidc` IAM role via GitHub OIDC (`aws-actions/configure-aws-credentials@v4`) — **no long-lived AWS keys**
   - Creates or updates all 23 `eduportal-*` Lambda functions from `backend/deployments/**/*.zip`
   - Sets the Lambda environment (table names, Cognito IDs, `CORS_ORIGIN`, `KNOWLEDGE_BUCKET`) from GitHub secrets — no hardcoded values
   - `question/ask` is deployed at 120s / 1024MB; all others 30s / 256MB

```bash
# Trigger manually on a branch
gh workflow run "Deploy Backend" --repo wazaglo/eduportal-azubi-success --ref dev

# Watch a run
gh run watch <run-id> --repo wazaglo/eduportal-azubi-success --exit-status
```

The OIDC trust policy is scoped to `repo:wazaglo@272252837/eduportal-azubi-success@1315937987` (and the classic slug) on `dev`/`main`. The long-lived `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` secrets have been removed; `ROLE_ARN` is retained for reference only.

## 3. Manual Build & Deploy (Fallback)

```bash
cd backend
npm install
npm run build:all     # esbuild bundle -> dist/, zip -> deployments/
```

This produces `backend/deployments/{group}/{name}.zip` (e.g., `deployments/question/ask.zip`, 23 handlers in total).

Deploy loop (equivalent of the CI deploy step):

```bash
export AWS_PROFILE=terrence AWS_REGION=eu-west-1
shopt -s globstar
for zip in backend/deployments/**/*.zip; do
  handler_path="${zip#backend/deployments/}"; handler_path="${handler_path%.zip}"
  fn="eduportal-${handler_path////-}"
  timeout=30; memory=256
  [ "$handler_path" = "question/ask" ] && timeout=120 && memory=1024
  aws lambda update-function-code --function-name "$fn" --zip-file "fileb://${zip}" --region "$AWS_REGION" >/dev/null
  aws lambda update-function-configuration --function-name "$fn" \
    --handler "${handler_path}.main" --timeout "$timeout" --memory-size "$memory" \
    --environment "file:///tmp/lambda-env.json" --region "$AWS_REGION" >/dev/null
done
```

The handler for each zip is `{path}.main` (e.g., `question/ask.main`). Retry on `ResourceConflictException` when Lambda reports an update already in progress.

## 4. Environment Variables

| Variable | Value |
|----------|-------|
| `TABLE_USERS` … `TABLE_KNOWLEDGE` | `ai-student-users`, `ai-student-questions`, `ai-student-cache`, `ai-student-analytics`, `ai-student-feedback`, `ai-student-knowledge` |
| `CORS_ORIGIN` | `*` (dev) |
| `COGNITO_USER_POOL_ID` | e.g., `eu-west-1_58jU3t3eE` |
| `COGNITO_CLIENT_ID` | e.g., `5u2cc85m997rvttujel00a0ngd` |
| `KNOWLEDGE_BUCKET` | `eduportal-azubi-success-knowledge-base` |
| `AI_PROVIDER` | `openai` |
| `OPENAI_MODEL` | `gpt-4o-mini` |
| `OPENAI_API_KEY` | GitHub secret, injected by CI/CD |

Values are set as GitHub secrets (`CORS_ORIGIN`, `COGNITO_CLIENT_ID`, `COGNITO_USER_POOL_ID`, `KNOWLEDGE_BUCKET`, `OPENAI_API_KEY`) and injected into the Lambda environment by the deploy workflow — no hardcoded values in the workflow.

## 5. Frontend (Amplify)

- AWS Amplify connects to the GitHub repo; `frontend/` builds to `frontend/dist`.
- Set `PUBLIC_API_URL` to the API Gateway invoke URL per branch.
- Build settings run `npm ci` then `npm run build` with `baseDirectory: frontend/dist`.

## 6. Smoke Test

```bash
API=https://kzhykroge1.execute-api.eu-west-1.amazonaws.com/dev

# login -> Cognito tokens; use the ID token for API calls
LOGIN=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"e2e1785501265408@azubi.success","password":"Test@12345"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['tokens']['idToken'])")

# ask (question domain)
curl -s -X POST "$API/ask" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"question":"What is photosynthesis in plants?"}'

# list / FAQ / delete
curl -s "$API/question" -H "Authorization: Bearer $TOKEN"
curl -s "$API/FAQ" -H "Authorization: Bearer $TOKEN"
curl -s -X DELETE "$API/question/<id>" -H "Authorization: Bearer $TOKEN"
```

## 7. Monitoring (CloudWatch)

- API Gateway access + execution logs on `dev` (`API-Gateway-Execution-Logs_kzhykroge1/dev`, 14-day retention)
- Lambda log retention 14 days on all `/aws/lambda/eduportal-*` groups
- Alarms → SNS `eduportal-alerts`: `eduportal-ask-errors`, `eduportal-ask-duration-p95`, `eduportal-api-5xx-errors`, `eduportal-lambda-throttles`, `eduportal-dynamodb-throttles`
- Dashboard: `eduportal-monitoring`

## Common Issues

| Issue | Solution |
|-------|----------|
| CI fails at "Configure AWS credentials (OIDC)" | Check the OIDC trust policy `sub` matches GitHub's immutable-ID claim (`repo:owner@orgid/repo@repid:*`) and `id-token: write` is set |
| CI fails at "Deploy all Lambda functions" | `ResourceConflictException` — order code-before-config and retry with a `LastUpdateStatus` poll |
| Lambda returns 502 | Check CloudWatch logs; verify env vars are set on the function |
| API returns 401 with `{"message":"Unauthorized"}` | API Gateway authorizer rejected the token — send the Cognito **ID token** (`tokens.idToken`), not the access token |
| Login returns "Initiate Auth method not supported" | The auth flow is `USER_PASSWORD_AUTH` — it must go through `InitiateAuth`, not `AdminInitiateAuth` |
