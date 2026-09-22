// Vaccinations API — backend contract from backend/routes/vaccination.routes.js.
// All routes are user-scoped by the protect middleware (vaccinations are
// created with `user: req.user._id` and looked up by user in every handler;
// create also verifies pet ownership, update ignores pet/user).

import { apiDelete, apiGet, apiPost, apiPut } from './client'
import type { Pet } from './pets'

export interface Vaccination {
  _id: string
  user?: string
  pet: Pet | string
  vaccineName?: string
  doseNumber?: number
  vaccinationDate?: string
  nextDueDate?: string
  veterinarian?: string
  hospital?: string
  notes?: string
  status?: 'Pending' | 'Completed'
  createdAt?: string
  updatedAt?: string
}

export interface VaccinationsResponse {
  success?: boolean
  count?: number
  vaccinations?: Vaccination[]
}

export interface UpcomingVaccinationsResponse {
  success?: boolean
  count?: number
  upcoming?: Vaccination[]
}

export interface VaccinationMutationResponse {
  success?: boolean
  message?: string
  vaccination?: Vaccination
}

// Payload mirrors what the backend create expects (pet + vaccineName +
// vaccinationDate + nextDueDate required; everything else optional).
export interface VaccinationPayload {
  pet?: string
  vaccineName: string
  vaccinationDate?: string
  nextDueDate?: string
  doseNumber?: number
  veterinarian?: string
  hospital?: string
  notes?: string
  status?: 'Pending' | 'Completed'
}

export function getVaccinations(): Promise<VaccinationsResponse> {
  return apiGet<VaccinationsResponse>('/vaccinations')
}

export function getUpcomingVaccinations(): Promise<UpcomingVaccinationsResponse> {
  return apiGet<UpcomingVaccinationsResponse>('/vaccinations/upcoming')
}

export function createVaccination(payload: VaccinationPayload): Promise<VaccinationMutationResponse> {
  return apiPost<VaccinationMutationResponse>('/vaccinations', payload)
}

export function updateVaccination(id: string, payload: VaccinationPayload): Promise<VaccinationMutationResponse> {
  return apiPut<VaccinationMutationResponse>(`/vaccinations/${id}`, payload)
}

export function deleteVaccination(id: string): Promise<{ success?: boolean; message?: string }> {
  return apiDelete(`/vaccinations/${id}`)
}