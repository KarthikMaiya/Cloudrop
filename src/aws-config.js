import { S3Client } from '@aws-sdk/client-s3'

/**
 * AWS S3 client configuration.
 *
 * IMPORTANT (MVP note): This uses credentials directly in the frontend via
 * Vite env vars. Do NOT ship long-lived access keys in a real production app.
 * Prefer Cognito/STS (temporary credentials) or a backend-signed upload.
 */
export const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'ap-south-1'

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    // Store these in a local `.env` file (not committed).
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
})

export default s3Client