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
import { validateConfig } from './utils/validateConfig'

import { useState } from 'react'

// Validate configuration at app startup
validateConfig()

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
    setUploadStatus('Preparing archive...')
    console.group('UPLOAD PIPELINE')
    console.time('upload-pipeline')
    try {
      console.log(`[${new Date().toISOString()}] 1. Starting upload preparation`)
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

      const shouldZip =
        entries.length > 1 ||
        entries.some((entry) => {
          const relativePath = entry?.file?.webkitRelativePath || entry?.relativePath || ''
          return relativePath.includes('/')
        })

      console.log('Upload mode:', shouldZip ? 'zip' : 'direct file')

      const totalSize = entries.reduce((acc, e) => acc + ((e && e.size) || (e.file && e.file.size) || 0), 0)
      if (totalSize > 300 * 1024 * 1024) {
        setUploadStatus('Large archive detected — this may take a while')
      }

      let uploadTarget
      let uploadedFileName
      let uploadedFileType

      if (shouldZip) {
        setUploadStatus('Preparing archive...')
        const zipBlob = await createZip(entries, {
          onProgress: (p) => {
            setUploadProgress(p)
            setUploadStatus(`Preparing archive... ${p}%`)
          },
        })
        console.log(`[${new Date().toISOString()}] 2. ZIP generation complete`)

        uploadedFileName = `${linkId || customLink || 'cloudrop-files'}.zip`
        uploadTarget = new File([zipBlob], uploadedFileName, { type: 'application/zip' })
        uploadedFileType = uploadTarget.type

        if (!uploadTarget.size) {
          throw new Error('ZIP archive is empty. Folder parsing may have failed.')
        }

        console.log({
          zipName: uploadedFileName,
          zipType: uploadTarget.type,
          zipSize: uploadTarget.size,
        })

        setUploadStatus('Uploading archive...')
      } else {
        console.log(`[${new Date().toISOString()}] 2. Direct file upload selected`)
        uploadTarget = entries[0].file || entries[0]
        uploadedFileName = uploadTarget.name || entries[0].name || `${linkId || customLink || 'cloudrop-file'}`
        uploadedFileType = uploadTarget.type || 'application/octet-stream'
        setUploadStatus('Uploading file...')
      }

      console.log(`[${new Date().toISOString()}] 3. Requesting upload URL`)

      // Upload the chosen file to S3
      const zipUrl = await uploadFile({
        file: uploadTarget,
        linkId,
        onProgress: (progress) => {
          setUploadProgress(progress)
          setUploadStatus(`${shouldZip ? 'Uploading archive' : 'Uploading file'}... ${progress}%`)
        },
      })

      // Prepare stored metadata about original entries
      const uploadedFiles = entries.map((e) => ({
        fileName: e.name || (e.file && e.file.name) || '',
        relativePath: e.relativePath || (e.file && e.file.webkitRelativePath) || (e.file && e.file.name) || '',
        size: e.size || (e.file && e.file.size) || 0,
      }))

      // Save metadata through API Gateway → Lambda → DynamoDB.
      setUploadStatus('Saving metadata...')
      console.log(`[${new Date().toISOString()}] 7. Saving metadata`)
      await saveLink({
        linkId,
        fileUrl: zipUrl,
        fileName: uploadedFileName,
        expiryMinutes,
      })
      console.log(`[${new Date().toISOString()}] 8. Metadata save complete`)

      const metadata = {
        linkId,
        fileName: uploadedFileName,
        url: zipUrl,
        files: uploadedFiles,
        fileCount: uploadedFiles.length,
        expiresAt: expiresAtTime,
        createdAt: Date.now(),
        uploadType: shouldZip ? 'zip' : 'direct',
        fileType: uploadedFileType,
      }

      saveLinkMetadata(linkId, metadata)

      setUploadStatus('Generating share link...')
      console.log(`[${new Date().toISOString()}] 9. Generating share link`)
      const generatedShareUrl = buildShareUrl(linkId)
      console.log(`[${new Date().toISOString()}] Share URL generated:`, generatedShareUrl)
      setShareUrl(generatedShareUrl)
      console.log(`[${new Date().toISOString()}] 10. Upload flow finished`)
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
      console.timeEnd('upload-pipeline')
      console.groupEnd()
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
