/**
 * Sanitizes user-generated content before storage and rendering.
 * We sanitize on write, not on read.
 */

// Strip all HTML tags — for plain text fields (listing titles, names, etc.)
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/javascript:/gi, '') // Remove JS protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
}

// Sanitize for text content that may contain user-generated input.
// Removes HTML, null bytes, and control characters.
export function sanitizeText(input: string): string {
  return stripHtml(input)
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars except \t \n \r
    .slice(0, 50000) // Hard max length
}

// Safe truncation for display
export function truncate(input: string, maxLength: number): string {
  const cleaned = sanitizeText(input)
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned
}

// Sanitize a URL — only allow http/https
export function sanitizeUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    return parsed.toString()
  } catch {
    return null
  }
}

// Escape a string for safe use inside a Supabase PostgREST .or() / .ilike() filter.
// Prevents filter injection by removing characters that have special meaning in PostgREST syntax.
export function escapePostgrestValue(input: string): string {
  return input
    .replace(/[\\%_]/g, '') // Remove LIKE wildcards and backslash
    .replace(/[(),."']/g, '') // Remove PostgREST filter syntax chars
    .trim()
    .slice(0, 200)
}
