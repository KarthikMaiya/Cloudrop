const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const API_URL = `${API_BASE}/save-link`
const REQUEST_TIMEOUT_MS = 15000

// Validate API configuration at module load time
if (!API_BASE) {
  console.warn(
    'VITE_API_URL is not set. Save link functionality will not work. ' +
    'Please set VITE_API_URL in your environment (e.g., https://your-api.execute-api.aws.amazonaws.com/prod).',
  )
}

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
      'API base URL not configured. Please set the VITE_API_URL environment variable.',
    )
  }

  console.debug('[saveLink] Endpoint:', API_URL)
  console.debug('[saveLink] Payload:', { linkId, fileName, expiryMinutes })

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
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
      signal: controller.signal,
    })

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
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(
        `saveLink timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds. Endpoint: ${API_URL}`,
        { cause: error },
      )
    }

    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}