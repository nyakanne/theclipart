import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Search,
  ShieldAlert,
  UserSearch,
} from 'lucide-react'

import { api } from '@/services/api'
import { useCreateScan, usePollUntilComplete, useScanResult, useScanStatus } from '@/hooks/useScan'
import { useAuthSession } from '@/hooks/useAuthSession'
import { formatScanKind, parseScanInput } from '@/pages/home/utils'
import type {
  EvidenceItem,
  IpLookupResult,
  PhoneLookupResult,
  ScanJob,
  ScanResult,
  UsernamePlatformResult,
} from '@/types'
import { EvidencePanel } from '@/components/Investigation/EvidencePanel'
import { AuthVaultPrompt } from '@/components/auth/AuthVaultPrompt'
import { summarizeProviderCoverage } from '@/utils/providerCoverage'

type ExposureLookupPanelProps = {
  compact?: boolean
  scanResult?: ScanResult
  scanJob?: ScanJob
}

async function writeClipboard(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) throw new Error('Copy failed')
}

export function ExposureLookupPanel({
  compact = false,
  scanResult: initialResult,
  scanJob: initialJob,
}: ExposureLookupPanelProps) {
  const { isAuthenticated } = useAuthSession()
  const showForm = !initialResult
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [copied, setCopied] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [activeScanId, setActiveScanId] = useState<string | null>(initialResult?.scan_id ?? null)
  const [fallbackEvidence, setFallbackEvidence] = useState<EvidenceItem[]>([])
  const [fallbackMode, setFallbackMode] = useState<string | null>(null)

  const { mutateAsync, isPending } = useCreateScan()
  const liveScanId = initialResult?.scan_id ?? activeScanId

  usePollUntilComplete(initialResult ? null : liveScanId)

  const statusQuery = useScanStatus(initialResult ? null : liveScanId)
  const resultQuery = useScanResult(initialResult ? null : liveScanId)

  const status = initialJob ?? statusQuery.data
  const result = initialResult ?? resultQuery.data
  const activeLookup = (submitted || query).trim()
  const lookupMeta = useMemo(() => {
    if (!activeLookup) return null
    return parseScanInput(activeLookup)
  }, [activeLookup])
  const explicitEvidence = result?.evidence_items.length ? result.evidence_items : fallbackEvidence

  const statusLabel = result
    ? 'completed'
    : explicitEvidence.length
      ? 'provider resolved'
      : status?.status ?? (isPending ? 'queued' : initialResult ? 'completed' : 'ready')
  const progress = Math.max(0, Math.min(100, Math.round(status?.progress ?? (result ? 100 : 0))))
  const evidenceCount = explicitEvidence.length
  const providerCoverage = summarizeProviderCoverage(result?.provider_status ?? [])
  const providerCount = providerCoverage.attempted
  const isWorking = isPending || (!!liveScanId && !result && status?.status !== 'failed')
  const unavailableProviders = result?.provider_status.filter(item => item.status === 'unavailable') ?? []
  const showLimitedResultWarning = Boolean(
    result &&
    !explicitEvidence.length &&
    unavailableProviders.length > 0
  )

  useEffect(() => {
    if (!result || explicitEvidence.length || !lookupMeta || fallbackMode === 'lookup') return

    let cancelled = false

    const runFallbackLookup = async () => {
      try {
        if (lookupMeta.kind === 'username') {
          const platforms = await api.lookup.username(activeLookup)
          const foundPlatforms = platforms.filter(platform => platform.status === 'found')
          if (!cancelled) {
            setFallbackEvidence(foundPlatforms.map(usernamePlatformToEvidence))
            setFallbackMode('lookup')
          }
          return
        }

        if (lookupMeta.kind === 'phone') {
          const phoneData = await api.lookup.phone(activeLookup)
          if (!cancelled) {
            setFallbackEvidence([phoneLookupToEvidence(phoneData)])
            setFallbackMode('lookup')
          }
        }
      } catch {
        if (!cancelled) {
          setFallbackMode('lookup')
        }
      }
    }

    void runFallbackLookup()

    return () => {
      cancelled = true
    }
  }, [activeLookup, explicitEvidence.length, fallbackMode, lookupMeta, result])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) {
      setSubmitError('Enter a name, email, phone, IP, or username to run a live evidence scan.')
      return
    }

    setSubmitError(null)
    setSubmitted(trimmed)
    setFallbackEvidence([])
    setFallbackMode(null)

    try {
      const { body } = parseScanInput(trimmed)
      const job = await mutateAsync(body)
      setActiveScanId(job.scan_id)
    } catch (error) {
      const parsed = parseScanInput(trimmed)
      if (parsed.kind === 'ip') {
        try {
          const ipData = await api.lookup.ip(trimmed)
          setActiveScanId(null)
          setFallbackEvidence([ipLookupToEvidence(ipData)])
          setFallbackMode('provider')
          return
        } catch (lookupError) {
          setSubmitError(lookupError instanceof Error ? lookupError.message : 'Could not resolve the IP evidence lookup.')
          return
        }
      }
      setSubmitError(error instanceof Error ? error.message : 'Could not start the lookup scan.')
    }
  }

  const copyLookup = async () => {
    if (!activeLookup) return
    await writeClipboard(activeLookup)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  const layoutClass = compact ? 'grid gap-5 xl:grid-cols-[320px_1fr]' : 'grid gap-5 lg:grid-cols-[360px_1fr]'

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={layoutClass}>
      <aside className="glass-panel rounded-xl p-5">
        <div className="flex items-start gap-3 border-b border-white/10 pb-4">
          <div className="rounded-full border border-red-500/40 bg-red-950/25 p-3 text-red-300">
            <UserSearch className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold">{initialResult ? 'Vault scan evidence' : 'Find Yourself'}</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              {initialResult
                ? 'This vault scan now renders explicit evidence rows returned by the backend, with source links and save-to-vault actions.'
                : 'Run a real backend scan and render explicit evidence rows directly in the browser. No staged tool cards, no checklist placeholders.'}
            </p>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Name, email, phone, IP, or username</span>
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="you@example.com, +1 555 123 4567, 8.8.8.8, @handle"
                className="input-field font-mono text-xs"
              />
            </label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button type="submit" disabled={isPending} className="red-button-glow inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-70">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Run live evidence scan
              </button>
              <button type="button" onClick={() => void copyLookup()} className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-black/55 px-4 text-gray-300 transition-colors hover:border-red-500/50 hover:text-white">
                {copied ? <CheckCircle2 className="h-5 w-5 text-red-300" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <LookupMetric label="Lookup type" value={lookupMeta ? formatScanKind(lookupMeta.kind) : initialResult ? 'vault scan' : 'standby'} />
          <LookupMetric label="Status" value={statusLabel.replace(/_/g, ' ')} />
          <LookupMetric label="Evidence rows" value={`${evidenceCount}`} />
        </div>

        <div className="mt-4 rounded-lg border border-red-500/25 bg-red-950/10 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            <p className="text-xs leading-5 text-red-100/80">
              Results shown here are backend-returned evidence rows with explicit source links. Signed-in runs save the scan and the same evidence set into the vault/dashboard flow.
            </p>
          </div>
        </div>

        {liveScanId && (
          <div className="mt-4 rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-xs leading-5 text-gray-400">
            <div className="font-bold uppercase tracking-[0.12em] text-gray-500">Scan ID</div>
            <div className="mt-1 font-mono text-gray-300">{liveScanId}</div>
          </div>
        )}
      </aside>

      <section className="space-y-4">
        {submitError && (
          <div className="rounded-xl border border-red-500/35 bg-red-950/25 px-4 py-3 text-sm text-red-100">
            {submitError}
          </div>
        )}

        {!result && !explicitEvidence.length && !liveScanId && (
          <div className="glass-panel rounded-xl p-5">
            <div className="flex items-center gap-2 text-red-300">
              <ShieldAlert className="h-5 w-5" />
              <h3 className="font-bold text-white">Explicit evidence will appear here</h3>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
              Start a lookup scan and Vindica will render the returned breach rows, broker listings, IP enrichment, and evidence links directly in the browser. The same scan can then be opened in the vault dashboard.
            </p>
          </div>
        )}

        {isWorking && !result && (
          <div className="glass-panel rounded-xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-white">Backend evidence scan in progress</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {activeLookup
                    ? `Resolving explicit evidence for "${activeLookup}".`
                    : 'Resolving explicit evidence rows for this scan.'}
                </p>
              </div>
              <div className="rounded-lg border border-red-500/35 bg-red-950/25 px-4 py-3 text-right">
                <div className="text-2xl font-black text-red-200">{progress}%</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-100/70">{status?.status ?? 'queued'}</div>
              </div>
            </div>

            <div className="mt-5">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-red-500 transition-all duration-500" style={{ width: `${Math.max(6, progress)}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                <span>{status?.current_stage ?? 'Preparing scan pipeline'}</span>
                {status?.estimated_seconds && <span>About {status.estimated_seconds}s remaining</span>}
              </div>
            </div>
          </div>
        )}

        {status?.status === 'failed' && !result && (
          <div className="rounded-xl border border-red-500/35 bg-red-950/25 px-4 py-3 text-sm text-red-100">
            {status.current_stage}
          </div>
        )}

        {showLimitedResultWarning && (
          <div className="rounded-xl border border-amber-500/35 bg-amber-950/20 px-4 py-3 text-sm text-amber-50">
            This scan completed, but live evidence providers are not configured in this runtime yet.
            {` ${unavailableProviders.map(item => item.label).join(' and ')} `}
            are currently unavailable, so Vindica can only return what the local runtime can verify without those sources.
          </div>
        )}

        {(result || explicitEvidence.length > 0) && (
          <>
            <div className="glass-panel rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">Resolved evidence</div>
                  <h3 className="mt-2 text-2xl font-black text-white">
                    {activeLookup
                      ? `Explicit results for ${activeLookup}`
                      : result
                        ? `Scan ${result.scan_id}`
                        : 'Provider-backed lookup evidence'}
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                    These rows are what the backend actually returned: source URLs, evidence details, risk level, and next actions. No aggregator staging view in the middle.
                  </p>
                  {fallbackMode === 'provider' && !result && (
                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      Local runtime note: this browser is currently resolving the IP provider evidence path directly because the full scan queue is not mounted in the dev lookup shim.
                    </p>
                  )}
                  {fallbackMode === 'lookup' && !(result?.evidence_items.length ?? 0) && (
                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      Built-in in-app fallback lookup kicked in because the main scan finished without explicit evidence rows for this subject.
                    </p>
                  )}
                </div>
                {result?.scan_id ? (
                  <Link
                    to={`/scan/${result.scan_id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-500/35 bg-red-950/20 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/30"
                  >
                    Open vault scan
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-5">
                <LookupMetric label="Evidence rows" value={`${explicitEvidence.length}`} />
                <LookupMetric label="Breach rows" value={`${result?.breaches.length ?? 0}`} />
                <LookupMetric label="Broker listings" value={`${result?.broker_listings.length ?? 0}`} />
                <LookupMetric label="Provider coverage" value={`${providerCoverage.successful}/${providerCount}`} />
                <LookupMetric label="Risk score" value={`${Math.round(result?.risk_score ?? 0)}`} />
              </div>
              {result && (
                <p className="mt-4 text-xs leading-5 text-gray-500">
                  {providerCoverage.confirmedItems > 0
                    ? `${providerCoverage.confirmedItems} provider-confirmed item(s).`
                    : 'No provider-confirmed items were returned.'}
                  {` ${providerCoverage.noMatch} source(s) returned no match, ${providerCoverage.unavailable} unavailable, and ${providerCoverage.failed} failed.`}
                  {providerCoverage.limited
                    ? ' This is a limited-coverage result, not proof that no exposure exists.'
                    : ' All attempted sources returned a definitive response.'}
                </p>
              )}
            </div>

            <div className="glass-panel rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-white">Explicit evidence returned by the scan</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Every row below comes from the backend scan result and includes the source link that will be preserved with the vault record.
                  </p>
                </div>
                {!isAuthenticated && (
                  <Link to="/account" className="text-sm font-bold text-red-200 underline decoration-red-300/60 underline-offset-4">
                    Sign in or create vault access
                  </Link>
                )}
              </div>

              <div className="mt-4">
                <EvidencePanel
                  items={explicitEvidence}
                  scanId={result?.scan_id ?? liveScanId}
                  providerStatus={result?.provider_status ?? []}
                  queryLabel={activeLookup}
                />
              </div>
              {!isAuthenticated && (
                <AuthVaultPrompt
                  compact
                  className="mt-4"
                  title="Preserve this evidence privately"
                  body="The explicit rows above are real backend results. Sign in or create your vault to keep the same source links, timestamps, and follow-up actions attached to your private case history."
                  ctaLabel="Save this scan privately"
                />
              )}
            </div>
          </>
        )}
      </section>
    </motion.div>
  )
}

function LookupMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/45 p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{label}</div>
      <div className="mt-2 text-lg font-black capitalize text-white">{value}</div>
    </div>
  )
}

function ipLookupToEvidence(data: IpLookupResult): EvidenceItem {
  return {
    id: `ip:${data.ip}`,
    kind: 'ip_enrichment',
    title: `IP network trace for ${data.ip}`,
    source_name: data.source_name,
    source_category: 'ip_enrichment',
    source_url: data.source_url,
    detail: [data.country || 'Unknown country', data.as_name || 'Unknown ASN'].join(' · '),
    risk_level: 'info',
    confidence: 'provider',
    captured_at: new Date().toISOString(),
    exposed_fields: ['ip', data.asn ? 'asn' : '', data.country ? 'country' : ''].filter(Boolean),
    action_label: 'Open provider record',
  }
}

function usernamePlatformToEvidence(platform: UsernamePlatformResult): EvidenceItem {
  return {
    id: `username:${platform.name}:${platform.url}`,
    kind: 'search_result',
    title: `${platform.name} username match`,
    source_name: platform.name,
    source_category: 'username_probe',
    source_url: platform.url,
    detail: `Built-in platform probe found a public profile in the ${platform.category} category.`,
    risk_level: 'medium',
    confidence: 'platform_probe',
    captured_at: new Date().toISOString(),
    exposed_fields: ['username', 'profile'],
    action_label: 'Open platform profile',
  }
}

function phoneLookupToEvidence(data: PhoneLookupResult): EvidenceItem {
  const timezoneSummary = data.timezones.length ? data.timezones.join(', ') : 'Unknown timezone'
  return {
    id: `phone:${data.e164 || data.input}`,
    kind: 'search_result',
    title: `Phone profile for ${data.e164 || data.input}`,
    source_name: 'Google libphonenumber',
    source_category: 'phone_enrichment',
    source_url: 'https://github.com/google/libphonenumber',
    detail: `${data.country || 'Unknown country'} · ${data.carrier || 'Unknown carrier'} · ${data.line_type || 'Unknown line type'} · ${timezoneSummary}`,
    risk_level: 'info',
    confidence: 'provider',
    captured_at: new Date().toISOString(),
    exposed_fields: ['phone', 'country', 'carrier'],
    action_label: 'Open library source',
  }
}
