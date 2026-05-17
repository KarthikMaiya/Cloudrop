/**
 * Validate environment configuration at app startup.
 * Provides helpful warnings if critical variables are missing.
 */
export function validateConfig() {
  const apiUrl = import.meta.env.VITE_API_URL

  const issues = []

  // Check if API URL is set
  if (!apiUrl) {
    issues.push(
      'VITE_API_URL environment variable is not set. ' +
      'Upload functionality will not work. ' +
      'Set it to your backend API base URL (e.g., https://your-api.execute-api.aws.amazonaws.com/prod).',
    )
  } else {
    // Validate the format
    try {
      new URL(apiUrl)
    } catch {
      issues.push(
        `VITE_API_URL="${apiUrl}" is not a valid URL. ` +
        'Please use a valid URL format (e.g., https://your-api.execute-api.aws.amazonaws.com/prod).',
      )
    }

    // Warn if it looks like a local test URL in production
    if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
      // This is OK for development, but warn in production
      if (import.meta.env.MODE === 'production') {
        issues.push(
          `VITE_API_URL points to localhost (${apiUrl}) in production. ` +
          'This will not work. Set it to your production backend URL.',
        )
      }
    }
  }

  // Log issues to console
  if (issues.length > 0) {
    console.group('⚠️  Cloudrop Configuration Issues')
    issues.forEach((issue) => {
      console.warn(issue)
    })
    console.log('📖 See .env.example for configuration help.')
    console.groupEnd()
    return false
  }

  // All good
  console.debug('✅ Cloudrop configuration validated.')
  console.debug('API Base URL:', apiUrl)
  return true
}
