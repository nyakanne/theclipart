import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Loader2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

/**
 * Landing page for Supabase magic-link and OAuth callbacks.
 * Supabase appends the session tokens as a URL fragment (#access_token=...).
 * We extract the session, store it, then redirect to /app.
 */
export function Account() {
  const navigate = useNavigate()
  const { setToken, setUser } = useAuthStore()
  const [error, setError] = useState('')

  useEffect(() => {
    async function handleCallback() {
      // Supabase sets the session from the URL hash automatically
      const { data, error: err } = await supabase.auth.getSession()

      if (err || !data.session) {
        // Try exchanging code from URL (PKCE flow)
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        if (code) {
          const { data: exchanged, error: exchErr } = await supabase.auth.exchangeCodeForSession(code)
          if (exchErr || !exchanged.session) {
            setError(exchErr?.message ?? 'Sign-in failed. Please try again.')
            return
          }
          const u = exchanged.session.user
          setToken(exchanged.session.access_token)
          setUser({
            id: u.id,
            email: u.email ?? '',
            name: u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? 'User',
            picture: u.user_metadata?.avatar_url ?? null,
          })
          navigate('/app', { replace: true })
          return
        }
        setError('No session found. Your link may have expired — request a new one.')
        return
      }

      const u = data.session.user
      setToken(data.session.access_token)
      setUser({
        id: u.id,
        email: u.email ?? '',
        name: u.user_metadata?.full_name ?? u.email?.split('@')[0] ?? 'User',
        picture: u.user_metadata?.avatar_url ?? null,
      })
      navigate('/app', { replace: true })
    }

    handleCallback()
  }, [navigate, setToken, setUser])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030305] px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-950/40 border border-red-900/40 mb-2">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-white">Sign-in failed</h2>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="btn-red mx-auto mt-2"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030305]">
      <div className="text-center space-y-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-950/40 border border-red-900/40 mb-2"
          style={{ boxShadow: '0 0 20px rgba(220,38,38,0.2)' }}>
          <ShieldCheck className="h-7 w-7 text-red-500" />
        </div>
        <Loader2 className="h-5 w-5 text-red-500 animate-spin mx-auto" />
        <p className="text-sm text-gray-500">Signing you in to vindica…</p>
      </div>
    </div>
  )
}
