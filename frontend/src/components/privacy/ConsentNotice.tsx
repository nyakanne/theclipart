import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LockKeyhole, ShieldCheck } from 'lucide-react'

const CONSENT_KEY = 'vindica-consent:v1'

export function ConsentNotice() {
  const [agreed, setAgreed] = useState(false)
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const saved = JSON.parse(window.localStorage.getItem(CONSENT_KEY) ?? '{}') as { status?: string }
      return saved.status !== 'accepted'
    } catch {
      return true
    }
  })

  if (!visible) return null

  const accept = () => {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify({
      status: 'accepted',
      policy_version: '2026-06-07',
      accepted_at: new Date().toISOString(),
      authorized_use_confirmed: true,
    }))
    setVisible(false)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-gold-500/25 bg-[#09090d]/[0.98] shadow-[0_-20px_70px_rgba(0,0,0,0.65)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex max-w-4xl items-start gap-3">
          <div className="mt-0.5 border border-gold-500/25 bg-gold-500/[0.06] p-2 text-gold-400">
            <LockKeyhole className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-white">
              Privacy and authorized-use consent
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
            </div>
            <p className="mt-1 text-xs leading-6 text-gray-400">
              Vindica processes identifiers you submit to run requested scans and may send them to configured public-source or privacy-service providers.
              Signed-in scans and actions are retained in your account-scoped vault. Use Vindica only for yourself or with explicit authorization.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              By continuing, you acknowledge the <Link className="font-semibold text-gray-200 underline underline-offset-4" to="/privacy">Privacy Policy</Link>
              {' '}and agree to the <Link className="font-semibold text-gray-200 underline underline-offset-4" to="/terms">Terms of Use</Link>.
            </p>
            <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-gray-300">
              <input
                type="checkbox"
                checked={agreed}
                onChange={event => setAgreed(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-red-600"
              />
              <span>I agree to the Terms, acknowledge the Privacy Policy, and confirm I will use Vindica only for myself or authorized work.</span>
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={accept}
          disabled={!agreed}
          className="shrink-0 border border-red-400/50 bg-red-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Acknowledge and continue
        </button>
      </div>
    </div>
  )
}
