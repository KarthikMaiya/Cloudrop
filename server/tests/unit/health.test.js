/**
 * health.test.js — Tests for the GET /health endpoint
 */

import { createApp } from '../../src/app.js'

let app

beforeAll(() => {
  // Set required env vars to prevent startup warnings in test output
  process.env.S3_BUCKET = 'test-bucket'
  process.env.DYNAMODB_TABLE = 'test-table'
  process.env.AWS_REGION = 'ap-south-1'
  app = createApp()
})

describe('GET /health', () => {
  test('returns 200 with status ok', async () => {
    const response = await fetch(`http://127.0.0.1:0`)
      .catch(() => null)

    // Use in-process app testing via direct invocation
    const { createServer } = await import('http')
    const server = createServer(app)

    await new Promise((resolve) => server.listen(0, resolve))
    const port = server.address().port

    const res = await fetch(`http://127.0.0.1:${port}/health`)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.service).toBe('cloudrop-express')
    expect(typeof body.timestamp).toBe('string')

    await new Promise((resolve) => server.close(resolve))
  })
})
