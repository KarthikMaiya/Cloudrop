# Express Backend Experiment — Developer Reference

> **Status:** Experimental — Phase 1 (local only). Not deployed to production.
> **Branch:** `feature/express-backend-experiment`

---

## Purpose

Cloudrop is built on a serverless AWS architecture (API Gateway → Lambda → S3 + DynamoDB). This document describes an experimental **alternative backend** implemented using Node.js and Express — a conventional, continuously-running server — alongside the existing serverless implementation.

The goals of this experiment are:

1. **Architectural comparison** — understand the practical trade-offs between serverless and server-based backends for this type of workload.
2. **Interview demonstration** — provide a concrete, locally-runnable alternative implementation that demonstrates backend engineering skills beyond serverless configuration.
3. **Phase 2 preparation** — the Express server is the foundation for Docker containerisation and Kubernetes orchestration planned for Phase 2.

---

## Architecture Comparison

```
┌────────────────────────────────────────────────────────────────────────┐
│  ORIGINAL: Serverless Architecture (production)                        │
│                                                                        │
│  Browser (React + Vite)                                                │
│       │                                                                │
│       │ HTTPS REST                                                     │
│       ▼                                                                │
│  Amazon API Gateway                                                    │
│       │                                                                │
│       ▼                                                                │
│  AWS Lambda (Node.js)                                                  │
│       │                                                                │
│  ┌────┴────────────────┐                                               │
│  ▼                     ▼                                               │
│  Amazon S3         DynamoDB                                            │
│  (file storage)    (metadata)                                          │
│                                                                        │
│  Cleanup: DynamoDB TTL + Lambda (EventBridge/scheduled)                │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  EXPERIMENTAL: Express Architecture (Phase 1 — local only)            │
│                                                                        │
│  Browser (React + Vite)                                                │
│       │                                                                │
│       │ HTTP REST (localhost:3001)                                     │
│       ▼                                                                │
│  Node.js + Express Server  ←── server/.env (AWS credentials)          │
│       │                                                                │
│  ┌────┴────────────────┐                                               │
│  ▼                     ▼                                               │
│  Amazon S3         DynamoDB          ← SAME AWS resources as prod      │
│  (file storage)    (metadata)                                          │
│                                                                        │
│  Note: S3 presigned URLs still go Browser → S3 directly.              │
│        Express never proxies file bytes.                               │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Differences

| Aspect | Serverless (Lambda) | Express (Experimental) |
|---|---|---|
| Execution model | Event-driven, scales to zero | Continuously running process |
| Cold starts | Yes (mitigated by provisioned concurrency) | No |
| Cost model | Pay per invocation | Pay per compute hour |
| Operational complexity | Minimal (AWS managed) | Higher (process management, health checks) |
| Local development | Requires SAM/LocalStack or live API | `npm run dev` — instant local server |
| Kubernetes readiness | Requires adaptation | Native (containers, replicas, probes) |
| File upload pattern | Browser → presigned URL → S3 | **Same** — Express generates presigned URL; browser uploads directly |
| Cleanup | DynamoDB TTL + Lambda | DynamoDB TTL (same mechanism) |

---

## Backend Directory Structure

```
server/
├── .env.example          ← Template for AWS credentials and config
├── .gitignore            ← Keeps .env and node_modules out of git
├── jest.config.js        ← Jest configuration (ESM)
├── package.json
└── src/
    ├── server.js         ← Entry point — loads dotenv, starts HTTP server
    ├── app.js            ← Express app factory (imported by tests too)
    ├── config/
    │   ├── aws.js        ← AWS SDK v3 client singletons
    │   └── env.js        ← Environment variable config + startup validation
    ├── routes/
    │   ├── health.routes.js    ← GET /health
    │   ├── upload.routes.js    ← POST /generate-upload-url
    │   ├── files.routes.js     ← POST /save-link
    │   └── download.routes.js  ← GET /get-link/:linkId
    ├── controllers/
    │   ├── upload.controller.js
    │   ├── files.controller.js
    │   └── download.controller.js
    ├── services/
    │   ├── s3.service.js       ← Presigned URL generation
    │   └── dynamodb.service.js ← Metadata save/retrieve
    ├── middleware/
    │   ├── error.middleware.js      ← Centralised error handler
    │   └── validation.middleware.js ← Input sanitisation and validation
    └── utils/
        └── errors.js     ← AppError, NotFoundError, ValidationError, ConfigurationError
