import { http } from '../lib/http'
import type { AppNotification } from '../types/api'

export const notificationsApi = {
  list: () => http.get<AppNotification[]>('/notifications'),

  unreadCount: () => http.get<{ count: number }>('/notifications/unread-count'),

  markRead: (notificationId: number) =>
    http.put(`/notifications/read/${notificationId}`),

  markAllRead: () => http.put('/notifications/read-all'),
}
