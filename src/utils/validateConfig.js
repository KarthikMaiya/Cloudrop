/**
 * Validate environment configuration at app startup.
 * Supports both serverless (VITE_API_URL) and express (VITE_EXPRESS_URL) modes.
 */
export function validateConfig() {
  const mode = import.meta.env.VITE_BACKEND_MODE || 'serverless'
  const issues = []

  if (mode === 'express') {
    const expressUrl = import.meta.env.VITE_EXPRESS_URL
    if (!expressUrl) {
      issues.push(
        'VITE_BACKEND_MODE=express but VITE_EXPRESS_URL is not set. ' +
        'Set VITE_EXPRESS_URL=http://localhost:3001 in your .env file.',
      )
    } else {
      try { new URL(expressUrl) } catch {
        issues.push(`VITE_EXPRESS_URL="${expressUrl}" is not a valid URL.`)
      }
    }
  } else {
    // serverless mode
    const apiUrl = import.meta.env.VITE_API_URL
    if (!apiUrl) {
      issues.push(
        'VITE_API_URL environment variable is not set. ' +
        'Upload functionality will not work. ' +
        'Set it to your API Gateway base URL, e.g. https://your-api.execute-api.aws.amazonaws.com/prod.',
      )
    } else {
      try { new URL(apiUrl) } catch {
        issues.push(`VITE_API_URL="${apiUrl}" is not a valid URL.`)
      }
      if ((apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) && import.meta.env.MODE === 'production') {
        issues.push(`VITE_API_URL points to localhost in production mode. Set it to your production backend URL.`)
      }
    }
  }

  if (issues.length > 0) {
    console.group('⚠️  Cloudrop Configuration Issues')
    issues.forEach((issue) => console.warn(issue))
    console.log('📖 See .env.example for configuration help.')
    console.groupEnd()
    return false
  }

  console.debug(`✅ Cloudrop configuration validated. Backend mode: ${mode}`)
  return true
}

