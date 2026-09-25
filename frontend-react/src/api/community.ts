// Community API — backend contract from backend/routes/community.routes.js.
// Note: the like route is `POST /community/:id/like` (the Vanilla community.js
// called PUT on it, which the backend never served — see migration.md Phase 15
// deltas). The backend also supports GET ?category=/?search=, but the Vanilla
// page never sent them and filtering is client-side; this port keeps parity.

import { apiDelete, apiGet, apiPost } from './client'

export interface CommunityComment {
  _id?: string
  user?: { _id?: string; name?: string; email?: string; avatar?: string } | string
  text: string
  createdAt?: string
}

export interface CommunityPost {
  _id: string
  title?: string
  content?: string
  category?: string
  image?: string
  likes?: (string | { _id?: string; name?: string })[]
  comments?: CommunityComment[]
  createdAt?: string
  isActive?: boolean
  user?: { _id?: string; name?: string; email?: string; avatar?: string } | string
}

export interface CommunityResponse {
  success?: boolean
  count?: number
  posts?: CommunityPost[]
}

export interface ToggleLikeResponse {
  success?: boolean
  message?: string
  likesCount?: number
  liked?: boolean
  likes?: (string | { _id?: string; name?: string })[]
}

export function getCommunityPosts(): Promise<CommunityResponse> {
  return apiGet<CommunityResponse>('/community')
}

export function createCommunityPost(payload: FormData): Promise<{ success?: boolean; post?: CommunityPost }> {
  return apiPost<{ success?: boolean; post?: CommunityPost }>('/community', payload)
}

export function deleteCommunityPost(id: string): Promise<{ success?: boolean; message?: string }> {
  return apiDelete(`/community/${id}`)
}

export function toggleCommunityLike(id: string): Promise<ToggleLikeResponse> {
  return apiPost<ToggleLikeResponse>(`/community/${id}/like`)
}

export function addCommunityComment(
  id: string,
  text: string,
): Promise<{ success?: boolean; post?: CommunityPost }> {
  return apiPost<{ success?: boolean; post?: CommunityPost }>(`/community/${id}/comments`, { text })
}