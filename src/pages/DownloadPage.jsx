import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './DownloadPage.css'

function isExpired(expiresAt) {
  if (typeof expiresAt !== 'number') return true
  return Date.now() > expiresAt
}

export default function DownloadPage() {
  const { linkId } = useParams()

  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLink() {
      try {
        const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
        const response = await fetch(`${API_BASE}/get-link/${linkId}`)

        const data = await response.json()

        setMetadata(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    if (linkId) {
      fetchLink()
    }
  }, [linkId])

  const missing = !loading && !metadata
  const expired = metadata && isExpired(metadata.expiresAt)

  async function handleDownload() {
  try {
    const response = await fetch(metadata.fileUrl)

    const blob = await response.blob()

    const url = window.URL.createObjectURL(blob)

    const a = document.createElement('a')

    a.href = url

    a.download = metadata.fileName

    document.body.appendChild(a)

    a.click()

    a.remove()

    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error(error)
  }
}
  return (
    <section className="downloadShell" aria-label="Download">
      <header className="downloadHeader">
        <Link className="downloadTitle" to="/">
          Cloudrop
        </Link>

        <p className="downloadSubtitle">
          Temporary Cloud File Sharing
        </p>
      </header>

      <div className="downloadCard">
        {loading ? (
          <p className="stateText">
            Loading...
          </p>
        ) : missing ? (
          <p className="stateText">
            <span className="stateStrong">
              Link not found
            </span>
          </p>
        ) : expired ? (
          <p className="stateText">
            <span className="stateStrong">
              Link expired
            </span>
          </p>
        ) : (
          <>
            <div className="downloadMeta">
              <div className="metaLabel">
                File name
              </div>

              <div className="metaValue">
                {metadata.fileName || 'Unknown file'}
              </div>
            </div>
            <button
              className="downloadButton"
              onClick={handleDownload}
            >
              Download
            </button>
            <a
              className="downloadButton"
              href={metadata.fileUrl}
              download={metadata.fileName}
              
            >
              
              Download
            </a>
          </>
        )}
      </div>
    </section>
  )
}