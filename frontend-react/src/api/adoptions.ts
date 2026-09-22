// Adoptions API — backend contract from backend/routes/adoption.routes.js
// (GET /adoptions/my returns the current user's requests, POST /adoptions
// creates one). Payload mirrors the Vanilla adoption.js adoption form; the
// backend model stores no email/city so those form fields are not sent.

import { apiGet, apiPost } from './client'

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