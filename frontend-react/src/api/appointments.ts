// Appointments API — backend contract from backend/routes/appointment.routes.js.
// `pet` is populated with name/species/images. Upcoming = pending | confirmed.

import { apiGet } from './client'

export interface Appointment {
  _id: string
  type?: string
  status?: string
  date?: string
  time?: string
  pet?: { name?: string; images?: string[] } | null
}

export interface AppointmentsResponse {
  success?: boolean
  count?: number
  appointments?: Appointment[]
}

export function getAppointments(): Promise<AppointmentsResponse> {
  return apiGet<AppointmentsResponse>('/appointments')
}