import './App.css'

import Navbar from './components/Navbar'
import UploadCard from './components/UploadCard'
import { uploadFile } from './utils/uploadFile'
import DownloadPage from './pages/DownloadPage'
import { Routes, Route } from 'react-router-dom'
import { saveLinkMetadata } from './utils/linkStorage'
import { sanitizeLinkId } from './utils/linkId'
import { saveLink } from './utils/saveLink'

import { useState } from 'react'

function App() {
  // File + link state live in App so the upload flow is easy to follow.
  const [selectedFile, setSelectedFile] = useState(null)
  const [customLink, setCustomLink] = useState('')
  // expiryMinutes must remain a plain number
  const [expiryMinutes, setExpiryMinutes] = useState(10)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [uploadError, setUploadError] = useState('')

  async function handleUpload() {
    if (isUploading) return

    setUploadError('')
    setShareUrl('')
    setUploadProgress(0)

    if (!selectedFile) {
      alert('Please select a file first.')
      return
    }

    if (!customLink || !customLink.trim()) {
      alert('Please enter a custom link.')
      return
    }

    const linkId = sanitizeLinkId(customLink)

    if (!linkId) {
      alert('Custom link is invalid. Use letters, numbers, and hyphens only.')
      return
    }

    const expiresAt = Date.now() + expiryMinutes * 60 * 1000

    setIsUploading(true)
    setUploadStatus('Preparing upload...')
    try {
      const fileUrl = await uploadFile({
        file: selectedFile,
        linkId,
        onProgress: (progress) => {
          setUploadProgress(progress)
          setUploadStatus(`Uploading... ${progress}%`)
        },
      })

      setUploadStatus('Finalizing link...')

      // Save metadata through API Gateway → Lambda → DynamoDB.
      await saveLink({
        linkId,
        fileUrl,
        fileName: selectedFile.name,
        expiryMinutes,
      })

      const metadata = {
        linkId,
        fileName: selectedFile.name,
        url: fileUrl,
        expiresAt,
        createdAt: Date.now(),
      }

      saveLinkMetadata(linkId, metadata)

      setShareUrl(`http://localhost:5173/${linkId}`)
      setUploadProgress(100)
      setUploadStatus('Upload complete')
    } catch (error) {
      console.error(error)
      setUploadError(
        error?.message
          ? `Upload failed: ${error.message}`
          : 'Upload failed. Please try again.',
      )
      setUploadProgress(0)
      setUploadStatus('')
    } finally {
      setIsUploading(false)
    }
  }

  function handleFileSelected(file) {
    setSelectedFile(file)
    setShareUrl('')
    setUploadError('')
    setUploadProgress(0)
    setUploadStatus('')
  }

  function handleCustomLinkChange(value) {
    setCustomLink(value)
    setShareUrl('')
    setUploadError('')
    setUploadProgress(0)
    setUploadStatus('')
  }

  return (
    <>
      <div className="appShell">
        <Navbar />

        <main className="appMain">
          <Routes>
            <Route
              path="/"
              element={
                <UploadCard
                  selectedFile={selectedFile}
                  onFileSelected={handleFileSelected}
                  customLink={customLink}
                  onCustomLinkChange={handleCustomLinkChange}
                  expiryMinutes={expiryMinutes}
                  setExpiryMinutes={setExpiryMinutes}
                  onUpload={handleUpload}
                  isUploading={isUploading}
                  uploadProgress={uploadProgress}
                  uploadStatus={uploadStatus}
                  shareUrl={shareUrl}
                  uploadError={uploadError}
                />
              }
            />
            <Route path="/:linkId" element={<DownloadPage />} />
          </Routes>
        </main>
      </div>
    </>
  )
}

export default App
