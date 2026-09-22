// Reminders page helpers — ports of the formatters in frontend/js/reminders.js
// (type mapping both directions, backend time formatting, color/icon/class per
// type, days text, normalizeReminder). Kept in their own file (like
// appointmentsBase.ts/healthBase.ts) so fast-refresh stays warning-free.

import type { Reminder } from '../../../api/reminders'
import { speciesImage } from '../mypet/petBase'

// The form only offers these UI types (Vanilla reminders.html). Several map to
// the same backend enum value (medicine deworming/flea, custom = checkup).
export const REMINDER_TYPES = ['Vaccination', 'Deworming', 'Flea Treatment', 'General Checkup', 'Grooming']

const FALLBACK_PET_IMAGE = '/assets/images/my-pet/cat.png'

// Backend Reminder.type enum is [feeding, medicine, vaccination, grooming,
// appointment, exercise, custom].
export function mapTypeToBackend(type: string): string {
  switch (type) {
    case 'Vaccination':
      return 'vaccination'
    case 'Deworming':
    case 'Flea Treatment':
      return 'medicine'
    case 'Grooming':
      return 'grooming'
    case 'General Checkup':
    default:
      return 'custom'
  }
}

export function mapTypeFromBackend(type?: string): string {
  switch (type) {
    case 'vaccination':
      return 'Vaccination'
    case 'medicine':
      return 'Deworming'
    case 'grooming':
      return 'Grooming'
    case 'custom':
    case 'feeding':
    case 'appointment':
    case 'exercise':
    default:
      return 'General Checkup'
  }
}

export type ReminderColor = 'green' | 'pink' | 'orange' | 'purple' | 'blue'

export function getReminderColor(type: string): ReminderColor {
  switch (type) {
    case 'Vaccination':
      return 'green'
    case 'Deworming':
      return 'pink'
    case 'Flea Treatment':
      return 'orange'
    case 'General Checkup':
      return 'purple'
    case 'Grooming':
      return 'blue'
    default:
      return 'green'
  }
}

// Reminder type circle class (reminders.css .reminder-type.{class}).
export function getTypeClass(type: string): string {
  switch (type) {
    case 'Vaccination':
      return 'vaccination'
    case 'Deworming':
      return 'deworming'
    case 'Flea Treatment':
      return 'flea'
    case 'General Checkup':
      return 'checkup'
    case 'Grooming':
      return 'grooming'
    default:
      return 'vaccination'
  }
}

// Lucide icon name per type (Vanilla typeIcons).
export function getTypeIcon(type: string): string {
  switch (type) {
    case 'Vaccination':
      return 'syringe'
    case 'Deworming':
      return 'pill'
    case 'Flea Treatment':
      return 'bug'
    case 'Grooming':
      return 'scissors'
    case 'General Checkup':
    default:
      return 'stethoscope'
  }
}

// Accepts "HH:mm" (optionally with an AM/PM suffix) → "hh:mm AM/PM".
export function formatBackendTime(time?: string | null): string {
  if (!time) return ''
  const clean = String(time).trim().replace(/\s*(AM|PM)/i, '')
  const parts = clean.split(':')
  if (parts.length < 2) return String(time)
  let hour = Number(parts[0])
  if (Number.isNaN(hour)) return String(time)
  const minutes = parts[1].replace(' ', '').slice(0, 2)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  return `${String(hour).padStart(2, '0')}:${minutes} ${ampm}`
}

// "07:45 PM" → "19:45" (for <input type="time"> in the edit form).
export function convertTimeToInput(time?: string): string {
  if (!time) return ''
  const clean = String(time).trim().replace(/\s*(AM|PM)/i, '')
  const parts = clean.split(':')
  if (parts.length < 2) return ''
  let hour = Number(parts[0])
  if (Number.isNaN(hour)) return ''
  if (/pm/i.test(time) && hour !== 12) hour += 12
  if (/am/i.test(time) && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${parts[1].slice(0, 2)}`
}

// Backend date is a Date; display string is its YYYY-MM-DD part.
export function formatBackendDate(date?: string | Date): string {
  return String(date || '').slice(0, 10)
}

// "27 May 2025" (en-GB), matching Vanilla formatDate().
export function formatDisplayDate(date: string): string {
  const d = new Date(date + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Relative "Today" / "In 2 days" / "5 days ago" chip text (Vanilla getDaysText).
export function getDaysText(date: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date + 'T00:00:00')
  target.setHours(0, 0, 0, 0)
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff > 1) return `In ${diff} days`
  if (diff === -1) return 'Yesterday'
  return `${Math.abs(diff)} days ago`
}

function petNameOf(pet: Reminder['pet']): string {
  return pet && typeof pet === 'object' && pet.name ? pet.name : 'No pet'
}

function petIdOf(pet: Reminder['pet']): string {
  return pet && typeof pet === 'object' && pet._id ? pet._id : ''
}

function petImageOf(pet: Reminder['pet']): string {
  if (pet && typeof pet === 'object' && pet.images && pet.images[0]) return pet.images[0]
  // Fall back to the species illustration when the pet has no uploaded photo
  // (mirrors Vanilla's petImageFor going to a species/static image).
  const species = pet && typeof pet === 'object' ? pet.species : undefined
  return species ? speciesImage(species) : FALLBACK_PET_IMAGE
}

export interface ReminderView {
  id: string
  pet: string
  petId: string
  type: string
  color: ReminderColor
  typeClass: string
  typeIcon: string
  date: string
  time: string
  status: 'Upcoming' | 'Completed'
  image: string
}

export function toReminderView(raw: Reminder): ReminderView {
  const displayType = mapTypeFromBackend(raw.type)
  return {
    id: raw._id,
    pet: petNameOf(raw.pet),
    petId: petIdOf(raw.pet),
    type: displayType,
    color: getReminderColor(displayType),
    typeClass: getTypeClass(displayType),
    typeIcon: getTypeIcon(displayType),
    date: formatBackendDate(raw.date),
    time: formatBackendTime(raw.time),
    status: raw.isCompleted ? 'Completed' : 'Upcoming',
    image: petImageOf(raw.pet),
  }
}