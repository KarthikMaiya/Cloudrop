import './App.css'

import Navbar from './components/Navbar'
import { uploadFile } from './utils/uploadFile'
import { createZip } from './utils/createZip'
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
    setUploadStatus('Preparing ZIP archive...')
    try {
      // Prepare entries metadata for ZIP and metadata storage
      const entries = selectedFiles.map((entry) => (entry && entry.file ? entry : { file: entry, name: entry.name, size: entry.size, relativePath: entry.webkitRelativePath || entry.name }))

      console.log('FILES ARRAY:', entries)
      console.log('FILES COUNT:', entries.length)
      entries.forEach((entry) => {
        console.log({
          name: entry.name || entry.file?.name,
          size: entry.size ?? entry.file?.size,
          type: entry.type || entry.file?.type,
          relativePath: entry.relativePath || entry.file?.webkitRelativePath,
        })
      })

      if (!entries.length) {
        throw new Error('No files were collected from the selected folder/files.')
      }

      const totalSize = entries.reduce((acc, e) => acc + ((e && e.size) || (e.file && e.file.size) || 0), 0)
      if (totalSize > 300 * 1024 * 1024) {
        setUploadStatus('Large archive detected — this may take a while')
      }

      // Create ZIP in browser with progress
      setUploadStatus('Compressing files...')
      const zipBlob = await createZip(entries, {
        onProgress: (p) => {
          setUploadProgress(p)
          setUploadStatus(`Compressing... ${p}%`)
        },
      })

      const zipFileName = `${linkId || customLink || 'cloudrop-files'}.zip`
      const zipFile = new File([zipBlob], zipFileName, { type: 'application/zip' })

      if (!zipFile.size) {
        throw new Error('ZIP archive is empty. Folder parsing may have failed.')
      }

      console.log({
        zipName: zipFileName,
        zipType: zipFile.type,
        zipSize: zipFile.size,
      })

      setUploadStatus('Uploading archive...')

      // Upload the single ZIP file to S3
      const zipUrl = await uploadFile({
        file: zipFile,
        linkId,
        onProgress: (progress) => {
          setUploadProgress(progress)
          setUploadStatus(`Uploading archive... ${progress}%`)
        },
      })

      // Prepare stored metadata about original entries
      const uploadedFiles = entries.map((e) => ({
        fileName: e.name || (e.file && e.file.name) || '',
        relativePath: e.relativePath || (e.file && e.file.webkitRelativePath) || (e.file && e.file.name) || '',
        size: e.size || (e.file && e.file.size) || 0,
      }))

      // Save metadata through API Gateway → Lambda → DynamoDB.
      await saveLink({
        linkId,
        fileUrl: zipUrl,
        fileName: zipFileName,
        expiryMinutes,
      })

      const metadata = {
        linkId,
        fileName: zipFileName,
        url: zipUrl,
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
