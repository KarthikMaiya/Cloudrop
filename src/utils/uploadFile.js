// Uploads are performed via a backend-generated presigned URL.
// Use `VITE_API_URL` as the base (e.g. https://YOUR_API.execute-api.ap-south-1.amazonaws.com/prod)
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const GENERATE_UPLOAD_URL_API = `${API_BASE}/generate-upload-url`

/**
 * Upload a file using a presigned URL.
 * 1) Ask backend for { uploadUrl, fileUrl }
 * 2) PUT the file bytes to uploadUrl
 * 3) Return fileUrl
 */
export async function uploadFile({ file, linkId, onProgress }) {
  if (!file) throw new Error('Please select a file first.')
  if (!linkId) throw new Error('Missing linkId.')

  const contentType = file.type || 'application/octet-stream'
  const requestBody = {
    fileName: file.name,
    contentType,
    linkId,
  }

  const createResp = await fetch(GENERATE_UPLOAD_URL_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!createResp.ok) {
    const text = await createResp.text().catch(() => '')
    throw new Error(
      `Failed to get upload URL (${createResp.status}): ${text || createResp.statusText}`,
    )
  }

  const data = await createResp.json()
  const uploadUrl = data?.uploadUrl
  const fileUrl = data?.fileUrl

  if (!uploadUrl || !fileUrl) {
    throw new Error('Invalid response from generate-upload-url (missing uploadUrl/fileUrl).')
  }

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
      if (xhr.status >= 200 && xhr.status < 300) {
        if (typeof onProgress === 'function') onProgress(100)
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
