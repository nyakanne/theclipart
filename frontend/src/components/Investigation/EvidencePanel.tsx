import { Database, ExternalLink, Globe2, Link2, Loader2, Lock, ShieldAlert, Vault } from 'lucide-react'
import type { EvidenceItem, ManualEvidenceRequest, ProviderStatus } from '@/types'
import { SeverityBadge } from '@/components/ui/Badge'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { FormEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthSession } from '@/hooks/useAuthSession'
import { getProviderSetup } from './providerSetup'

const kindIcon = {
  breach: <Database className="h-4 w-4" />,
  broker_listing: <Globe2 className="h-4 w-4" />,
  honey_token: <Link2 className="h-4 w-4" />,
  ip_enrichment: <ShieldAlert className="h-4 w-4" />,
  search_result: <ExternalLink className="h-4 w-4" />,
  manual_capture: <Vault className="h-4 w-4" />,
} as const

type EvidencePanelProps = {
  items: EvidenceItem[]
  scanId?: string | null
  providerStatus?: ProviderStatus[]
  queryLabel?: string
}

const providerTone = {
  completed: 'border-emerald-500/25 bg-emerald-950/15 text-emerald-100/90',
  failed: 'border-red-500/35 bg-red-950/20 text-red-100/90',
  no_match: 'border-amber-500/30 bg-amber-950/15 text-amber-100/90',
  unavailable: 'border-amber-500/30 bg-amber-950/15 text-amber-100/90',
  skipped: 'border-white/10 bg-black/35 text-gray-300',
} as const

