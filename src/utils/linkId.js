export function sanitizeLinkId(input) {
  const raw = (input ?? '').toString().trim().toLowerCase()

  // Keep it URL-path-segment safe.
  const cleaned = raw
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

  return cleaned
}

export function generateLinkId() {
  // Short, readable id; good enough for an MVP.
  const random = Math.random().toString(36).slice(2, 8)
  return `dl-${random}`
}
