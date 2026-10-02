// API base URL is resolved by apiConfig.js based on VITE_BACKEND_MODE.
import { API_BASE } from './apiConfig.js'
const API_URL = `${API_BASE}/save-link`

async function readResponseBody(response) {
  const text = await response.text().catch(() => '')

  if (!text) return { text: '', data: null }

  try {
    return { text, data: JSON.parse(text) }
  } catch {
    return { text, data: text }
  }
}

export async function saveLink({ linkId, fileUrl, fileName, expiryMinutes }) {
  if (!API_BASE) {
    throw new Error(
      'API base URL not configured. ' +
      'Serverless mode: set VITE_API_URL. Express mode: set VITE_BACKEND_MODE=express and VITE_EXPRESS_URL.',
    )
  }

  console.debug('[saveLink] Endpoint:', API_URL)
  console.debug('[saveLink] Payload:', { linkId, fileName, expiryMinutes })
  console.log('Creating request for /save-link')
  console.log('Starting request')

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      linkId,
      fileUrl,
      fileName,
      expiryMinutes,
    }),
  })

  console.log('Request completed')

  const body = await readResponseBody(response)
  console.debug('[saveLink] Response:', {
    status: response.status,
    ok: response.ok,
    endpoint: API_URL,
    responseBody: body.text,
  })

  if (!response.ok) {
    console.error('[saveLink] Failed response:', {
      status: response.status,
      statusText: response.statusText,
      endpoint: API_URL,
      responseBody: body.text,
    })
    throw new Error(
      `saveLink failed (${response.status}): ${body.text || response.statusText}. Endpoint: ${API_URL}`,
    )
  }

  // Some API Gateway/Lambda setups may not return JSON.
  return body.data
}