import { create } from 'zustand'
import { TOKEN_KEY } from '../lib/http'
import type { User } from '../types/api'

interface AuthState {
  user: User | null
  token: string | null
  setSession: (user: User, token: string) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY),
  setSession: (user, token) => {
    localStorage.setItem(TOKEN_KEY, token)
    set({ user, token })
  },
  clearSession: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ user: null, token: null })
  },
}))