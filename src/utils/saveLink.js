const API_URL =
  'https://ndr7vjmp6d.execute-api.ap-south-1.amazonaws.com/prod/save-link'

export async function saveLink({ linkId, fileUrl, fileName, expiresAt }) {
  const payload = { linkId, fileUrl, fileName, expiresAt }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
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