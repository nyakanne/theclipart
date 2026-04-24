import { ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '@/services/api'

export function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-900/50 border border-brand-800 mb-4">
            <ShieldCheck className="h-8 w-8 text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">DataGuard</h1>
          <p className="mt-1.5 text-sm text-gray-400">
            Find your data. Erase it. Arm yourself.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 backdrop-blur-sm p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-white">Sign in to continue</h2>
            <p className="mt-1 text-xs text-gray-500">
              Your scan results and breach alerts are tied to your account.
            </p>
          </div>

          {/* Google Sign-In button */}
          <a
            href={api.auth.googleLoginUrl()}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-700 bg-white px-4 py-3 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </a>

          <p className="text-center text-[11px] text-gray-600 leading-relaxed">
            By signing in you agree to our{' '}
            <span className="text-gray-400 underline cursor-pointer">Terms</span>{' '}
            and{' '}
            <span className="text-gray-400 underline cursor-pointer">Privacy Policy</span>.
            We encrypt all PII at rest with AES-256 / KMS.
          </p>
        </div>

        {/* Features below card */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            ['250+', 'brokers scanned'],
            ['GDPR', 'compliant'],
            ['KMS', 'encrypted'],
          ].map(([stat, label]) => (
            <div key={stat} className="rounded-lg border border-gray-800 bg-gray-900/40 py-3 px-2">
              <p className="text-sm font-bold text-brand-400">{stat}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
