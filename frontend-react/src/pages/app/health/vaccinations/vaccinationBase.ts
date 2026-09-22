// Vaccination helpers — ports of the formatters in frontend/js/health.js
// (mapVaccination / vaccineDueLabel), kept in their own file (like
// healthBase.ts/petBase.ts) so fast refresh stays warning-free.

import type { Vaccination } from '../../../../api/vaccinations'

export function petIdOf(v: Vaccination): string {
  const p = v.pet
  return p && typeof p === 'object' ? p._id : (p as string) || ''
}

export function isCompleted(v: Vaccination): boolean {
  return v.status === 'Completed'
}

// "Due: <date>" when the due date has passed, "Next due: <date>" otherwise.
export function vaccineDueLabel(nextDueDate?: string): string {
  if (!nextDueDate) return ''
  const d = new Date(nextDueDate)
  if (Number.isNaN(d.getTime())) return nextDueDate
  const formatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  return d < new Date() ? 'Due: ' + formatted : 'Next due: ' + formatted
}