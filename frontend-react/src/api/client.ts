// Faithful TypeScript port of frontend/js/api.js (FamiPetAPI) for the React app.
// Preserves the exact storage keys, request headers, Bearer token behavior,
// JSON parsing, network/parse error handling, and the 401-with-token rule.
// The backend is unchanged.
//
// This is the ONLY place that talks to the network. Every src/api/<resource>.ts
// module fans out from here, so the request semantics (JSON vs FormData,
// Bearer token, 401 redirect, error normalization) are shared app-wide.

import { toApiError, type ApiError } from '../lib/errors'
import {
  FAMIPET_PROFILE_KEY,
  FAMIPET_TOKEN_KEY,
  FAMIPET_USER_KEY,
} from '../lib/storage'

// Base URL of the backend API (no trailing slash). Overridable at build/dev
// time with VITE_API_URL so the same bundle can target any deployment without
// a code change; defaults to the local backend (api.js parity).
export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '')

// Origin the backend serves media from (multer `/uploads/...` lives above the
// `/api` mount point). Single source for lib/image.ts asset resolution.
export function apiOrigin(): string {
  return API_BASE.replace(/\/api$/, '')
}

export { type ApiError }

/* ---------------- TOKEN / USER ---------------- */

export function getToken(): string {
  return localStorage.getItem(FAMIPET_TOKEN_KEY) || ''
}

export function setToken(token: string): void {
  if (token) {
    localStorage.setItem(FAMIPET_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(FAMIPET_TOKEN_KEY)
  }
}

// Stored user shape is backend-defined (publicUser + populated pets/favorites).
export interface StoredUser {
  id?: string
  name?: string
  email?: string
  role?: string
  avatar?: string | null
  phone?: string
  address?: string
  city?: string
  isVerified?: boolean
  isBlocked?: boolean
  [key: string]: unknown
}

export function getUser(): StoredUser | null {
  try {
    return JSON.parse(localStorage.getItem(FAMIPET_USER_KEY) || 'null') as StoredUser | null
  } catch {
    return null
  }
}

export function setUser(user: StoredUser | null): void {
  if (user) {
    localStorage.setItem(FAMIPET_USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(FAMIPET_USER_KEY)
  }
}

// Backend auth endpoints disagree on the user shape: login/register return
// `publicUser` (with `id`), while GET /auth/me and PUT /auth/profile return the
// raw mongoose doc (with `_id`, no `id`). Consumers read `user.id`, so any
// stored user must carry `id`. Normalize `_id` → `id` so reloads / profile
// saves never leave localStorage with a user that breaks `.id` lookups.
export function normalizeUser(user: StoredUser | null | undefined): StoredUser | null {
  if (!user) return user ?? null
  if (user.id) return user
  const id = user._id
  return typeof id === 'string' && id ? { ...user, id } : user
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

export function isAdmin(): boolean {
  const u = getUser()
  return !!(u && u.role === 'admin')
}

// Parity with FamiPetAPI.logout(): clears auth storage WITHOUT localStorage.clear()
// so unrelated persisted state (famipetTheme) survives logout.
export function logoutStoredAuth(): void {
  setToken('')
  setUser(null)
  localStorage.removeItem(FAMIPET_PROFILE_KEY)
  sessionStorage.clear()
}

/* ---------------- UNAUTHORIZED HOOK ----------------
   api.js redirects to login.html on a 401-with-token via window.location.
   The SPA equivalent (hard navigation to /login) is registered here so the
   auth client stays router-agnostic. */

let onUnauthorized: () => void = () => window.location.assign('/login')

export function setOnUnauthorized(fn: () => void): void {
  onUnauthorized = fn
}

/* ---------------- REQUEST CORE ---------------- */

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  redirectOnAuthError?: boolean
  headers?: Record<string, string>
}

export async function apiRequest<T>(
  path: string,
  options?: RequestOptions,
): Promise<T> {
  const opts = options || {}
  const method = (opts.method || 'GET').toUpperCase()
  const body = opts.body
  const useAuth = opts.auth !== false
  const redirectOnAuthError = opts.redirectOnAuthError !== false

  const headers = Object.assign({}, opts.headers || {})
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json'
  if (useAuth && getToken()) headers['Authorization'] = 'Bearer ' + getToken()

  let response: Response
  try {
    response = await fetch(API_BASE + path, {
      method,
      headers,
      body: body !== undefined ? (isFormData ? (body as FormData) : JSON.stringify(body)) : undefined,
    })
  } catch {
    throw toApiError('Unable to reach the server. Please check your connection.', {
      status: 0,
      isNetwork: true,
    })
  }

  let data: Record<string, unknown> = {}
  try {
    data = (await response.json()) as Record<string, unknown>
  } catch {
    data = {}
  }

  if (response.status === 401 && useAuth && getToken()) {
    if (redirectOnAuthError) {
      logoutStoredAuth()
      onUnauthorized()
    }
  }

  if (!response.ok) {
    throw toApiError(
      (data && typeof data.message === 'string' ? data.message : '') || 'Something went wrong.',
      { status: response.status, data },
    )
  }

  return data as T
}

/* ---------------- PUBLIC HELPERS ---------------- */

export function apiUrl(path: string): string {
  return API_BASE + path
}

export function apiGet<T>(path: string, opts?: RequestOptions): Promise<T> {
  return apiRequest<T>(path, Object.assign({ method: 'GET' }, opts))
}

export function apiPost<T>(path: string, data?: unknown, opts?: RequestOptions): Promise<T> {
  return apiRequest<T>(path, Object.assign({ method: 'POST', body: data }, opts))
}

export function apiPut<T>(path: string, data?: unknown, opts?: RequestOptions): Promise<T> {
  return apiRequest<T>(path, Object.assign({ method: 'PUT', body: data }, opts))
}

export function apiDelete<T>(path: string, opts?: RequestOptions): Promise<T> {
  return apiRequest<T>(path, Object.assign({ method: 'DELETE' }, opts))
}