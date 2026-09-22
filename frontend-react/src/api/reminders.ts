// Reminders API — backend contract from backend/routes/reminder.routes.js.
// Every route is user-scoped by the protect middleware: list returns only the
// logged-in user's reminders (pet populated), create verifies pet ownership when
// a pet is sent, update merges body fields (pet is always ignored server-side),
// complete flips isCompleted, delete removes the record.

import { apiDelete, apiGet, apiPost, apiPut } from './client'

export interface ReminderPet {
  _id?: string
  name?: string
  species?: string
  images?: string[]
}

export interface Reminder {
  _id: string
  title?: string
  type?: string
  description?: string
  date?: string | Date
  time?: string
  frequency?: string
  isActive?: boolean
  isCompleted?: boolean
  pet?: ReminderPet | string | null
  createdAt?: string
  updatedAt?: string
}

export interface RemindersResponse {
  success?: boolean
  count?: number
  reminders?: Reminder[]
}

export interface ReminderMutationResponse {
  success?: boolean
  message?: string
  reminder?: Reminder
}

export interface ReminderPayload {
  title: string
  type: string
  date?: string
  time?: string
  description?: string
  pet?: string
}

export function getReminders(): Promise<RemindersResponse> {
  return apiGet<RemindersResponse>('/reminders')
}

export function createReminder(payload: ReminderPayload): Promise<ReminderMutationResponse> {
  return apiPost<ReminderMutationResponse>('/reminders', payload)
}

export function updateReminder(id: string, payload: Partial<ReminderPayload>): Promise<ReminderMutationResponse> {
  return apiPut<ReminderMutationResponse>(`/reminders/${id}`, payload)
}

export function completeReminder(id: string): Promise<ReminderMutationResponse> {
  return apiPut<ReminderMutationResponse>(`/reminders/${id}/complete`)
}

export function deleteReminder(id: string): Promise<{ success?: boolean; message?: string }> {
  return apiDelete<{ success?: boolean; message?: string }>(`/reminders/${id}`)
}