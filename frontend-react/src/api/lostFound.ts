// Lost & Found API — backend contract from backend/routes/lostFound.routes.js
// + backend/controllers/lostFound.controller.js. GET is public; POST/PUT/DELETE
// are protected. The backend resolves ownership: update is owner-only, delete is
// owner-or-admin (403 otherwise), and validation returns 400.

import { apiDelete, apiGet, apiPost, apiPut } from './client'

export interface LostFoundReport {
  _id: string
  type: string
  petName: string
  species: string
  breed?: string
  gender?: string
  color?: string
  description?: string
  location?: string
  date?: string
  contactName?: string
  contactPhone?: string
  images?: string[]
  status?: string
  createdAt?: string
  user?: { _id?: string; name?: string; email?: string; phone?: string } | string
}

export interface LostFoundResponse {
  success?: boolean
  count?: number
  reports?: LostFoundReport[]
}

export function getReports(): Promise<LostFoundResponse> {
  return apiGet<LostFoundResponse>('/lost-found')
}

// Create/update carry multipart form data (multer `upload.single('image')`);
// the backend stores the uploaded file under /uploads and returns its URL.
export function createReport(
  payload: FormData,
): Promise<{ success?: boolean; message?: string; report?: LostFoundReport }> {
  return apiPost('/lost-found', payload)
}

export function updateReport(
  id: string,
  payload: FormData,
): Promise<{ success?: boolean; message?: string; report?: LostFoundReport }> {
  return apiPut(`/lost-found/${id}`, payload)
}

export function deleteReport(id: string): Promise<{ success?: boolean; message?: string }> {
  return apiDelete(`/lost-found/${id}`)
}