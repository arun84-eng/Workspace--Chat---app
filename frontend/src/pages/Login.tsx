import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Login() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await authApi.login({ email, password })
      const data = res.data as Record<string, unknown>

      const token = (data.access_token ?? data.token) as string | undefined

      if (!token) {
        console.error('Login response missing token:', data)
        setError('Login succeeded but token was not returned by backend.')
        return
      }

      // IMPORTANT: save token first so /me gets Authorization header
      setSession(
        {
          id: 0,
          username: '',
          email,
          is_online: false,
          last_seen: null,
        },
        token
      )

      try {
        const me = await authApi.me()
        setSession(me.data, token)
        navigate('/app', { replace: true })
      } catch (err) {
        console.error('/me failed after login:', err)
        setError('Logged in, but failed to load your profile.')
      }
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setError(
        status === 422
          ? 'Check your email and password format.'
          : 'Invalid email or password.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-panel px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-3xl font-bold">Sign in</h1>
        <p className="mb-6 font-mono text-xs text-ink-soft">workspace chat</p>

        <form onSubmit={handleSubmit} className="space-y-3 border-2 border-ink bg-paper p-5 shadow-hard">
          <div>
            <label className="mb-1 block font-mono text-xs text-ink-soft">email</label>
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-xs text-ink-soft">password</label>
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="border-2 border-flag bg-paper px-2 py-1.5 text-xs text-flag">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-soft">
          New here?{' '}
          <Link to="/register" className="font-medium text-ink underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
