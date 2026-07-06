import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Register() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await authApi.register({ username, email, password })

      const res = await authApi.login({ email, password })
      const data = res.data as Record<string, unknown>

      const token = (data.access_token ?? data.token) as string | undefined

      if (!token) {
        setError('Registered, but login token was not returned.')
        return
      }

      // save token first
      setSession(
        {
          id: 0,
          username,
          email,
          is_online: false,
          last_seen: null,
        },
        token
      )

      const me = await authApi.me()
      setSession(me.data, token)

      navigate('/app', { replace: true })
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setError(
        status === 422
          ? 'Check your details — something is in the wrong format.'
          : 'Could not create account.'
      )
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-panel px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-3xl font-bold">Create account</h1>
        <p className="mb-6 font-mono text-xs text-ink-soft">workspace chat</p>

        <form onSubmit={handleSubmit} className="space-y-3 border-2 border-ink bg-paper p-5 shadow-hard">
          <div>
            <label className="mb-1 block font-mono text-xs text-ink-soft">username</label>
            <Input required value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="border-2 border-flag bg-paper px-2 py-1.5 text-xs text-flag">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-soft">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-ink underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
