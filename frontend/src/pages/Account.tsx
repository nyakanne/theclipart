import { FormEvent, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Database, FileText, ListChecks, LogOut, Mail, ShieldAlert, Lock, Bell, Trash2 } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { AuthVaultPrompt } from '@/components/auth/AuthVaultPrompt'
import { VaultActivationTransition } from '@/components/auth/VaultActivationTransition'
import { useAuthSession } from '@/hooks/useAuthSession'
import { api } from '@/services/api'

const VAULT_ITEMS = [
  { icon: Database, title: 'Saved scans', detail: 'Keep exposure maps and source links tied to your account.' },
  { icon: ListChecks, title: 'Removal queues', detail: 'Return to opt-outs, broker targets, and action status.' },
  { icon: FileText, title: 'Evidence records', detail: 'Preserve receipts, reports, and authority-ready notes.' },
] as const

function authRedirectUrl() {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined
  if (configuredUrl) return `${configuredUrl.replace(/\/$/, '')}/account`

  const origin = window.location.origin
  if (window.location.hostname === 'vindica.me' || window.location.hostname === 'www.vindica.me') {
    return 'https://www.vindica.me/account'
  }

  return `${origin}/account`
}

export function Account() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [showActivation, setShowActivation] = useState(false)
  const { isConfigured, isReady, sessionEmail } = useAuthSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isReady || !sessionEmail) return
    const consentSyncKey = `vindica-consent-synced:${sessionEmail}`
    const consent = window.localStorage.getItem('vindica-consent:v1')
    if (consent && !window.localStorage.getItem(consentSyncKey)) {
      try {
        const payload = JSON.parse(consent) as Record<string, unknown>
        void api.command.create({
          feature: 'legal-consent',
          title: 'Terms, privacy, and authorized-use consent',
          status: 'accepted',
          payload,
        })
          .then(() => window.localStorage.setItem(consentSyncKey, 'true'))
          .catch(() => undefined)
      } catch {
        // A malformed local record is ignored; the consent notice will be shown again.
        window.localStorage.removeItem('vindica-consent:v1')
      }
    }
    const activationKey = `vindica-vault-welcome:${sessionEmail}`
    if (window.sessionStorage.getItem(activationKey)) return

    window.sessionStorage.setItem(activationKey, 'shown')
    setShowActivation(true)
    const timer = window.setTimeout(() => {
      setShowActivation(false)
      navigate('/dashboard')
    }, 4200)
    return () => window.clearTimeout(timer)
  }, [isReady, navigate, sessionEmail])

  const signIn = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !accepted) return
    setLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: authRedirectUrl(),
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
  }

  const deleteVaultData = async () => {
    const confirmed = window.confirm(
      'Permanently delete every saved scan and its linked breach, broker, sentinel, compliance, and removal records from your Vindica vault? This cannot be undone.'
    )
    if (!confirmed) return
    setLoading(true)
    setMessage(null)
    try {
      const result = await api.scan.deleteAll()
      setMessage(`${result.deleted} saved scan${result.deleted === 1 ? '' : 's'} and ${result.actions_deleted} saved action${result.actions_deleted === 1 ? '' : 's'} permanently deleted from your vault.`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Vault deletion failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence>
        {showActivation && sessionEmail ? (
          <VaultActivationTransition
            email={sessionEmail}
            onContinue={() => {
              setShowActivation(false)
              navigate('/dashboard')
            }}
          />
        ) : null}
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.055),transparent_28rem),radial-gradient(circle_at_84%_14%,rgba(212,175,55,0.08),transparent_22rem)]" />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="account-vault-panel rounded-[28px] p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="flex items-start gap-4">
                <div className="rounded-[18px] border border-[#d4af37]/25 bg-[linear-gradient(145deg,rgba(212,175,55,0.12),rgba(255,255,255,0.025))] p-4 text-[#f5d7a1] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#f5d7a1]">Secure account</p>
                  <h1 className="mt-2 text-3xl font-black text-[#f7f7f5] sm:text-4xl">Your Vindica vault</h1>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-gray-300">
                    Sign in to preserve scans, removals, reports, evidence receipts, and alert history inside a private vault scoped to your account.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 border-y border-white/10 py-5 sm:grid-cols-3">
                {VAULT_ITEMS.map(({ icon: Icon, title, detail }) => (
                  <div key={title} className="rounded-2xl border border-white/8 bg-black/30 p-4">
                    <Icon className="h-4 w-4 text-[#f5d7a1]" />
                    <div className="mt-3 text-sm font-bold text-white">{title}</div>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {[
                { icon: Lock, title: 'Vault security', detail: 'Magic-link access, account-scoped storage, and retained case history.' },
                { icon: Bell, title: 'Signal continuity', detail: 'Return to live alerts, unresolved removals, and evidence chains.' },
              ].map(({ icon: Icon, title, detail }) => (
                <div key={title} className="tilt-card account-vault-card rounded-2xl p-5">
                  <Icon className="h-5 w-5 text-[#f5d7a1]" />
                  <div className="mt-3 text-lg font-black text-[#fff7e8]">{title}</div>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          {!isConfigured && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-950/15 p-4 text-sm leading-6 text-red-100/85">
              Supabase is not configured in this frontend build. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` before hosting.
            </div>
          )}

          {sessionEmail ? (
            <div className="mt-6 rounded-[24px] border border-red-500/30 bg-red-950/15 p-5">
              <div className="flex items-center gap-3 text-red-100">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-bold">Signed in as {sessionEmail}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                New scans and command actions can now be sealed into your Vindica vault.
              </p>
              <button
                type="button"
                onClick={signOut}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/55 px-4 py-3 text-sm font-bold text-gray-200 transition-colors hover:border-red-500/50 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
              <button
                type="button"
                onClick={deleteVaultData}
                disabled={loading}
                className="ml-3 mt-4 inline-flex items-center gap-2 rounded-xl border border-red-500/35 bg-red-950/20 px-4 py-3 text-sm font-bold text-red-200 transition-colors hover:border-red-400 hover:text-white disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete saved vault data
              </button>
            </div>
          ) : (
            <form onSubmit={signIn} className="mt-6 max-w-2xl space-y-4">
              <AuthVaultPrompt
                compact
                tone="neutral"
                title="Create private vault access before you leave the page"
                body="One secure magic link signs you in or creates your private vault. After that, scans, removals, reports, and evidence history stay account-scoped instead of evaporating with the browser session."
                ctaLabel="Create vault access"
              />
              <p className="text-sm leading-6 text-gray-400">
                Use a secure email link before scanning when you want the exposure graph, removals, reports, and evidence history saved for later.
              </p>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={!isConfigured}
                  className="input-field"
                />
              </label>
              <label className="flex items-start gap-3 border-l-2 border-[#d4af37]/40 bg-[#d4af37]/[0.04] px-4 py-3 text-xs leading-6 text-gray-400">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={event => setAccepted(event.target.checked)}
                  required
                  className="mt-1 h-4 w-4 accent-red-600"
                />
                <span>
                  I agree to the <Link to="/terms" className="font-semibold text-white underline decoration-white/25 underline-offset-4">Terms of Use</Link> and acknowledge the <Link to="/privacy" className="font-semibold text-white underline decoration-white/25 underline-offset-4">Privacy Policy</Link>. I will use Vindica only for myself or authorized safety work.
                </span>
              </label>
              <button
                type="submit"
                disabled={!isConfigured || loading || !accepted}
                className="red-button-glow inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                {loading ? 'Sending link...' : 'Send secure sign-in / vault link'}
              </button>
            </form>
          )}

          {message && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/45 p-4 text-sm leading-6 text-gray-300">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
