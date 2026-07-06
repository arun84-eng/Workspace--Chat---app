import { http } from '../lib/http'
import type { User } from '../types/api'

export const profileApi = {
  get: () => http.get<User>('/profile'),

  // UpdateProfile schema is exactly { username, email } — no avatar/display
  // name field exists on this backend.
  update: (data: { username: string; email: string }) =>
    http.put<User>('/profile', data),
}
