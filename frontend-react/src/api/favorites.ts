// Favorites API — same toggle as frontend/js/dashboard.js:
// POST /users/favorites/:petId → { success, favorites, isFavorite }.

import { apiPost } from './client'

export interface FavoritesResponse {
  success?: boolean
  favorites?: Array<{ _id?: string } | string>
  isFavorite?: boolean
}

export function toggleFavorite(petId: string): Promise<FavoritesResponse> {
  return apiPost<FavoritesResponse>(`/users/favorites/${encodeURIComponent(petId)}`)
}