// Appointments page helpers — ports of the formatters in frontend/js/
// appointments.js (type/status mapping, backend date/time formatting,
// normalizeAppointment). Kept in their own file (like petBase.ts/healthBase.ts)
// so fast-refresh stays warning-free.

import type { Appointment } from '../../../api/appointments'

export const FALLBACK_PET_IMAGE = '/assets/images/adoption/pet1.jpg'

// The booking form only offers these types (Vanilla appointments.html); several
// map to the same backend enum value. Backend Appointment.type enum is
// [checkup, vaccination, surgery, emergency, grooming, consultation].
export const BOOKING_TYPES = ['General Checkup', 'Vaccination', 'Dental Cleaning', 'Grooming', 'Follow-up']

export function mapTypeToBackend(type: string): string {
  switch (type) {
    case 'Vaccination':
      return 'vaccination'
    case 'Grooming':
      return 'grooming'
    case 'Dental Cleaning':
    case 'General Checkup':
      return 'checkup'
    case 'Follow-up':
      return 'consultation'
    default:
      return 'checkup'
  }
}

export function mapTypeFromBackend(type?: string): string {
  switch (type) {
    case 'vaccination':
      return 'Vaccination'
    case 'grooming':
      return 'Grooming'
    case 'surgery':
      return 'Surgery'
    case 'emergency':
      return 'Emergency'
    case 'consultation':
      return 'Consultation'
    case 'checkup':
    default:
      return 'Checkup'
  }
}

export type ViewStatus = 'upcoming' | 'completed' | 'cancelled'

export function mapStatusFromBackend(status?: string): ViewStatus {
  switch (status) {
    case 'pending':
    case 'confirmed':
    case undefined:
      return 'upcoming'
    case 'completed':
      return 'completed'
    case 'no-show':
    case 'cancelled':
      return 'cancelled'
    default:
      return 'upcoming'
  }
}

// Backend date is a Date; display string is its YYYY-MM-DD part.
export function formatBackendDate(date?: string | Date): string {
  return String(date || '').slice(0, 10)
}

// Accepts "HH:mm[:ss]" (optionally with an AM/PM suffix) → "hh:mm AM/PM".
export function formatBackendTime(time?: string | null): string {
  if (!time) return ''
  const clean = String(time).trim().replace(/\s*(AM|PM)/i, '')
  const parts = clean.split(':')
  if (parts.length < 2) return String(time)
  let hour = Number(parts[0])
  if (Number.isNaN(hour)) return String(time)
  const minutes = parts[1].slice(0, 2)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  return `${String(hour).padStart(2, '0')}:${minutes} ${ampm}`
}

function petNameOf(pet: Appointment['pet']): string {
  return pet && typeof pet === 'object' ? pet.name || 'Unknown pet' : 'Unknown pet'
}

function petImageOf(pet: Appointment['pet']): string {
  if (pet && typeof pet === 'object' && pet.images && pet.images.length && pet.images[0]) {
    return pet.images[0]
  }
  return FALLBACK_PET_IMAGE
}

function vetNameOf(vet: Appointment['veterinarian']): string {
  return vet && typeof vet === 'object' ? vet.name || 'Veterinary Doctor' : 'Veterinary Doctor'
}

function vetClinicOf(vet: Appointment['veterinarian']): string {
  return vet && typeof vet === 'object' ? vet.clinic || '' : ''
}

// Read model used by the page lists, stats and calendar (mirror of Vanilla
// normalizeAppointment minus the fake pet-image fallback default).
export interface AppointmentView {
  id: string
  pet: string
  type: string
  doctor: string
  date: string
  time: string
  clinic: string
  status: ViewStatus
  image: string
}

export function toAppointmentView(raw: Appointment): AppointmentView {
  return {
    id: raw._id,
    pet: petNameOf(raw.pet),
    type: mapTypeFromBackend(raw.type),
    doctor: vetNameOf(raw.veterinarian),
    date: formatBackendDate(raw.date),
    time: formatBackendTime(raw.time),
    clinic: vetClinicOf(raw.veterinarian),
    status: mapStatusFromBackend(raw.status),
    image: petImageOf(raw.pet),
  }
}

// "12 Aug 2026" (en-GB), matching Vanilla formatDate().
export function formatDisplayDate(date: string): string {
  const d = new Date(date + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}