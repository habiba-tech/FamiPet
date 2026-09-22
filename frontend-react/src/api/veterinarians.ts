// Veterinarians API — backend contract from backend/routes/veterinarian.routes.js.
// `GET /` and `GET /:id` are public; create/update/delete are admin-only.
// The Appointments page consumes the list for its vet dropdown (Phase 13 will
// add the shared VetSelect consumed by PetGPT too).

import { apiGet } from './client'

export interface Veterinarian {
  _id: string
  name: string
  email?: string
  phone?: string
  specialization?: string[]
  qualifications?: string[]
  experience?: number
  clinic?: string
  address?: string
  city?: string
  image?: string
  rating?: number
  isActive?: boolean
  consultationFee?: number
}

export interface VeterinariansResponse {
  success?: boolean
  count?: number
  veterinarians?: Veterinarian[]
}

export function getVeterinarians(): Promise<VeterinariansResponse> {
  return apiGet<VeterinariansResponse>('/veterinarians')
}

export function getVeterinarian(id: string): Promise<{ success?: boolean; veterinarian?: Veterinarian }> {
  return apiGet<{ success?: boolean; veterinarian?: Veterinarian }>(`/veterinarians/${id}`)
}