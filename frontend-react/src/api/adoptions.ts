// Adoptions API — backend contract from backend/routes/adoption.routes.js
// (GET /adoptions/my returns the current user's requests, POST /adoptions
// creates one). Payload mirrors the Vanilla adoption.js adoption form; the
// backend model stores no email/city so those form fields are not sent.

import { apiGet, apiPost, apiPut } from './client'

export type AdoptionStatus = 'Pending' | 'Approved' | 'Rejected'

export interface Adoption {
  _id: string
  status?: string
  createdAt?: string
  fullName?: string
  phone?: string
  address?: string
  occupation?: string
  experienceWithPets?: string
  reasonForAdoption?: string
  pet?: { name?: string } | null
  user?: { _id?: string; name?: string; email?: string; phone?: string } | string
}

export interface AdoptionsResponse {
  success?: boolean
  count?: number
  adoptions?: Adoption[]
  requests?: Adoption[]
}

export interface AdoptionPayload {
  pet: string
  fullName: string
  phone: string
  address: string
  occupation: string
  experienceWithPets: string
  reasonForAdoption: string
}

export function getMyAdoptions(): Promise<AdoptionsResponse> {
  return apiGet<AdoptionsResponse>('/adoptions/my')
}

export function createAdoption(payload: AdoptionPayload): Promise<{ success?: boolean; adoption?: Adoption }> {
  return apiPost('/adoptions', payload)
}

// Admin review endpoints (GET /adoptions + PUT /adoptions/:id are admin-only
// on the backend — the Vanilla admin adoptions page calls exactly these).
export function getAllAdoptions(): Promise<AdoptionsResponse> {
  return apiGet<AdoptionsResponse>('/adoptions')
}

export function updateAdoptionStatus(
  id: string,
  status: AdoptionStatus,
): Promise<{ success?: boolean; message?: string }> {
  return apiPut<{ success?: boolean; message?: string }>(`/adoptions/${id}`, { status })
}