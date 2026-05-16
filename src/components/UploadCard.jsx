import { useMemo, useRef, useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import './UploadCard.css'

const EXPIRY_OPTIONS = [
  { value: 2, label: '2 Minutes' },
  { value: 5, label: '5 Minutes' },
  { value: 10, label: '10 Minutes' },
]

function formatFileName(file) {
  if (!file) return ''
  return file.name
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1
  return `${value.toFixed(precision)} ${units[unitIndex]}`
}

export default function UploadCard({
  layout = 'standalone',
  selectedFiles,
  onFilesSelected,
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
  const expiryMenuRef = useRef(null)
  const expiryOptionRefs = useRef([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [copyState, setCopyState] = useState('')
  const [now, setNow] = useState(0)
  const [isExpiryOpen, setIsExpiryOpen] = useState(false)
  const [expiryActiveIndex, setExpiryActiveIndex] = useState(0)
  const safeSelectedFiles = useMemo(
    () => (Array.isArray(selectedFiles) ? selectedFiles : []),
    [selectedFiles],
  )

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

  const selectedFileSummary = useMemo(() => {
    if (!safeSelectedFiles.length) return 'No files selected'
    if (safeSelectedFiles.length === 1) return formatFileName(safeSelectedFiles[0])
    return `${formatFileName(safeSelectedFiles[0])} + ${safeSelectedFiles.length - 1} more`
  }, [safeSelectedFiles])

  const selectedFileCountLabel = useMemo(() => {
    if (!safeSelectedFiles.length) return 'No files selected'
    if (safeSelectedFiles.length === 1) return '1 file selected'
    return `${safeSelectedFiles.length} files selected`
  }, [safeSelectedFiles])

  const selectedTotalSizeLabel = useMemo(() => {
    if (!safeSelectedFiles.length) return '0 B total'
    const total = safeSelectedFiles.reduce((acc, current) => acc + (current?.size || 0), 0)
    return `${formatFileSize(total)} total`
  }, [safeSelectedFiles])

  const selectedExpiryIndex = useMemo(() => {
    const index = EXPIRY_OPTIONS.findIndex((option) => option.value === expiryMinutes)
    return index >= 0 ? index : 0
  }, [expiryMinutes])

  const selectedExpiryLabel = EXPIRY_OPTIONS[selectedExpiryIndex]?.label ?? '10 Minutes'

  const timeLeftLabel = useMemo(() => {
    if (!expiresAt || typeof expiresAt !== 'number') return 'Link expired'
    const remainingMs = expiresAt - now
    if (remainingMs <= 0) return 'Link expired'
    const totalSeconds = Math.ceil(remainingMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [expiresAt, now])

  function acceptFiles(fileListLike) {
    const rawFiles = Array.from(fileListLike || []).filter(Boolean)

    const normalized = rawFiles.map((f) => {
      // If already a metadata object produced by directory traversal
      if (f && f.file) return f

      // File from input or drop: preserve webkitRelativePath when available
      const fileObj = f
      return {
        file: fileObj,
        name: fileObj.name,
        size: fileObj.size,
        type: fileObj.type,
        relativePath: fileObj.webkitRelativePath || fileObj.name,
      }
    })

    onFilesSelected?.(normalized)
  }

  function closeExpiryMenu() {
    setIsExpiryOpen(false)
  }

  function openExpiryMenu() {
    setExpiryActiveIndex(selectedExpiryIndex)
    setIsExpiryOpen(true)
  }

  function selectExpiry(optionValue) {
    setExpiryMinutes(optionValue)
    closeExpiryMenu()
  }

  function onBrowseClick() {
    if (typeof window === 'undefined') return
    fileInputRef.current?.click()
  }

  function onFileInputChange(event) {
    const files = event.target.files || []
    acceptFiles(files)
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

    // Try to extract files preserving relative paths for folders
    async function extract() {
      const dt = event.dataTransfer
      if (dt && dt.items && dt.items.length) {
        try {
          const extracted = await filesFromDataTransferItems(dt.items)
          acceptFiles(extracted)
          return
        } catch {
          // Fallback to files list
        }
      }

      const files = dt.files || []
      acceptFiles(files)
    }

    void extract()
  }

  // Helpers to traverse DataTransferItemList and preserve directory structure
  function fileEntryToPromise(entry, path = '') {
    return new Promise((resolve, reject) => {
      if (entry.isFile) {
        entry.file((file) => {
          // Attach relativePath for later normalization
          file.relativePath = path + file.name
          resolve(file)
        }, reject)
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader()
        const entries = []

        const readEntries = () => {
          dirReader.readEntries((results) => {
            if (!results.length) {
              // resolve when no more entries
              Promise.all(entries.map((e) => fileEntryToPromise(e, path + entry.name + '/')))
                .then((arrs) => resolve(arrs.flat()))
                .catch(reject)
              return
            }
            entries.push(...results)
            readEntries()
          }, reject)
        }

        readEntries()
      } else {
        resolve([])
      }
    })
  }

  async function filesFromDataTransferItems(items) {
    const files = []
    const promises = []
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i]
      if (!item) continue
      const entry = item.webkitGetAsEntry && item.webkitGetAsEntry()
      if (entry) {
        promises.push(
          fileEntryToPromise(entry).then((res) => {
            if (Array.isArray(res)) files.push(...res)
            else if (res) files.push(res)
          }),
        )
      }
    }

    await Promise.all(promises)
    return files
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

  useEffect(() => {
    if (!isExpiryOpen) return undefined

    function handlePointerDown(event) {
      if (!expiryMenuRef.current?.contains(event.target)) {
        closeExpiryMenu()
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeExpiryMenu()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isExpiryOpen])

  useEffect(() => {
    if (!isExpiryOpen) return
    expiryOptionRefs.current[expiryActiveIndex]?.focus()
  }, [expiryActiveIndex, isExpiryOpen])

  function handleExpiryButtonKeyDown(event) {
    if (isUploading) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()

      if (!isExpiryOpen) {
        openExpiryMenu()
        return
      }

      if (event.key === 'ArrowDown') {
        setExpiryActiveIndex((current) => (current + 1) % EXPIRY_OPTIONS.length)
      }

      if (event.key === 'ArrowUp') {
        setExpiryActiveIndex((current) => (current - 1 + EXPIRY_OPTIONS.length) % EXPIRY_OPTIONS.length)
      }

      if (event.key === 'Enter' || event.key === ' ') {
        selectExpiry(EXPIRY_OPTIONS[expiryActiveIndex].value)
      }
    }
  }

  function handleExpiryOptionKeyDown(event, index) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setExpiryActiveIndex(() => (index + 1) % EXPIRY_OPTIONS.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setExpiryActiveIndex(() => (index - 1 + EXPIRY_OPTIONS.length) % EXPIRY_OPTIONS.length)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      setExpiryActiveIndex(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      setExpiryActiveIndex(EXPIRY_OPTIONS.length - 1)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectExpiry(EXPIRY_OPTIONS[index].value)
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
          aria-label="Drag and drop files to upload"
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
              Drag & drop your files here
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
          multiple
          hidden
          onChange={onFileInputChange}
          aria-label="File upload input"
        />

        <div className="fieldRow" aria-live="polite">
          <div className="fieldLabel">Selected files</div>
          <div className={safeSelectedFiles.length ? 'filePill' : 'filePill filePillEmpty'}>
            {selectedFileSummary}
          </div>
        </div>

        {safeSelectedFiles.length ? (
          <div className="filePreview" aria-live="polite">
            <div className="filePreviewHeader">
              <span className="filePreviewCount">{selectedFileCountLabel}</span>
              <span className="filePreviewSize">{selectedTotalSizeLabel}</span>
            </div>

            <ul className="filePreviewList" aria-label="Selected files">
              {safeSelectedFiles.map((file) => (
                <li key={`${file.name}-${file.size}-${file.lastModified}`} className="filePreviewItem">
                  <span className="filePreviewName" title={file.name}>{file.name}</span>
                  <span className="filePreviewMeta">{formatFileSize(file.size)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

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
          <span className="expiryLabel">Expiry</span>

          <div className="expiryDropdown" ref={expiryMenuRef}>
            <button
              className={isExpiryOpen ? 'expiryTrigger expiryTriggerOpen' : 'expiryTrigger'}
              type="button"
              onClick={() => (isExpiryOpen ? closeExpiryMenu() : openExpiryMenu())}
              onKeyDown={handleExpiryButtonKeyDown}
              disabled={isUploading}
              aria-haspopup="listbox"
              aria-expanded={isExpiryOpen}
              aria-label="Select link expiry"
            >
              <span className="expiryTriggerValue">{selectedExpiryLabel}</span>
              <span className="expiryTriggerIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M6 9l6 6 6-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>

            <div
              className={isExpiryOpen ? 'expiryMenu expiryMenuOpen' : 'expiryMenu'}
              role="listbox"
              aria-label="Expiry options"
            >
              {EXPIRY_OPTIONS.map((option, index) => {
                const isSelected = option.value === expiryMinutes
                const isActive = index === expiryActiveIndex

                return (
                  <button
                    key={option.value}
                    ref={(element) => {
                      expiryOptionRefs.current[index] = element
                    }}
                    type="button"
                    className={isSelected ? 'expiryOption expiryOptionSelected' : 'expiryOption'}
                    role="option"
                    aria-selected={isSelected}
                    data-active={isActive ? 'true' : 'false'}
                    tabIndex={isExpiryOpen ? 0 : -1}
                    onClick={() => selectExpiry(option.value)}
                    onKeyDown={(event) => handleExpiryOptionKeyDown(event, index)}
                  >
                    <span>{option.label}</span>
                    {isSelected ? <span className="expiryOptionCheck" aria-hidden="true">✓</span> : null}
                  </button>
                )
              })}
            </div>
          </div>

          <p className="helperText">Files will be permanently deleted after expiry.</p>
        </div>

        <button
          className="uploadButton"
          type="submit"
          disabled={!safeSelectedFiles.length || isUploading}
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
