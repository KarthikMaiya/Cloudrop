const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const API_URL = `${API_BASE}/save-link`

export async function saveLink({ linkId, fileUrl, fileName, expiryMinutes }) {
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
    throw new Error(
      `saveLink failed (${response.status}): ${text || response.statusText}`,
    )
  }

  // Some API Gateway/Lambda setups may not return JSON.
  try {
    return await response.json()
  } catch {
    return null
  }
}