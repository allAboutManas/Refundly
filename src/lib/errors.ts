/**
 * Convert thrown/returned errors into human-readable messages.
 * Never surface raw database errors to users (PRD §50).
 */
const PATTERNS: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'Incorrect email or password.'],
  [/email not confirmed/i, 'Please confirm your email first — check your inbox.'],
  [/user already registered|already registered/i, 'An account with this email already exists.'],
  [/rate limit|too many requests|too many/i, 'Too many attempts. Please wait a moment and try again.'],
  [/password should be at least/i, 'Password must be at least 8 characters.'],
  [/for security purposes/i, 'Please wait a few seconds before trying again.'],
  [/failed to fetch|network|networkerror/i, 'Network error. Check your connection and try again.'],
  [/jwt expired|session|not authenticated/i, 'Your session expired. Please sign in again.'],
  [/row-level security|permission denied|not-null/i, "You don't have access to do that."],
]

export function friendlyError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!error) return fallback
  const message =
    typeof error === 'string'
      ? error
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : ''
  if (!message) return fallback
  for (const [re, friendly] of PATTERNS) {
    if (re.test(message)) return friendly
  }
  return message
}
