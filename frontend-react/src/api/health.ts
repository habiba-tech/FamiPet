// Health API — backend contract from backend/routes/health.routes.js.
// All routes are user-scoped by the protect middleware (health records are
// created with `user: req.user._id` and looked up by user in every handler).

import { apiDelete, apiGet, apiPost, apiPut } from './client'
import type { Pet } from './pets'

export interface HealthRecord {
  _id: string
  user?: string
  pet: Pet | string
  diagnosis?: string
  treatment?: string
  doctor?: string
  hospital?: string
  prescription?: string
  visitDate?: string
  nextVisit?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface HealthRecordsResponse {
  success?: boolean
  count?: number
  records?: HealthRecord[]
}

export interface HealthRecordMutationResponse {
  success?: boolean
  message?: string
  record?: HealthRecord
}

// Payload mirrors what the Vanilla health.js saveRecord() sends. Backend
// create requires `pet` + `diagnosis`; update ignores `user`/`pet`.
export interface HealthRecordPayload {
  pet?: string
  diagnosis: string
  visitDate?: string
  doctor?: string
  notes?: string
}

export function getHealthRecords(): Promise<HealthRecordsResponse> {
  return apiGet<HealthRecordsResponse>('/health')
}

export function createHealthRecord(payload: HealthRecordPayload): Promise<HealthRecordMutationResponse> {
  return apiPost<HealthRecordMutationResponse>('/health', payload)
}

export function updateHealthRecord(id: string, payload: HealthRecordPayload): Promise<HealthRecordMutationResponse> {
  return apiPut<HealthRecordMutationResponse>(`/health/${id}`, payload)
}

export function deleteHealthRecord(id: string): Promise<{ success?: boolean; message?: string }> {
  return apiDelete(`/health/${id}`)
}