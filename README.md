# Cloudrop (React + Vite)

Cloudrop is a small frontend for temporary cloud file sharing. The frontend uses a backend API to generate presigned upload URLs and to manage expiring links; it does not include any long-lived cloud credentials in the client.

Important: do NOT commit secrets. This repository's `.gitignore` excludes `.env` and `.env.*`. Provide runtime configuration via environment variables (see below).

How it works

- The frontend requests a presigned upload URL from your backend (`POST ${"${VITE_API_URL}"}/generate-upload-url`).
- The browser `PUT`s file bytes directly to S3 using the presigned URL (tracking upload progress on the client).
- After upload, the frontend tells the backend to save the link metadata (`POST ${"${VITE_API_URL}"}/save-link`).
- Downloads are served from the stored `fileUrl` returned by the backend.

Required environment variables

Create a `.env` (local, gitignored) and set:

```
VITE_API_URL=https://YOUR_API.execute-api.ap-south-1.amazonaws.com/prod
```

Notes:
- `VITE_API_URL` should be the full base URL of your API (including stage like `/prod`).
- The frontend will append `/generate-upload-url`, `/save-link`, and `/get-link/:id` as needed.

Setup & local development

1. Install dependencies:

```bash
npm install
```

2. Run dev server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

Deploying to Vercel

1. Create a new Vercel project from this repository.
2. In your Vercel project settings, add the environment variable `VITE_API_URL` with your API base URL.
3. Deploy — Vercel will run the build and serve the static site.

Note: If you update frontend code directly in the repository, trigger a fresh deploy
in Vercel (or push a version bump) to ensure the latest client bundle is served.

Security checklist (pre-deploy)

- Ensure `.env` is excluded from git and contains no committed secrets.
- Verify `VITE_API_URL` points to your API Gateway / backend — the frontend never needs AWS secret keys.
- Remove any debug panels or temporary test UI from the frontend before sharing.

Why this is safe for public repos

The frontend only requires a backend to provide presigned S3 upload URLs and to manage link metadata. The browser never needs AWS access keys; these must remain on the backend.

Additional resources

- Vite: https://vitejs.dev
- React: https://react.dev
- Vercel: https://vercel.com/docs

