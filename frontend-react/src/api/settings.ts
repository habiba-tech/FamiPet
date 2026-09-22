// Settings API — backend contract from backend/routes/auth.routes.js (profile
// update + change password) and backend/routes/user.routes.js (avatar upload).
//   PUT  /auth/profile        body { name, phone, address, city, avatar }  → { user }
//   PUT  /auth/change-password body { currentPassword, newPassword }       → { message }
//   POST /users/avatar        multipart field `avatar` (jpeg/png/webp, ≤5MB) → { avatar, user }

import { apiPost, apiPut } from './client'
import type { AuthUser } from './auth'

export interface ProfilePayload {
  name: string
  phone?: string
  address?: string
  city?: string
  avatar?: string
}

export interface ProfileResponse {
  success?: boolean
  message?: string
  user?: AuthUser
}

export interface AvatarResponse {
  success?: boolean
  avatar?: string
  user?: AuthUser
}

export function updateProfile(data: ProfilePayload): Promise<ProfileResponse> {
  return apiPut<ProfileResponse>('/auth/profile', data)
}

export function changePassword(currentPassword: string, newPassword: string): Promise<ProfileResponse> {
  return apiPut<ProfileResponse>('/auth/change-password', { currentPassword, newPassword })
}

export function uploadAvatar(file: File): Promise<AvatarResponse> {
  const fd = new FormData()
  fd.append('avatar', file)
  return apiPost<AvatarResponse>('/users/avatar', fd)
}