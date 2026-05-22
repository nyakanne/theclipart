import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/services/api'

/**
 * Landing page after Google OAuth redirect.
 * The backend redirects here with the JWT in the URL hash:
 *   /auth/callback#token=<jwt>
 * We extract it, fetch /auth/me, store both, then send the user home.
 */
export function AuthCallback() {
  const navigate = useNavigate()
  const { setToken, setUser } = useAuthStore()

  useEffect(() => {
    const hash = window.location.hash
    const token = new URLSearchParams(hash.slice(1)).get('token')

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    setToken(token)

    api.auth.me()
      .then(user => {
        setUser(user)
        navigate('/app', { replace: true })
      })
      .catch(() => navigate('/login', { replace: true }))
  }, [navigate, setToken, setUser])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="text-center space-y-4">
        <ShieldCheck className="mx-auto h-10 w-10 text-brand-400 animate-pulse" />
        <p className="text-gray-400 text-sm">Signing you in…</p>
      </div>
    </div>
  )
}