```

---

## Requirements

- **Node.js:** v18 or later (tested on v24.15.0)
- **npm:** v9 or later
- **AWS credentials:** configured via profile or environment variables
- **Existing AWS resources:** the same S3 bucket and DynamoDB table used by the production serverless stack

---

## Environment Setup

### 1. Configure the Express server

```bash
cd server
cp .env.example .env
# Edit .env — fill in S3_BUCKET, DYNAMODB_TABLE, AWS_REGION
```

**server/.env example:**

```env
AWS_REGION=ap-south-1
S3_BUCKET=your-cloudrop-bucket
DYNAMODB_TABLE=your-cloudrop-table
PORT=3001
CORS_ORIGIN=http://localhost:5173
UPLOAD_URL_EXPIRY_SECONDS=300
```

**AWS credentials (choose one approach):**

```bash
# Option A — named profile (recommended for local dev)
aws configure --profile cloudrop
# Then set in server/.env:
# AWS_PROFILE=cloudrop

# Option B — environment variables (CI/CD)
# AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
# Set these in server/.env or export them in your shell
```

> [!CAUTION]
> Never commit `server/.env`. It is gitignored. Never place credentials in the frontend `.env` file.

### 2. Configure the frontend

```bash
# In the project root:
cp .env.example .env
```

Edit `.env` and set:

```env
VITE_BACKEND_MODE=express
VITE_EXPRESS_URL=http://localhost:3001
```

---

## Running Locally

### Terminal 1 — Start the Express server

```bash
cd server
npm install
npm run dev
# Output:
# 🚀 Cloudrop Express server running
#    Port:    3001
#    CORS:    http://localhost:5173
#    Health:  http://localhost:3001/health
```

### Terminal 2 — Start the React frontend

```bash
# In the project root
npm install
npm run dev
# Vite dev server starts at http://localhost:5173
```

Open http://localhost:5173 in your browser. The frontend is now using the Express backend.

---

## Switching Between Backends

To switch backends, change `VITE_BACKEND_MODE` in your root `.env` file and restart the Vite dev server.

### Switch to Express (experimental)

```env
VITE_BACKEND_MODE=express
VITE_EXPRESS_URL=http://localhost:3001
```

```bash
npm run dev  # restart Vite
```

### Switch back to serverless (original)

```env
VITE_BACKEND_MODE=serverless
VITE_API_URL=https://your-api.execute-api.ap-south-1.amazonaws.com/prod
```

```bash
npm run dev  # restart Vite
```

No React component code changes are required. The `apiConfig.js` module resolves the correct base URL based on `VITE_BACKEND_MODE`.

---

## API Endpoint Reference

All endpoints match the existing API Gateway routes exactly — the frontend makes no distinction.

### `GET /health`

Liveness check. Returns JSON; does not expose credentials or configuration.

```json
{ "status": "ok", "service": "cloudrop-express", "timestamp": "..." }
```

---

### `POST /generate-upload-url`

Generates a presigned S3 PUT URL. The browser uses this URL to upload the file directly to S3. Express never receives file bytes.

**Request body:**

```json
{
  "linkId": "my-share-link",
  "fileName": "my-files.zip",
  "contentType": "application/zip"
}
```

**Response (200):**

```json
{
  "uploadUrl": "https://s3.amazonaws.com/bucket/uploads/...?X-Amz-...",
  "fileUrl":   "https://bucket.s3.ap-south-1.amazonaws.com/uploads/my-share-link/my-files.zip"
}
```

**Error responses:**

| Status | Cause |
|---|---|
| 400 | Missing/invalid `linkId` or `fileName` |
| 503 | `S3_BUCKET` not configured |
| 500 | Unexpected AWS error |

---

### `POST /save-link`

Saves file metadata to DynamoDB after a successful S3 upload.

**Request body:**

```json
{
  "linkId":       "my-share-link",
  "fileUrl":      "https://bucket.s3.ap-south-1.amazonaws.com/uploads/my-share-link/my-files.zip",
  "fileName":     "my-files.zip",
  "expiryMinutes": 10
}
```

**Response (200):**

```json
{ "success": true }
```

---

### `GET /get-link/:linkId`

Retrieves file metadata from DynamoDB for the download page.

**Response (200):**

```json
{
  "linkId":    "my-share-link",
  "fileUrl":   "https://bucket.s3.amazonaws.com/...",
  "fileName":  "my-files.zip",
  "expiresAt": 1720000000000,
  "createdAt": 1719999400000,
  "ttl":       1720000000
}
```

**Error responses:**

| Status | Cause |
|---|---|
| 404 | Link does not exist in DynamoDB |
| 503 | `DYNAMODB_TABLE` not configured |

---

## Testing

### Run backend tests

```bash
cd server
npm test
```

Tests use Jest with ESM support (`--experimental-vm-modules`). AWS calls are mocked — no real credentials needed for tests.

**Test coverage:**

| File | Coverage |
|---|---|
| `errors.test.js` | AppError, NotFoundError, ValidationError, ConfigurationError |
| `validation.test.js` | validateLinkId, validateFileName, validateContentType, validateExpiryMinutes |
| `health.test.js` | GET /health endpoint |
| `upload.controller.test.js` | POST /generate-upload-url (with mocked S3 service) |

### Run frontend lint

```bash
# In the project root
npm run lint
```

### Run frontend build

```bash
npm run build
```

---

## Security Considerations

- AWS credentials live only in `server/.env` (gitignored). They are never in frontend code or Vite env variables.
- The AWS SDK uses the default credential provider chain — named profile or IAM role preferred over static keys.
- Presigned URLs are never logged (they grant time-limited S3 write access).
- CORS is restricted to `CORS_ORIGIN` (configurable; defaults to `http://localhost:5173`).
- Rate limiting is applied globally (200 req/15 min) and specifically on `/generate-upload-url` (30 req/min).
- JSON body size is capped at 1 MB (the frontend never sends file bytes through Express).
- Input validation rejects invalid `linkId`, `fileName`, `contentType`, and `expiryMinutes` values before any AWS call.
- The error middleware never exposes stack traces or internal error details to the client.
- Possession of a `linkId` alone grants read access to the metadata — this matches the existing serverless design. Private/authenticated access is a planned future improvement.

