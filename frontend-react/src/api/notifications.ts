// Notifications API — backend contract from
// backend/routes/notification.routes.js.

import { apiGet } from './client'

export interface AppNotification {
  _id: string
  title?: string
  message?: string
  isRead?: boolean
  createdAt?: string
}

export interface NotificationsResponse {
  success?: boolean
  count?: number
  notifications?: AppNotification[]
}

export function getNotifications(): Promise<NotificationsResponse> {
  return apiGet<NotificationsResponse>('/notifications')
}