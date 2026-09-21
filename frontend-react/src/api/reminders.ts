// Reminders API — backend contract from backend/routes/reminder.routes.js.

import { apiGet } from './client'

export interface Reminder {
  _id: string
  title?: string
  date?: string
  time?: string
  isCompleted?: boolean
}

export interface RemindersResponse {
  success?: boolean
  count?: number
  reminders?: Reminder[]
}

export function getReminders(): Promise<RemindersResponse> {
  return apiGet<RemindersResponse>('/reminders')
}