---

## Expiry and Cleanup

File expiry is handled at two levels:

1. **DynamoDB TTL** — the `ttl` attribute (epoch seconds) is set on every `save-link` operation. DynamoDB automatically deletes expired items within ~48 hours. **This is the same mechanism used by the production serverless stack.**
2. **Frontend countdown** — the download page reads `expiresAt` (epoch milliseconds) and displays a live countdown. After expiry, the download button is disabled.
3. **S3 objects** — the Express server does not implement S3 object deletion. If the production Lambda/EventBridge cleanup job handles S3 deletion, that continues to operate independently. The Express backend does not conflict with it.

---

## Known Limitations

- The Express server is **local only** in Phase 1. It is not deployed, load balanced, or replicated.
- S3 bucket CORS must allow `PUT` from `http://localhost:5173` for presigned uploads to work. If you see a CORS error during upload, add `http://localhost:5173` to the S3 bucket CORS configuration.
- The DynamoDB table schema was inferred from frontend usage. If the production Lambda stores additional attributes (e.g. `uploadType`, `fileType`, `fileSize`), those will not be written by the Express backend in Phase 1. The download page will display gracefully without them.
- No authentication or access tokens are implemented — the design matches the existing public-link architecture.
- The `upload.controller.test.js` uses `jest.unstable_mockModule` for ESM mocking. If Jest reports issues, ensure you are running `node --experimental-vm-modules` (see `package.json` test script).

---

## Minimum AWS IAM Permissions

The AWS credentials used by the Express server require these minimum permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudropS3Presign",
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/uploads/*"
    },
    {
      "Sid": "CloudropDynamo",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem"
      ],
      "Resource": "arn:aws:dynamodb:ap-south-1:*:table/YOUR_TABLE_NAME"
    }
  ]
}
```

Replace `YOUR_BUCKET_NAME` and `YOUR_TABLE_NAME` with the actual resource names.

---

## Phase 2 Roadmap — Docker and Kubernetes

The following is planned for Phase 2 (not yet implemented):

1. **Dockerfile** — containerise the Express server with a multi-stage build.
2. **Container registry** — push image to Amazon ECR or Docker Hub.
3. **Kubernetes Deployment** — define a `Deployment` with configurable replicas.
4. **Kubernetes Service** — expose the Deployment via `ClusterIP` or `LoadBalancer`.
5. **Health probes** — configure `livenessProbe` and `readinessProbe` using `/health`.
6. **ConfigMap / Secret** — manage `AWS_REGION`, `S3_BUCKET`, `DYNAMODB_TABLE` via Kubernetes resources.
7. **Horizontal Pod Autoscaler** — scale replicas based on CPU/memory.
8. **Ingress** — expose externally via an Ingress controller with TLS.

The `/health` endpoint and graceful shutdown handler already built into the Express server are specifically designed to support these Kubernetes patterns.
