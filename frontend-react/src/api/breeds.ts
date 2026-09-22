// Breeds API — backend contract from backend/routes/breed.routes.js.
// `GET /` and `GET /:id` are public; create/update/delete are admin-only.

import { apiGet } from './client'

export interface Breed {
  _id: string
  name: string
  species: string
  origin?: string
  lifespan?: string
  weightRange?: string
  heightRange?: string
  temperament?: string[]
  exerciseRequirements?: string
  groomingGuide?: string
  commonDiseases?: string[]
  suitableEnvironment?: string
  description?: string
  images?: string[]
  popularity?: number
  isActive?: boolean
}

export interface BreedsResponse {
  success?: boolean
  count?: number
  breeds?: Breed[]
}

export function getBreeds(): Promise<BreedsResponse> {
  return apiGet<BreedsResponse>('/breeds')
}

export function getBreed(id: string): Promise<{ success?: boolean; breed?: Breed }> {
  return apiGet<{ success?: boolean; breed?: Breed }>(`/breeds/${id}`)
}