import { http } from '../lib/http'
import type { AuthResponse, User } from '../types/api'

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    http.post('/register', data),

  login: (data: { email: string; password: string }) =>
    http.post<AuthResponse>('/login', data),

  me: () => http.get<User>('/me'),

  logout: () => http.post('/logout'),

  changePassword: (data: { current_password: string; new_password: string }) =>
    http.put('/change-password', data),
}