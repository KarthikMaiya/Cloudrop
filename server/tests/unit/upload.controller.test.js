/**
 * upload.controller.test.js
 *
 * Tests POST /generate-upload-url with mocked S3 service.
 * No real AWS calls are made.
 */

import { createApp } from '../../src/app.js'
import { createServer } from 'http'

// ── Mock s3.service.js before importing app ────────────────────────────────
// We intercept the module so no AWS credentials are needed.
const mockGeneratePresignedUploadUrl = jest.fn()

jest.unstable_mockModule('../../src/services/s3.service.js', () => ({
  generatePresignedUploadUrl: mockGeneratePresignedUploadUrl,
}))

let app
let server
let port

beforeAll(async () => {
  process.env.S3_BUCKET = 'test-bucket'
  process.env.DYNAMODB_TABLE = 'test-table'
  process.env.AWS_REGION = 'ap-south-1'
  process.env.CORS_ORIGIN = 'http://localhost:5173'

  app = createApp()
  server = createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  port = server.address().port
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
})

afterEach(() => {
  mockGeneratePresignedUploadUrl.mockReset()
})

const BASE = () => `http://127.0.0.1:${port}`

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /generate-upload-url', () => {
  test('returns 200 with uploadUrl and fileUrl on valid request', async () => {
    mockGeneratePresignedUploadUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/presigned',
      fileUrl: 'https://s3.example.com/uploads/mylink/myfile.zip',
    })

    const res = await fetch(`${BASE()}/generate-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        linkId: 'my-link',
        fileName: 'myfile.zip',
        contentType: 'application/zip',
      }),
    })

    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveProperty('uploadUrl')
    expect(body).toHaveProperty('fileUrl')
  })

  test('returns 400 when linkId is missing', async () => {
    const res = await fetch(`${BASE()}/generate-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: 'file.zip', contentType: 'application/zip' }),
    })

    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body).toHaveProperty('error')
  })

  test('returns 400 when fileName is missing', async () => {
    const res = await fetch(`${BASE()}/generate-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkId: 'my-link', contentType: 'application/zip' }),
    })

    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body).toHaveProperty('error')
  })

  test('returns 400 when linkId sanitizes to empty string', async () => {
    const res = await fetch(`${BASE()}/generate-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkId: '---', fileName: 'file.zip', contentType: 'application/zip' }),
    })

    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body).toHaveProperty('error')
  })

  test('returns 503 when s3 service throws ConfigurationError', async () => {
    const { ConfigurationError } = await import('../../src/utils/errors.js')
    mockGeneratePresignedUploadUrl.mockRejectedValue(
      new ConfigurationError('S3_BUCKET is not configured.'),
    )

    const res = await fetch(`${BASE()}/generate-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        linkId: 'my-link',
        fileName: 'file.zip',
        contentType: 'application/zip',
      }),
    })

    expect(res.status).toBe(503)
  })
})
