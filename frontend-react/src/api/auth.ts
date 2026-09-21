// Auth API endpoints — parity with frontend/js/* usage and backend/routes/auth.routes.js.
// Response shapes are backend-defined and unchanged:
//   login → { token, user }      register → { user }
//   verify-email/:token → GET     resend-verification → POST { email }
//   forgot-password → POST { email }    reset-password/:token → POST { password }
//   me → GET (Bearer)

import {
  apiGet,
  apiPost,
  type StoredUser,
} from './client'

export interface AuthUser extends StoredUser {
  id: string
  name: string
  email: string
  role: string
}

export interface LoginResponse {
  token: string
  user: AuthUser
  message?: string
}

export interface MessageResponse {
  success?: boolean
  message?: string
  user?: AuthUser
  token?: string
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/auth/login', { email, password })
}

export function register(data: {
  name: string
  email: string
  password: string
  phone: string
}): Promise<MessageResponse> {
  return apiPost<MessageResponse>('/auth/register', data)
}

export function verifyEmail(token: string): Promise<MessageResponse> {
  return apiGet<MessageResponse>(`/auth/verify-email/${encodeURIComponent(token)}`, { auth: false })
}

export function resendVerification(email: string): Promise<MessageResponse> {
  return apiPost<MessageResponse>('/auth/resend-verification', { email })
}

export function forgotPassword(email: string): Promise<MessageResponse> {
  return apiPost<MessageResponse>('/auth/forgot-password', { email }, { auth: false })
}

export function resetPassword(token: string, password: string): Promise<MessageResponse> {
  return apiPost<MessageResponse>(
    `/auth/reset-password/${encodeURIComponent(token)}`,
    { password },
    { auth: false },
  )
}

// redirectOnAuthError: false so an expired token on load clears the session in
// AuthContext (soft logout) instead of a hard page reload mid-validation.
export function getMe(): Promise<MessageResponse> {
  return apiGet<MessageResponse>('/auth/me', { redirectOnAuthError: false })
}