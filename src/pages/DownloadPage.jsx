import { Link, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import './DownloadPage.css'

function isExpired(expiresAt) {
  if (typeof expiresAt !== 'number') return true
  return Date.now() > expiresAt
}

function formatTimeLeft(expiresAt) {
  if (typeof expiresAt !== 'number') return 'Link expired'

  const remainingMs = expiresAt - Date.now()
  if (remainingMs <= 0) return 'Link expired'

  const totalSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let size = bytes / 1024
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

export default function DownloadPage() {
  const { linkId } = useParams()

  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(0)
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  useEffect(() => {
    const timerId = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    const initialUpdateId = window.setTimeout(() => {
      setNow(Date.now())
    }, 0)

    return () => {
      clearInterval(timerId)
      clearTimeout(initialUpdateId)
    }
  }, [])

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
  const timeLeftLabel = metadata ? formatTimeLeft(metadata.expiresAt) : 'Link expired'
  const timeLeftSeconds = metadata && typeof metadata.expiresAt === 'number'
    ? Math.max(0, Math.ceil((metadata.expiresAt - now) / 1000))
    : 0
  const warningState = !expired && timeLeftSeconds <= 60

  const fileSizeLabel = useMemo(
    () => formatFileSize(metadata?.fileSize ?? metadata?.size),
    [metadata],
  )

  async function handleDownload() {
    if (!metadata || expired) return

    try {
      const response = await fetch(metadata.fileUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')

      a.href = url
      a.download = metadata.fileName || 'download'
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
      <div className="downloadBackdrop" aria-hidden="true" />

      <header className="downloadHeader">
        <Link className="downloadTitle" to="/">
          Cloudrop
        </Link>

        <p className="downloadSubtitle">Temporary Cloud File Sharing</p>
      </header>

      <div className="downloadCard">
        {loading ? (
          <div className="downloadStateBlock">
            <p className="stateText">
              <span className="stateStrong">Loading your secure link...</span>
            </p>
          </div>
        ) : missing ? (
          <div className="downloadStateBlock">
            <p className="stateText">
              <span className="stateStrong">Link not found</span>
            </p>
          </div>
        ) : (
          <>
            <div className="downloadHero">
              <div className="fileBadge" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M7 2.75c0-.41.34-.75.75-.75h6.5c.2 0 .39.08.53.22l4.75 4.75c.14.14.22.33.22.53v13.5c0 .96-.79 1.75-1.75 1.75h-10c-.96 0-1.75-.79-1.75-1.75v-18.5Z"
                    fill="currentColor"
                    opacity="0.95"
                  />
                  <path
                    d="M14 2v4.25c0 .41.34.75.75.75H19"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="downloadHeroText">
                <p className="eyebrow">Secure temporary file</p>
                <h1 className="fileName">{metadata.fileName || 'Unknown file'}</h1>
                <div className="downloadMetaRow">
                  {fileSizeLabel ? <span>{fileSizeLabel}</span> : null}
                  <span>{expired ? 'Expired' : 'Ready to download'}</span>
                </div>
              </div>
            </div>

            <div className={warningState ? 'expiryPanel expiryPanelWarning' : 'expiryPanel'}>
              <div className="expiryLabel">Expiry</div>
              <div className="expiryValue">
                {expired ? 'Link expired' : `Expires in ${timeLeftLabel}`}
              </div>
              <div className="expiryHelper">
                {expired
                  ? 'This file is no longer available for download.'
                  : 'Download before the countdown reaches zero.'}
              </div>
            </div>

            <button
              className="downloadButton"
              onClick={handleDownload}
              disabled={expired}
              type="button"
            >
              <span className="downloadButtonIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M12 3.25c.41 0 .75.34.75.75v8.69l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0l-3.75-3.75a.75.75 0 0 1 1.06-1.06l2.47 2.47V4c0-.41.34-.75.75-.75Z"
                    fill="currentColor"
                  />
                  <path
                    d="M4.75 17.75c0-.41.34-.75.75-.75h13a.75.75 0 0 1 0 1.5h-13a.75.75 0 0 1-.75-.75Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              Download File
            </button>

            <div className="qrPanel">
              <div className="qrPanelHeader">
                <div>
                  <div className="qrLabel">Scan to open on another device</div>
                  <div className="qrHint">Share this link securely without copying it manually.</div>
                </div>
              </div>

              <div className="qrFrame">
                {shareUrl ? (
                  <QRCodeSVG
                    value={shareUrl}
                    size={126}
                    bgColor="transparent"
                    fgColor="currentColor"
                    level="M"
                    includeMargin={false}
                    className="qrCode"
                  />
                ) : null}
              </div>
            </div>

            <div className="returnCta">
              <div>
                <div className="returnQuestion">Want to share files too?</div>
                <div className="returnHint">Go back to Cloudrop and create a fresh secure link.</div>
              </div>
              <Link className="returnButton" to="/">
                Share Files
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
