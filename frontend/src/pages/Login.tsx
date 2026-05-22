import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, Mail, ArrowRight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/authStore'

const PROD_URL = 'https://vindica.me'

function getRedirectTo() {
  // Always redirect to production in prod, localhost only in dev
  if (import.meta.env.DEV) return `${window.location.origin}/account`
  return `${PROD_URL}/account`
}

export function Login() {
  const { setToken, setUser } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  function enterDemo() {
    setToken('demo-token-vindica')
    setUser({ id: 'demo', email: 'demo@vindica.me', name: 'Demo User', picture: null })
    navigate('/app', { replace: true })
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: getRedirectTo() },
    })
    setSending(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030305] px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-950/50 border border-red-900/50 mb-4"
            style={{ boxShadow: '0 0 24px rgba(220,38,38,0.25)' }}>
            <ShieldCheck className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">vindica</h1>
          <p className="mt-1.5 text-sm text-gray-500">Reclaim your name. Guard your data. Disappear.</p>
        </div>

        {/* Card */}
        <div className="card-dark p-8 space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-white">Sign in to continue</h2>
            <p className="mt-1 text-xs text-gray-500">
              Your scan results and breach alerts are tied to your account.
            </p>
          </div>

          {/* GitHub login */}
          <a
            href={api.auth.loginUrl()}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 hover:border-gray-600 px-4 py-3 text-sm font-semibold text-white transition-colors"
          >
            <GitHubIcon />
            Continue with GitHub
          </a>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-[11px] text-gray-600">or sign in with email</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Magic link */}
          {sent ? (
            <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 text-center space-y-1">
              <Mail className="h-6 w-6 text-red-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">Check your inbox</p>
              <p className="text-xs text-gray-500">We sent a sign-in link to <span className="text-gray-300">{email}</span></p>
              <button onClick={() => setSent(false)} className="text-xs text-red-500 hover:text-red-400 mt-2 transition-colors">
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={sendMagicLink} className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                <input
                  type="email"
                  className="input-field pl-9 text-sm"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={sending || !email.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                style={{ boxShadow: email.trim() ? '0 0 16px rgba(220,38,38,0.35)' : undefined }}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {sending ? 'Sending…' : 'Send Magic Link'}
              </button>
            </form>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-[11px] text-gray-600">or</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Demo mode */}
          <button
            onClick={enterDemo}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-900/40 bg-red-950/20 hover:bg-red-950/40 hover:border-red-900/60 px-4 py-2.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
          >
            Try Demo — no account needed
          </button>

          <p className="text-center text-[11px] text-gray-600 leading-relaxed pt-1">
            By signing in you agree to our{' '}
            <span className="text-gray-400 underline cursor-pointer">Terms</span>{' '}
            and{' '}
            <span className="text-gray-400 underline cursor-pointer">Privacy Policy</span>.
            We encrypt all PII at rest with AES-256 / KMS.
          </p>
        </div>

        {/* Trust strip */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[['GDPR', 'compliant'], ['CCPA', 'compliant'], ['KMS', 'encrypted']].map(([stat, label]) => (
            <div key={stat} className="card-dark py-3 px-2">
              <p className="text-sm font-bold text-red-500">{stat}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}
