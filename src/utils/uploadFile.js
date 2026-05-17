// Uploads are performed via a backend-generated presigned URL.
// Use `VITE_API_URL` as the base (e.g. https://YOUR_API.execute-api.ap-south-1.amazonaws.com/prod)
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const GENERATE_UPLOAD_URL_API = `${API_BASE}/generate-upload-url`

// Validate API configuration at module load time
if (!API_BASE) {
  console.warn(
    'VITE_API_URL is not set. Upload functionality will not work. ' +
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

/**
 * Upload a file using a presigned URL.
 * 1) Ask backend for { uploadUrl, fileUrl }
 * 2) PUT the file bytes to uploadUrl
 * 3) Return fileUrl
 */
export async function uploadFile({ file, linkId, onProgress }) {
  if (!file) throw new Error('Please select a file first.')
  if (!linkId) throw new Error('Missing linkId.')

  if (!API_BASE) {
    throw new Error(
      'API base URL not configured. Please set the VITE_API_URL environment variable. ' +
      'Example: https://your-api.execute-api.aws.amazonaws.com/prod',
    )
  }

  const contentType = file.type || 'application/octet-stream'
  const requestBody = {
    fileName: file.name,
    contentType,
    linkId,
  }

  console.debug('[uploadFile] API_BASE:', API_BASE)
  console.debug('[uploadFile] Endpoint:', GENERATE_UPLOAD_URL_API)
  console.debug('[uploadFile] Request payload:', requestBody)

  console.log('Creating request for /generate-upload-url')
  console.log('Starting request')

  const createResp = await fetch(GENERATE_UPLOAD_URL_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  console.log('Request completed')

  console.log('4. Upload URL received')
  console.log('[uploadFile] generate-upload-url response:', {
    status: createResp.status,
    ok: createResp.ok,
  })

  if (!createResp.ok) {
    const body = await readResponseBody(createResp)
    console.error('[uploadFile] Failed response:', {
      status: createResp.status,
      statusText: createResp.statusText,
      endpoint: GENERATE_UPLOAD_URL_API,
      responseBody: body.text,
    })
    throw new Error(
      `Failed to get upload URL (${createResp.status}): ${body.text || createResp.statusText}. Endpoint: ${GENERATE_UPLOAD_URL_API}`,
    )
  }

  const responseBody = await readResponseBody(createResp)
  const data = responseBody.data && typeof responseBody.data === 'object' ? responseBody.data : {}
  const uploadUrl = data?.uploadUrl
  const fileUrl = data?.fileUrl

  if (!uploadUrl || !fileUrl) {
    console.error('[uploadFile] Invalid response:', data)
    throw new Error('Invalid response from generate-upload-url (missing uploadUrl/fileUrl).')
  }

  console.debug('[uploadFile] Presigned URL received, uploading file...')
  console.log('5. Starting S3 upload')

  // Upload file bytes to S3. XHR keeps progress events; error details are surfaced explicitly.
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)
    xhr.setRequestHeader('Content-Type', contentType)

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      const progress = Math.round((event.loaded / event.total) * 100)
      if (typeof onProgress === 'function') onProgress(progress)
    }

    xhr.onload = () => {
      console.debug('[uploadFile] S3 upload response:', {
        status: xhr.status,
        statusText: xhr.statusText,
        ok: xhr.status >= 200 && xhr.status < 300,
      })
      if (xhr.status >= 200 && xhr.status < 300) {
        if (typeof onProgress === 'function') onProgress(100)
        console.log('6. S3 upload complete')
        resolve(null)
        return
      }

      reject(
        new Error(
          `S3 upload failed (${xhr.status} ${xhr.statusText || 'Unknown status'}): ${xhr.responseText || 'No response body'}`,
        ),
      )
    }

    xhr.onerror = () => {
      reject(
        new Error(
          `S3 upload failed (network error) for ${file.name} with content-type ${contentType}`,
        ),
      )
    }

    xhr.onabort = () => reject(new Error(`S3 upload aborted for ${file.name}`))

    xhr.send(file)
  })

  return fileUrl
}
