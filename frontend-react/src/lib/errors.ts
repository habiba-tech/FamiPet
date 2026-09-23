// Shared API error type + factory. Imported by src/api/client.ts (which
// re-exports `ApiError` so existing `import type { ApiError } from '../api/client'`
// call sites keep working) and by pages/hooks that want to surface backend
// messages verbatim.

export interface ApiError extends Error {
  status?: number
  data?: Record<string, unknown> & { message?: string; isVerified?: boolean }
  isNetwork?: boolean
}

export function toApiError(
  message: string,
  extra: { status?: number; data?: unknown; isNetwork?: boolean },
): ApiError {
  const err = new Error(message) as ApiError
  if (extra.status !== undefined) err.status = extra.status
  if (extra.data !== undefined) err.data = extra.data as ApiError['data']
  if (extra.isNetwork !== undefined) err.isNetwork = extra.isNetwork
  return err
}

// Single canonical "what went wrong" extraction so pages stop hand-rolling
// `(err instanceof Error && err.message) || fallback`. An ApiError's message is
// the backend `message` field verbatim (client.ts), so this returns it as-is.
export function getErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (err instanceof Error && err.message) return err.message
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message?: unknown }).message
    if (typeof msg === 'string' && msg) return msg
  }
  return fallback
}

// Every error the client throws carries `status` (0 for network failures,
// response.code otherwise); `isNetwork`/`data` are only present when relevant.
export function isApiError(err: unknown): err is ApiError {
  return err instanceof Error && 'status' in err
}