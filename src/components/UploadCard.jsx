import { useMemo, useRef, useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import './UploadCard.css'

function formatFileName(file) {
  if (!file) return ''
  return file.name
}

export default function UploadCard({
  layout = 'standalone',
  selectedFile,
  onFileSelected,
  customLink,
  onCustomLinkChange,
  expiryMinutes,
  setExpiryMinutes,
  onUpload,
  isUploading,
  uploadProgress,
  uploadStatus,
  shareUrl,
  expiresAt,
  uploadError,
}) {
  const fileInputRef = useRef(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [copyState, setCopyState] = useState('')
  const [now, setNow] = useState(0)

  useEffect(() => {
    if (!shareUrl || !expiresAt) return

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
  }, [shareUrl, expiresAt])

  const selectedFileName = useMemo(
    () => formatFileName(selectedFile),
    [selectedFile],
  )

  const timeLeftLabel = useMemo(() => {
    if (!expiresAt || typeof expiresAt !== 'number') return 'Link expired'
    const remainingMs = expiresAt - now
    if (remainingMs <= 0) return 'Link expired'
    const totalSeconds = Math.ceil(remainingMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [expiresAt, now])

  function acceptFile(file) {
    if (!file) return
    onFileSelected?.(file)
  }

  function onBrowseClick() {
    if (typeof window === 'undefined') return
    fileInputRef.current?.click()
  }

  function onFileInputChange(event) {
    const file = event.target.files?.[0] ?? null
    acceptFile(file)
  }

  function onDragEnter(event) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragActive(true)
  }

  function onDragOver(event) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragActive(true)
  }

  function onDragLeave(event) {
    event.preventDefault()
    event.stopPropagation()

    if (event.currentTarget.contains(event.relatedTarget)) return
    setIsDragActive(false)
  }

  function onDrop(event) {
    event.preventDefault()
    event.stopPropagation()
    setIsDragActive(false)

    const file = event.dataTransfer.files?.[0] ?? null
    acceptFile(file)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isUploading) return
    setCopyState('')
    await onUpload?.()
  }

  async function handleCopyLink() {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopyState('Copied!')
    } catch {
      // Fallback for older browsers / non-secure contexts.
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()

      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopyState(ok ? 'Copied!' : 'Copy failed')
    }
  }

  return (
    <section
      className={
        layout === 'embedded'
          ? 'uploadSection uploadSectionEmbedded'
          : 'uploadSection'
      }
      aria-label="Upload"
    >
      {layout !== 'embedded' ? (
        <div className="uploadHeader">
          <h1 className="uploadTitle">Cloudrop</h1>
          <p className="uploadSubtitle">Temporary Cloud File Sharing</p>
        </div>
      ) : null}

      <form className="uploadCard" onSubmit={handleSubmit}>
        <div
          className={
            isDragActive ? 'dropzone dropzoneActive' : 'dropzone'
          }
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
          onClick={onBrowseClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onBrowseClick()
          }}
          aria-label="Drag and drop a file to upload"
        >
          <div className="dropzoneIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M7.5 18.5h9.25c2.08 0 3.75-1.66 3.75-3.71 0-1.8-1.3-3.33-3.02-3.64-.44-2.9-2.97-5.15-6.05-5.15-2.61 0-4.86 1.6-5.75 3.88C3.6 10.22 2 11.94 2 14.05c0 2.45 2.02 4.45 4.5 4.45Z"
                fill="currentColor"
                opacity="0.9"
              />
              <path
                d="M12 11.25c.38 0 .7.3.7.67v5.11a.7.7 0 0 1-1.4 0v-5.1c0-.38.32-.68.7-.68Z"
                fill="currentColor"
              />
              <path
                d="M12 8.5c.2 0 .4.08.54.22l2.1 2.07a.64.64 0 0 1 0 .93.69.69 0 0 1-.96 0L12 10.1l-1.68 1.62a.69.69 0 0 1-.96 0 .64.64 0 0 1 0-.93l2.1-2.07c.14-.14.33-.22.54-.22Z"
                fill="currentColor"
              />
            </svg>
          </div>

          <div className="dropzoneText">
            <div className="dropzonePrimary">
              Drag & drop your file here
            </div>
            <div className="dropzoneSecondary">
              or <span className="dropzoneLink">browse</span> to select
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          className="fileInput"
          type="file"
          hidden
          onChange={onFileInputChange}
          aria-label="File upload input"
        />

        <div className="fieldRow" aria-live="polite">
          <div className="fieldLabel">Selected file</div>
          <div className={selectedFile ? 'filePill' : 'filePill filePillEmpty'}>
            {selectedFile ? selectedFileName : 'No file selected'}
          </div>
        </div>

        <label className="field">
          <span className="fieldLabel">Custom link</span>
          <div className="inputWithIcon">
            <span className="inputIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path
                  d="M10.6 13.4a1 1 0 0 1 1.4 0 3 3 0 0 0 4.2 0l2-2a3 3 0 0 0 0-4.2 3 3 0 0 0-4.2 0l-1 1a1 1 0 1 1-1.4-1.4l1-1a5 5 0 0 1 7 7l-2 2a5 5 0 0 1-7 0 1 1 0 0 1 0-1.4Z"
                  fill="currentColor"
                />
                <path
                  d="M13.4 10.6a1 1 0 0 1-1.4 0 3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 0 4.2 3 3 0 0 0 4.2 0l1-1A1 1 0 1 1 12.4 17l-1 1a5 5 0 0 1-7-7l2-2a5 5 0 0 1 7 0 1 1 0 0 1 0 1.4Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <input
              className="textInput"
              type="text"
              value={customLink}
              onChange={(e) => onCustomLinkChange?.(e.target.value)}
              placeholder="my-custom-link"
              autoComplete="off"
              inputMode="text"
            />
          </div>
        </label>

        <div className="expiryContainer">
          <label className="expiryLabel" htmlFor="expiryMinutes">
            Expiry
          </label>
          <select
            id="expiryMinutes"
            className="expirySelect"
            value={expiryMinutes}
            onChange={(e) =>
              setExpiryMinutes(Number(e.target.value))
            }
            disabled={isUploading}
          >
            <option value={2}>2 Minutes</option>
            <option value={5}>5 Minutes</option>
            <option value={10}>10 Minutes</option>
          </select>

          <p className="helperText">Files will be permanently deleted after expiry.</p>
        </div>

        <button
          className="uploadButton"
          type="submit"
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>

        {(isUploading || uploadStatus) && (
          <div className="progressWrapper">
            <div className="progressBar">
              <div
                className="progressFill"
                style={{
                  width: `${uploadProgress}%`,
                }}
              />
            </div>

            <p className="progressText">{uploadStatus}</p>
          </div>
        )}

        {shareUrl ? (
          <>
            <label className="field">
              <span className="fieldLabel">Share link</span>
              <div className="inputWithIcon">
                <input
                  className="textInput"
                  type="text"
                  value={shareUrl}
                  readOnly
                  onFocus={(e) => e.target.select()}
                  aria-label="Generated shareable link"
                />
              </div>
            </label>

            <button
              className="uploadButton"
              type="button"
              onClick={handleCopyLink}
              disabled={isUploading}
            >
              Copy link
            </button>

            <div className="sharePanel">
              <div className="sharePanelTimer">
                <div className="timerLabel">Expiry</div>
                <div className="timerValue">{timeLeftLabel}</div>
              </div>

              <div className="sharePanelQr">
                <div className="qrLabel">Scan to open on another device</div>
                <div className="qrFrame">
                  {shareUrl ? (
                    <QRCodeSVG
                      value={shareUrl}
                      size={120}
                      bgColor="transparent"
                      fgColor="currentColor"
                      level="M"
                      includeMargin={false}
                      className="qrCode"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {uploadError ? (
          <p className="helperText" role="alert">
            {uploadError}
          </p>
        ) : null}

        {copyState ? (
          <p className="helperText" aria-live="polite">
            {copyState}
          </p>
        ) : null}

        <p className="helperText">Links expire automatically after {expiryMinutes} minutes</p>
      </form>
    </section>
  )
}
