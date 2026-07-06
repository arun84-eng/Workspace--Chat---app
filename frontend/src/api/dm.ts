import { http } from '../lib/http'
import type { DirectMessage, User } from '../types/api'

export interface DmConversationUser {
  id: number
  username: string
  email: string
}

export interface DmUnreadCountItem {
  user_id: number
  unread_count: number
}

export const dmApi = {
  send: (data: { receiver_id: number; content: string }) =>
    http.post<DirectMessage>('/dm/send', data),

  conversations: () =>
    http.get<DmConversationUser[]>('/dm/conversations'),

  unreadCount: () =>
    http.get<DmUnreadCountItem[]>('/dm/unread-count'),

  withUser: (otherUserId: number) =>
    http.get<DirectMessage[]>(`/dm/${otherUserId}`),

  markRead: (messageId: number) => http.put(`/dm/read/${messageId}`),
}