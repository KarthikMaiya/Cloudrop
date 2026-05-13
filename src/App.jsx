import './App.css'

import Navbar from './components/Navbar'
import UploadCard from './components/UploadCard'
import { uploadFile } from './utils/uploadFile'
import DownloadPage from './pages/DownloadPage'
import { Routes, Route } from 'react-router-dom'
import { AWS_REGION } from './aws-config'
import { buildS3ObjectUrl } from './utils/s3Url'
import { saveLinkMetadata } from './utils/linkStorage'
import { sanitizeLinkId } from './utils/linkId'
import { saveLink } from './utils/saveLink'

import { useState } from 'react'

function App() {
  // File + link state live in App so the upload flow is easy to follow.
  const [selectedFile, setSelectedFile] = useState(null)
  const [customLink, setCustomLink] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  async function handleUpload() {
    if (!selectedFile) {
      alert('Please select a file first.')
      return
    }

    if (!customLink || !customLink.trim()) {
      alert('Please enter a custom link.')
      return
    }

    const bucketName = import.meta.env.VITE_S3_BUCKET_NAME
    const linkId = sanitizeLinkId(customLink)

    if (!linkId) {
      alert('Custom link is invalid. Use letters, numbers, and hyphens only.')
      return
    }

    const expiresAt = Date.now() + 10 * 60 * 1000

    setIsUploading(true)
    try {
      const result = await uploadFile({
        file: selectedFile,
        bucketName,
        // Reuse the linkId as a friendly S3 prefix.
        customLink: linkId,
      })

      if (!result) return

      const fileUrl = buildS3ObjectUrl({
        bucketName: result.bucketName,
        region: AWS_REGION,
        objectKey: result.objectKey,
      })

      // Save metadata through API Gateway → Lambda → DynamoDB.
      await saveLink({
        linkId,
        fileUrl,
        fileName: selectedFile.name,
        expiresAt,
      })

      const metadata = {
        linkId,
        fileName: selectedFile.name,
        url: fileUrl,
        expiresAt,
        createdAt: Date.now(),
      }

      saveLinkMetadata(linkId, metadata)

      alert(`Share this link: http://localhost:5173/${linkId}`)
    } finally {
      setIsUploading(false)
    }
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
                  onFileSelected={setSelectedFile}
                  customLink={customLink}
                  onCustomLinkChange={setCustomLink}
                  onUpload={handleUpload}
                  isUploading={isUploading}
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
