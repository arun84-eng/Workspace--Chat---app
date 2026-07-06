import { http } from '../lib/http'
import type { User } from '../types/api'

export interface UserStatusResponse {
  user_id: number
  username: string
  is_online: boolean
  last_seen: string | null
}

export const usersApi = {
  list: () => http.get<User[]>('/users'),

  online: () => http.get<User[]>('/users/online'),

  status: (userId: number) =>
    http.get<UserStatusResponse>(`/user/status/${userId}`),

  setTyping: (data: { channel_id: number; is_typing: boolean }) =>
    http.put('/typing', data),
}