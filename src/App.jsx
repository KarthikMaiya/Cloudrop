import './App.css'

import Navbar from './components/Navbar'
import { uploadFile } from './utils/uploadFile'
import DownloadPage from './pages/DownloadPage'
import LandingPage from './pages/LandingPage'
import { Routes, Route } from 'react-router-dom'
import { saveLinkMetadata, buildShareUrl } from './utils/linkStorage'
import { sanitizeLinkId } from './utils/linkId'
import { saveLink } from './utils/saveLink'

import { useState } from 'react'

function App() {
  // File + link state live in App so the upload flow is easy to follow.
  const [selectedFiles, setSelectedFiles] = useState([])
  const [customLink, setCustomLink] = useState('')
  // expiryMinutes must remain a plain number
  const [expiryMinutes, setExpiryMinutes] = useState(10)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [expiresAt, setExpiresAt] = useState(null)
  const [uploadError, setUploadError] = useState('')

  async function handleUpload() {
    if (isUploading) return

    setUploadError('')
    setShareUrl('')
    setExpiresAt(null)
    setUploadProgress(0)

    if (!selectedFiles.length) {
      alert('Please select at least one file first.')
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

    const expiresAtTime = Date.now() + expiryMinutes * 60 * 1000

    setIsUploading(true)
    setUploadStatus('Preparing upload...')
    try {
      const uploadedFiles = []
      const totalFiles = selectedFiles.length

      for (let index = 0; index < totalFiles; index += 1) {
        const currentEntry = selectedFiles[index]
        const sourceFile = currentEntry && currentEntry.file ? currentEntry.file : currentEntry
        const entryName = (currentEntry && currentEntry.name) || (sourceFile && sourceFile.name) || `file-${index + 1}`
        const entryPath = (currentEntry && currentEntry.relativePath) || entryName

        const fileUrl = await uploadFile({
          file: sourceFile,
          linkId,
          onProgress: (progress) => {
            const weightedProgress = Math.round(((index + progress / 100) / totalFiles) * 100)
            setUploadProgress(weightedProgress)
            setUploadStatus(`Uploading ${index + 1}/${totalFiles}: ${entryName} (${progress}%)`)
          },
        })

        uploadedFiles.push({
          fileName: entryName,
          relativePath: entryPath,
          size: (currentEntry && currentEntry.size) || (sourceFile && sourceFile.size) || 0,
          fileUrl,
        })
      }

      const primaryFile = selectedFiles[0]
      const primaryUpload = uploadedFiles[0]

      if (!primaryFile || !primaryUpload) {
        throw new Error('No uploaded file metadata available.')
      }

      setUploadStatus('Finalizing link...')

      // Save metadata through API Gateway → Lambda → DynamoDB.
      await saveLink({
        linkId,
        fileUrl: primaryUpload.fileUrl,
        fileName: primaryUpload.fileName,
        expiryMinutes,
      })

      const metadata = {
        linkId,
        fileName: primaryUpload.fileName,
        url: primaryUpload.fileUrl,
        files: uploadedFiles,
        fileCount: uploadedFiles.length,
        expiresAt: expiresAtTime,
        createdAt: Date.now(),
      }

      saveLinkMetadata(linkId, metadata)

      setShareUrl(buildShareUrl(linkId))
      setExpiresAt(expiresAtTime)
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

  function handleFilesSelected(files) {
    setSelectedFiles(Array.isArray(files) ? files : [])
    setShareUrl('')
    setExpiresAt(null)
    setUploadError('')
    setUploadProgress(0)
    setUploadStatus('')
  }

  function handleCustomLinkChange(value) {
    setCustomLink(value)
    setShareUrl('')
    setExpiresAt(null)
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
                <LandingPage
                  selectedFiles={selectedFiles}
                  onFilesSelected={handleFilesSelected}
                  customLink={customLink}
                  onCustomLinkChange={handleCustomLinkChange}
                  expiryMinutes={expiryMinutes}
                  setExpiryMinutes={setExpiryMinutes}
                  onUpload={handleUpload}
                  isUploading={isUploading}
                  uploadProgress={uploadProgress}
                  uploadStatus={uploadStatus}
                  shareUrl={shareUrl}
                  expiresAt={expiresAt}
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
