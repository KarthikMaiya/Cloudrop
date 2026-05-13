function encodeS3Key(key) {
  return (key ?? '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export function buildS3ObjectUrl({ bucketName, region, objectKey }) {
  if (!bucketName || !region || !objectKey) return ''
  const encodedKey = encodeS3Key(objectKey)
  return `https://${bucketName}.s3.${region}.amazonaws.com/${encodedKey}`
}
