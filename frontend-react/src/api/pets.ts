// Pets API — backend contract from backend/routes/pet.routes.js. Pet images in
// the DB are absolute URLs (Unsplash/localhost uploads); see petImage() in
// lib/formatters.ts for the fallback.

import { apiGet } from './client'

export interface Pet {
  _id: string
  name: string
  species?: string
  breed?: { name?: string } | string | null
  age?: number
  images?: string[]
}

export interface PetsResponse {
  success?: boolean
  count?: number
  pets?: Pet[]
}

export function getMyPets(): Promise<PetsResponse> {
  return apiGet<PetsResponse>('/pets/my')
}