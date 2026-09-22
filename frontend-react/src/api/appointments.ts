// Appointments API — backend contract from backend/routes/appointment.routes.js.
// Every route is user-scoped by the protect middleware: list returns only the
// logged-in user's appointments (pet + veterinarian populated), create verifies
// pet ownership + active vet + no double-booking, update only allows
// date/time/type/symptoms/notes, delete actually marks the appointment
// `cancelled` (and deactivates its auto-created reminder).

import { apiDelete, apiGet, apiPost, apiPut } from './client'

export interface ApptPet {
  _id?: string
  name?: string
  species?: string
  images?: string[]
}

export interface ApptVet {
  _id?: string
  name?: string
  clinic?: string
  specialization?: string[]
  phone?: string
}

export interface Appointment {
  _id: string
  type?: string
  status?: string
  date?: string | Date
  time?: string
  symptoms?: string
  notes?: string
  prescription?: string
  diagnosis?: string
  fee?: number
  isPaid?: boolean
  pet?: ApptPet | string | null
  veterinarian?: ApptVet | string | null
  createdAt?: string
  updatedAt?: string
}

export interface AppointmentsResponse {
  success?: boolean
  count?: number
  appointments?: Appointment[]
}

export interface AppointmentMutationResponse {
  success?: boolean
  message?: string
  appointment?: Appointment
}

// Payload mirrors what the backend create expects (pet + veterinarian + date +
// time required; type defaults to "checkup"; symptoms/notes optional). Update
// accepts a subset — the reschedule modal only sends date + time.
export interface AppointmentPayload {
  pet: string
  veterinarian: string
  type?: string
  date?: string
  time?: string
  symptoms?: string
  notes?: string
}

export function getAppointments(): Promise<AppointmentsResponse> {
  return apiGet<AppointmentsResponse>('/appointments')
}

export function createAppointment(payload: AppointmentPayload): Promise<AppointmentMutationResponse> {
  return apiPost<AppointmentMutationResponse>('/appointments', payload)
}

export function updateAppointment(id: string, payload: Partial<AppointmentPayload>): Promise<AppointmentMutationResponse> {
  return apiPut<AppointmentMutationResponse>(`/appointments/${id}`, payload)
}

export function deleteAppointment(id: string): Promise<{ success?: boolean; message?: string }> {
  return apiDelete<{ success?: boolean; message?: string }>(`/appointments/${id}`)
}