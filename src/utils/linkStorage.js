const STORAGE_PREFIX = 'clouddrop:link:'

export function saveLinkMetadata(linkId, metadata) {
  if (!linkId) return
  localStorage.setItem(`${STORAGE_PREFIX}${linkId}`, JSON.stringify(metadata))
}

export function loadLinkMetadata(linkId) {
  if (!linkId) return null

  const raw = localStorage.getItem(`${STORAGE_PREFIX}${linkId}`)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function buildShareUrl(linkId) {
  if (!linkId) return ''
  return `${window.location.origin}/${linkId}`
}
