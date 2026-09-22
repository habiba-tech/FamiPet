// Health page helpers — ports of the record formatters in frontend/js/health.js.
// Kept in their own file (like petBase.ts) so fast-refresh stays warning-free.

import type { HealthRecord } from '../../../api/health'

export const RECORD_TYPES = ['General Checkup', 'Vaccination', 'Medication', 'Weight Check', 'Other']

export const FALLBACK_PET_IMAGE = '/assets/images/adoption/pet1.jpg'

export function petIdOf(record: HealthRecord): string {
  const p = record.pet
  return p && typeof p === 'object' ? p._id : (p as string) || ''
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '\u2014'
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return dateString
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function toISO(dateString?: string): string {
  if (!dateString) return ''
  const d = new Date(dateString)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]
}

export function iconForRecord(type: string | undefined): string {
  const value = (type || '').toLowerCase()
  if (value.includes('vaccination')) return 'syringe'
  if (value.includes('weight')) return 'weight-scale'
  if (value.includes('medication')) return 'pills'
  return 'stethoscope'
}