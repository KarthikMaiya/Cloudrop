import JSZip from 'jszip'

export async function createZip(entries = [], { onProgress } = {}) {
  const zip = new JSZip()

  for (const entry of entries) {
    const file = entry && entry.file ? entry.file : entry
    const relativePath = (entry && entry.relativePath) || file.webkitRelativePath || file.name
    // Ensure we don't create leading slashes
    const safePath = relativePath.replace(/^\/+/, '')
    zip.file(safePath, file)
  }

  console.log('ZIP ENTRIES:')
  console.log(Object.keys(zip.files))

  const blob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    if (typeof onProgress === 'function') onProgress(Math.round(metadata.percent))
  })

  return blob
}

export default createZip
