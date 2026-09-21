// Adoptions API — backend contract from backend/routes/adoption.routes.js
// (GET /adoptions/my returns the current user's requests).

import { apiGet } from './client'

export interface Adoption {
  _id: string
  status?: string
  createdAt?: string
  pet?: { name?: string } | null
}

export interface AdoptionsResponse {
  success?: boolean
  count?: number
  adoptions?: Adoption[]
  requests?: Adoption[]
}

export function getMyAdoptions(): Promise<AdoptionsResponse> {
  return apiGet<AdoptionsResponse>('/adoptions/my')
}