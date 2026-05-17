const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const API_URL = `${API_BASE}/save-link`

// Validate API configuration at module load time
if (!API_BASE) {
  console.warn(
    'VITE_API_URL is not set. Save link functionality will not work. ' +
    'Please set VITE_API_URL in your environment (e.g., https://your-api.execute-api.aws.amazonaws.com/prod).',
  )
}

export async function saveLink({ linkId, fileUrl, fileName, expiryMinutes }) {
  if (!API_BASE) {
    throw new Error(
      'API base URL not configured. Please set the VITE_API_URL environment variable.',
    )
  }

  console.debug('[saveLink] Endpoint:', API_URL)
  console.debug('[saveLink] Payload:', { linkId, fileName, expiryMinutes })

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

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('[saveLink] Failed response:', {
      status: response.status,
      statusText: response.statusText,
      endpoint: API_URL,
      responseBody: text,
    })
    throw new Error(
      `saveLink failed (${response.status}): ${text || response.statusText}. Endpoint: ${API_URL}`,
    )
  }

  // Some API Gateway/Lambda setups may not return JSON.
  try {
    return await response.json()
  } catch {
    return null
  }
}