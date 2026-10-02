/**
 * health.test.js — Tests for the GET /health endpoint
 */

import { createServer } from 'http'
import { createApp } from '../../src/app.js'

let server
let port

beforeAll(async () => {
  // Set required env vars to prevent startup warnings in test output
  process.env.S3_BUCKET = 'test-bucket'
  process.env.DYNAMODB_TABLE = 'test-table'
  process.env.AWS_REGION = 'ap-south-1'

  const app = createApp()
  server = createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  port = server.address().port
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
})

describe('GET /health', () => {
  test('returns 200 with status ok', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/health`)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.service).toBe('cloudrop-express')
    expect(typeof body.timestamp).toBe('string')
  })

  test('responds with JSON content-type', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/health`)
    expect(res.headers.get('content-type')).toMatch(/application\/json/)
  })

  test('returns 404 for unknown routes', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/nonexistent-route`)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })
})
