// Pets API — backend contract from backend/routes/pet.routes.js. Pet images in
// the DB are absolute URLs (Unsplash/localhost uploads); see petImage() in
// lib/formatters.ts for the fallback.

import { apiDelete, apiGet, apiPost, apiPut } from './client'

export interface Pet {
  _id: string
  name: string
  species?: string
  breed?: { name?: string } | string | null
  gender?: string
  age?: number
  weight?: number | string
  vaccinated?: boolean
  description?: string
  images?: string[]
  qrCode?: string
  petUid?: string
  adopted?: boolean
  status?: string
  views?: number
  createdAt?: string
  owner?: { _id?: string; name?: string } | string | null
}

export interface PetsResponse {
  success?: boolean
  count?: number
  pets?: Pet[]
}

export interface PetMutationResponse {
  success?: boolean
  pet?: Pet
}

// Payload mirrored from Vanilla mypet.js buildPetPayload(); age/weight sent as
// numbers, gender/species lowercased to match backend enum fields.
export interface PetPayload {
  name: string
  species: string
  breed: string
  gender: string
  age: number
  weight: number
  vaccinated: boolean
  description?: string
  images?: string[]
}

export function getMyPets(): Promise<PetsResponse> {
  return apiGet<PetsResponse>('/pets/my')
}

// Adoption gallery source — public endpoint, `status=available` only so the
// React adoption page never renders pets that the backend has already marked
// adopted/lost/inactive (Vanilla adoption.js fetched the same query).
export function getAvailablePets(): Promise<PetsResponse> {
  return apiGet<PetsResponse>('/pets?status=available')
}

export function createPet(payload: PetPayload): Promise<PetMutationResponse> {
  return apiPost<PetMutationResponse>('/pets', payload)
}

export function updatePet(id: string, payload: PetPayload): Promise<PetMutationResponse> {
  return apiPut<PetMutationResponse>(`/pets/${id}`, payload)
}

export function deletePet(id: string): Promise<{ success?: boolean; message?: string }> {
  return apiDelete(`/pets/${id}`)
}

export function getPetQr(id: string): Promise<{ success?: boolean; qrCode?: string }> {
  return apiGet(`/pets/${id}/qr`)
}