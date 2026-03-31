/**
 * Safe error serialization — never leaks stack traces, DB schema details,
 * or internal system information to the client.
 */

const SAFE_ERROR_PREFIXES = [
  'Record not found',
  'Access denied',
  'Invalid input',
  'Upload failed',
  'Too many requests',
  'Session expired',
  'Company not found',
  'Not authenticated',
  'Unauthorized',
  'Post cannot be empty',
  'Maximum',
  'Edit window expired',
  'Post not found',
  'Bulk import requires',
  'No active company',
  'You have reached your',
  'File content does not match',
  'File size exceeds',
  'File too large',
]

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message

    // Check if this is a safe, user-facing error we authored
    if (SAFE_ERROR_PREFIXES.some((prefix) => message.startsWith(prefix))) {
      return message
    }

    // Postgres / Supabase errors — log internally, return generic message
    if (
      message.includes('duplicate key') ||
      message.includes('violates') ||
      message.includes('relation') ||
      message.includes('column') ||
      message.includes('PGRST')
    ) {
      console.error('[DB Error]', message)
      return 'An error occurred. Please try again.'
    }
  }

  // Never expose raw errors in production
  if (process.env.NODE_ENV === 'development') {
    return error instanceof Error ? error.message : String(error)
  }

  return 'An unexpected error occurred. Please try again.'
}

export function toActionError(error: unknown): { error: string } {
  return { error: safeErrorMessage(error) }
}
