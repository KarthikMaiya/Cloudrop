import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { loadLinkMetadata } from '../utils/linkStorage'
import './DownloadPage.css'

function isExpired(expiresAt) {
  if (typeof expiresAt !== 'number') return true
  return Date.now() > expiresAt
}

export default function DownloadPage() {
  const { linkId } = useParams()

  const metadata = useMemo(() => {
    return loadLinkMetadata(linkId)
  }, [linkId])

  const missing = !linkId || !metadata
  const expired = !missing && isExpired(metadata.expiresAt)

  return (
    <section className="downloadShell" aria-label="Download">
      <header className="downloadHeader">
        <Link className="downloadTitle" to="/">
          Cloudrop
        </Link>
        <p className="downloadSubtitle">Temporary Cloud File Sharing</p>
      </header>

      <div className="downloadCard">
        {missing ? (
          <p className="stateText">
            <span className="stateStrong">Link not found</span>
          </p>
        ) : expired ? (
          <p className="stateText">
            <span className="stateStrong">Link expired</span>
          </p>
        ) : (
          <>
            <div className="downloadMeta">
              <div className="metaLabel">File name</div>
              <div className="metaValue">{metadata.fileName || 'Unknown file'}</div>
            </div>

            <a
              className="downloadButton"
              href={metadata.url}
              target="_blank"
              rel="noreferrer"
            >
              Download
            </a>
          </>
        )}
      </div>
    </section>
  )
}
