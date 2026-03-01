/**
 * Structured logging for server actions.
 * Wraps a server action to log name, user_id, duration, and success/error.
 */

type LogEntry = {
  action: string
  user_id?: string
  duration_ms: number
  success: boolean
  error?: string
}

function log(entry: LogEntry) {
  const level = entry.success ? 'info' : 'error'
  console[level](`[action] ${JSON.stringify(entry)}`)
}

export function withLogging<T extends unknown[], R>(
  actionName: string,
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const start = Date.now()
    try {
      const result = await fn(...args)
      log({
        action: actionName,
        duration_ms: Date.now() - start,
        success: true,
      })
      return result
    } catch (e) {
      log({
        action: actionName,
        duration_ms: Date.now() - start,
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      })
      throw e
    }
  }
}
