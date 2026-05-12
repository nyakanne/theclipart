import { FormEvent, useEffect, useState } from 'react'
import { CheckCircle2, LogOut, Mail, ShieldAlert } from 'lucide-react'
import { supabase, getSupabaseSession } from '@/services/supabase'

export function Account() {
  const [email, setEmail] = useState('')
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    void getSupabaseSession().then(session => {
      if (mounted) setSessionEmail(session?.user.email ?? null)
    })

    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null)
    })
    return () => {
      mounted = false
      subscription?.data.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) return
    setLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/account`,
        },
      })
      if (error) throw error
      setMessage('Check your email for the secure sign-in link.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase?.auth.signOut()
    setSessionEmail(null)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full border border-red-500/40 bg-red-950/25 p-4 text-red-300">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-300">Secure account</p>
            <h1 className="mt-2 text-3xl font-black text-white">Your Vindica vault</h1>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Production mode uses Supabase Auth. Scans, opt-outs, reports, and evidence records are scoped to the signed-in user.
            </p>
          </div>
        </div>

        {!supabase && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-950/15 p-4 text-sm leading-6 text-red-100/85">
            Supabase is not configured in this frontend build. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` before hosting.
          </div>
        )}

        {sessionEmail ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-950/15 p-5">
            <div className="flex items-center gap-3 text-red-100">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-bold">Signed in as {sessionEmail}</span>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/55 px-4 py-3 text-sm font-bold text-gray-200 transition-colors hover:border-red-500/50 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={signIn} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Email</span>
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                disabled={!supabase}
                className="input-field"
              />
            </label>
            <button
              type="submit"
              disabled={!supabase || loading}
              className="red-button-glow inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              {loading ? 'Sending link...' : 'Send secure sign-in link'}
            </button>
          </form>
        )}

        {message && (
          <div className="mt-4 rounded-lg border border-white/10 bg-black/45 p-4 text-sm leading-6 text-gray-300">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
