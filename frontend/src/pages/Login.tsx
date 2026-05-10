import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useAuthStore } from '@/store/authStore'

export function Login() {
  const { setToken, setUser } = useAuthStore()
  const navigate = useNavigate()

  function enterDemo() {
    setToken('demo-token-vindica')
    setUser({ id: 'demo', email: 'demo@vindica.me', name: 'Demo User', picture: null })
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-950/50 border border-red-900/50 mb-4 border-glow-red">
            <ShieldCheck className="h-8 w-8 text-red-500 glow-red-sm" />
          </div>
          <h1 className="text-2xl font-bold text-white">Phantom</h1>
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
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 hover:border-gray-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors"
          >
            <GitHubIcon />
            Continue with GitHub
          </a>

          {/* Divider */}
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