export function EvidencePanel({
  items,
  scanId,
  providerStatus = [],
  queryLabel,
}: EvidencePanelProps) {
  const { isAuthenticated } = useAuthSession()
  const queryClient = useQueryClient()
  const [savedIds, setSavedIds] = useState<Record<string, string>>({})
  const [manualSource, setManualSource] = useState<ManualEvidenceRequest>({
    title: '',
    source_name: '',
    source_url: '',
    detail: '',
    risk_level: 'medium',
    source_category: 'manual_capture',
    confidence: 'manual_capture',
    exposed_fields: [],
    action_label: 'Open source page',
  })
  const [manualFields, setManualFields] = useState('')
  const saveMutation = useMutation({
    mutationFn: async (item: EvidenceItem) => api.command.create({
      feature: 'evidence-item',
      title: item.title,
      status: 'saved',
      payload: item as unknown as Record<string, unknown>,
    }),
    onSuccess: action => {
      const evidenceId = String(action.payload?.id ?? '')
      if (evidenceId) {
        setSavedIds(current => ({ ...current, [evidenceId]: action.id }))
      }
      queryClient.invalidateQueries({ queryKey: ['command-actions', 'evidence-item'] })
    },
  })
  const manualCaptureMutation = useMutation({
    mutationFn: async (body: ManualEvidenceRequest) => api.scan.captureManualEvidence(scanId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scan-result', scanId] })
      queryClient.invalidateQueries({ queryKey: ['command-actions'] })
      setManualSource({
        title: '',
        source_name: '',
        source_url: '',
        detail: '',
        risk_level: 'medium',
        source_category: 'manual_capture',
        confidence: 'manual_capture',
        exposed_fields: [],
        action_label: 'Open source page',
      })
      setManualFields('')
    },
  })
  const manualCaptureAvailable = Boolean(scanId)
  const shouldShowManualCapture = manualCaptureAvailable && (
    providerStatus.some(status => status.fallback_available) || !items.length
  )
  const providerSummary = useMemo(
    () => providerStatus.filter(status => status.status !== 'skipped'),
    [providerStatus]
  )

  const handleManualCapture = (event: FormEvent) => {
    event.preventDefault()
    if (!scanId) return
    const body: ManualEvidenceRequest = {
      ...manualSource,
      exposed_fields: manualFields
        .split(',')
        .map(field => field.trim())
        .filter(Boolean),
      captured_at: manualSource.captured_at || new Date().toISOString(),
    }
    manualCaptureMutation.mutate(body)
  }

  return (
    <div className="space-y-3">
      {!!providerSummary.length && (
        <div className="grid gap-3 md:grid-cols-2">
          {providerSummary.map(status => {
            const setup = getProviderSetup(status.provider)
            return (
            <div
              key={`${status.provider}-${status.status}`}
              className={`rounded-xl border px-4 py-3 ${providerTone[status.status] ?? providerTone.skipped}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white">{status.label}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em]">
                  {status.status.replace(/_/g, ' ')}
                </div>
              </div>
              <p className="mt-2 text-sm leading-6">{status.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-white/70">
                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">
                  {status.item_count} item{status.item_count === 1 ? '' : 's'}
                </span>
                {status.fallback_available && (
                  <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">
                    manual fallback ready
                  </span>
                )}
              </div>
              {status.status === 'unavailable' && setup?.requiredSettings.length ? (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {setup.requiredSettings.map(setting => (
                      <code
                        key={`${status.provider}-${setting}`}
                        className="rounded-md border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] text-white/80"
                      >
                        {setting}
                      </code>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <a
                      href={setup.setupHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/25 px-2.5 py-1 text-white/85 transition-colors hover:border-red-500/35 hover:text-white"
                    >
                      {setup.setupLabel}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {setup.docsHref ? (
                      <a
                        href={setup.docsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/25 px-2.5 py-1 text-white/70 transition-colors hover:border-white/20 hover:text-white"
                      >
                        {setup.docsLabel ?? 'Docs'}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            )
          })}
        </div>
      )}

      {shouldShowManualCapture && (
        <form onSubmit={handleManualCapture} className="glass-panel rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full border border-[#d4af37]/35 bg-[#d4af37]/10 p-2 text-[#d4af37]">
              <Vault className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Bring the source into the vault yourself</h3>
              <p className="mt-1 text-sm leading-6 text-gray-400">
                If a provider missed or failed, we can still preserve the evidence trail. Search it ourselves, then capture the source URL, summary, and exposed fields here so it appears in this scan, the vault, and the report.
                {queryLabel ? ` Current subject: ${queryLabel}.` : ''}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Title</span>
              <input
                value={manualSource.title}
                onChange={event => setManualSource(current => ({ ...current, title: event.target.value }))}
                placeholder="Whitepages listing for +1 555 123 4567"
                className="input-field text-sm"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Source name</span>
              <input
                value={manualSource.source_name}
                onChange={event => setManualSource(current => ({ ...current, source_name: event.target.value }))}
                placeholder="Whitepages"
                className="input-field text-sm"
                required
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Source URL</span>
              <input
                value={manualSource.source_url}
                onChange={event => setManualSource(current => ({ ...current, source_url: event.target.value }))}
                placeholder="https://www.whitepages.com/..."
                className="input-field font-mono text-sm"
                required
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Evidence summary</span>
              <textarea
                value={manualSource.detail}
                onChange={event => setManualSource(current => ({ ...current, detail: event.target.value }))}
                placeholder="Phone, address, and relatives are visible on the public page."
                className="input-field min-h-[112px] text-sm"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Risk</span>
              <select
                value={manualSource.risk_level}
                onChange={event => setManualSource(current => ({ ...current, risk_level: event.target.value as ManualEvidenceRequest['risk_level'] }))}
                className="input-field text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Exposed fields</span>
              <input
                value={manualFields}
                onChange={event => setManualFields(event.target.value)}
                placeholder="phone, address, relatives"
                className="input-field text-sm"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={manualCaptureMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d4af37]/35 bg-[#d4af37]/10 px-4 py-2 text-sm font-bold text-[#f4d889] transition-colors hover:border-[#d4af37]/50 hover:bg-[#d4af37]/15 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {manualCaptureMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Vault className="h-4 w-4" />}
              Capture evidence into scan
            </button>
            <span className="text-xs text-gray-500">
              Saved captures flow back into this scan result, the vault, and generated reports.
            </span>
          </div>

          {manualCaptureMutation.isError && (
            <p className="mt-3 text-sm text-red-300">{manualCaptureMutation.error.message}</p>
          )}
        </form>
      )}

      {!items.length && (
        <div className="py-12 text-center text-gray-500">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p>No linked evidence items yet.</p>
        </div>
      )}

      {items.map(item => (
        <div key={item.id} className="glass-panel rounded-xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-red-300">{kindIcon[item.kind] ?? <Globe2 className="h-4 w-4" />}</span>
                <h3 className="font-semibold text-white">{item.title}</h3>
                <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  {item.source_category.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{item.detail}</p>
            </div>
            <SeverityBadge severity={item.risk_level} label={item.risk_level.toUpperCase()} />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="grid gap-2 text-xs text-gray-400 sm:grid-cols-3">
              <Meta label="Source" value={item.source_name} />
              <Meta label="Confidence" value={item.confidence} />
              <Meta label="Captured" value={formatEvidenceDate(item.captured_at)} />
            </div>
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/35 bg-red-950/20 px-4 py-2 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/30"
            >
              {item.action_label}
              <ExternalLink className="h-4 w-4" />
            </a>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => saveMutation.mutate(item)}
                disabled={Boolean(savedIds[item.id]) || saveMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/45 px-4 py-2 text-sm font-bold text-gray-200 transition-colors hover:border-[#d4af37]/45 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveMutation.isPending && saveMutation.variables?.id === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Vault className="h-4 w-4" />}
                {savedIds[item.id] ? 'Saved to vault' : 'Save to vault'}
              </button>
            ) : (
              <Link
                to="/account"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/45 px-4 py-2 text-sm font-bold text-gray-200 transition-colors hover:border-red-500/45 hover:text-white"
              >
                <Lock className="h-4 w-4" />
                Sign in to save
              </Link>
            )}
          </div>

          {!!item.exposed_fields.length && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {item.exposed_fields.map(field => (
                <span key={field} className="rounded-md border border-white/10 bg-black/35 px-2 py-0.5 text-xs text-gray-300">
                  {field}
                </span>
              ))}
            </div>
          )}

          {saveMutation.isError && saveMutation.variables?.id === item.id && (
            <p className="mt-3 text-sm text-red-300">{saveMutation.error.message}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/35 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{label}</div>
      <div className="mt-1 truncate text-sm text-gray-200">{value}</div>
    </div>
  )
}

function formatEvidenceDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString()
}
