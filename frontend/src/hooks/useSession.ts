import { useEffect, useState } from 'react'
import { authApi } from '../api'
import { useAuthStore } from '../store/authStore'

export function useSession() {
  const token = useAuthStore((s) => s.token)
  const setSession = useAuthStore((s) => s.setSession)
  const clearSession = useAuthStore((s) => s.clearSession)
  const user = useAuthStore((s) => s.user)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!token) {
      setChecking(false)
      return
    }

    authApi
      .me()
      .then((res) => setSession(res.data, token))
      .catch(() => clearSession())
      .finally(() => setChecking(false))
  }, [])

  return { checking, user, token }
}