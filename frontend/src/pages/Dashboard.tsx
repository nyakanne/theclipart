import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, CheckCircle, XCircle, Loader, Plus, ShieldAlert, Bell, Hash, ExternalLink, Vault, Database, Search, ShieldCheck, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { CommandAction, ScanJob } from '@/types'
import { useAuthSession } from '@/hooks/useAuthSession'
import { AuthVaultPrompt } from '@/components/auth/AuthVaultPrompt'

const statusIcon = {
  idle:      <Clock className="h-4 w-4 text-gray-500" />,
  queued:    <Clock className="h-4 w-4 text-red-200" />,
  scanning:  <Loader className="h-4 w-4 text-brand-400 animate-spin" />,
  completed: <CheckCircle className="h-4 w-4 text-gray-200" />,
  failed:    <XCircle className="h-4 w-4 text-red-400" />,
}

export function Dashboard() {
  const { isAuthenticated } = useAuthSession()
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null)
  const { data: scans = [], isLoading } = useQuery({
    queryKey: ['scans'],
    queryFn: () => api.scan.list(),
    refetchInterval: 5000,
    enabled: isAuthenticated,
  })
  const selectedCompletedScanId = selectedScanId ?? scans.find(scan => scan.status === 'completed')?.scan_id ?? null
  const { data: selectedResult, isLoading: isResultLoading } = useQuery({
    queryKey: ['scan-result', 'dashboard', selectedCompletedScanId],
    queryFn: () => api.scan.result(selectedCompletedScanId!),
    enabled: isAuthenticated && Boolean(selectedCompletedScanId),
  })
  const { data: savedEvidence = [] } = useQuery({
    queryKey: ['command-actions', 'evidence-item'],
    queryFn: () => api.command.list('evidence-item'),
    enabled: isAuthenticated,
  })
  const { data: savedArtifacts = [] } = useQuery({
    queryKey: ['command-actions', 'all'],
    queryFn: () => api.command.list(),
    enabled: isAuthenticated,
  })
  const vaultArtifacts = savedArtifacts.filter(action => action.feature !== 'evidence-item').slice(0, 6)

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="premium-panel rounded-[28px] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f5d7a1]">Command vault</p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Saved scans and live defenses</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300">
              Review active investigations, reopen saved exposure maps, and keep your removals, alerts, and evidence trails in one retained operating surface.
            </p>
          </div>
          <Link to="/">
            <Button icon={<Plus className="h-4 w-4" />}>New Scan</Button>
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { icon: ShieldAlert, label: 'Active scans', value: `${scans.filter(scan => scan.status === 'scanning' || scan.status === 'queued').length}`, detail: 'Investigations still resolving' },
            { icon: Bell, label: 'Completed vault items', value: `${scans.filter(scan => scan.status === 'completed').length}`, detail: 'Resolved reports ready to reopen' },
            { icon: Hash, label: 'Failed or interrupted', value: `${scans.filter(scan => scan.status === 'failed').length}`, detail: 'Needs rerun or review' },
          ].map(({ icon: Icon, label, value, detail }) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-black/35 p-4">
              <Icon className="h-5 w-5 text-[#f5d7a1]" />
              <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">{label}</div>
              <div className="mt-1 text-3xl font-black text-white">{value}</div>
              <div className="mt-1 text-xs text-gray-500">{detail}</div>
            </div>
          ))}
        </div>
      </div>

      {!isAuthenticated && (
        <AuthVaultPrompt
          title="Sign in or create your private vault before opening case history"
          body="The dashboard is an account-scoped privacy surface. Sign in to unlock saved scans, evidence receipts, removals, alerts, and report packets without exposing that history publicly."
        />
      )}

      {isAuthenticated && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f5d7a1]">Result windows</p>
              <h2 className="mt-1 text-xl font-black text-[#fff7e8]">Your saved investigations</h2>
            </div>
            <p className="text-xs text-gray-500">Each window is scoped to your signed-in vault.</p>
          </div>

          {!scans.length && !isLoading ? (
            <div className="rounded-xl border border-white/10 bg-black/30 px-5 py-8 text-center text-sm text-gray-500">
              Your first completed scan will open here with its exposure and risk values.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {scans.slice(0, 6).map(scan => {
                const isSelected = selectedCompletedScanId === scan.scan_id
                const privacyScore = Math.max(0, Math.round(100 - scan.risk_score))
                return (
                  <button
                    key={scan.scan_id}
                    type="button"
                    disabled={scan.status !== 'completed'}
                    onClick={() => setSelectedScanId(scan.scan_id)}
                    className={`min-h-44 border p-4 text-left transition-colors ${
                      isSelected
                        ? 'border-red-400/60 bg-red-950/25'
                        : 'border-white/10 bg-black/35 hover:border-white/20'
                    } disabled:cursor-default disabled:opacity-65`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                          {scan.subject_kind?.replace(/_/g, ' ') ?? 'identity scan'}
                        </div>
                        <div className="mt-1 truncate text-base font-black text-white">{scan.subject ?? scan.scan_id}</div>
                      </div>
                      {statusIcon[scan.status]}
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <div className="border-l border-red-400/50 pl-3">
                        <div className="text-2xl font-black text-red-200">{scan.total_exposures}</div>
                        <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Exposures</div>
                      </div>
                      <div className="border-l border-[#f5d7a1]/40 pl-3">
                        <div className="text-2xl font-black text-[#fff7e8]">{privacyScore}</div>
                        <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">Privacy score</div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2 text-xs">
                      <span className={scan.vault_saved ? 'text-emerald-300' : 'text-amber-300'}>
                        {scan.vault_saved ? 'Saved to vault' : 'Vault not confirmed'}
                      </span>
                      <span className="capitalize text-gray-500">{scan.status}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {selectedCompletedScanId && (
            <div className="border border-white/10 bg-[#070708] p-5 sm:p-6">
              {isResultLoading || !selectedResult ? (
                <div className="flex min-h-36 items-center justify-center text-gray-500">
                  <Loader className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
                        <ShieldCheck className="h-4 w-4" />
                        {selectedResult.vault_saved ? 'Vault-owned result' : 'Vault ownership not confirmed'}
                      </div>
                      <h3 className="mt-2 text-2xl font-black text-white">
                        {Object.values(selectedResult.query).find(Boolean) ?? selectedResult.scan_id}
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Completed {new Date(selectedResult.completed_at ?? selectedResult.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Link to={`/scan/${selectedResult.scan_id}`}>
                      <Button icon={<ChevronRight className="h-4 w-4" />}>Open full result</Button>
                    </Link>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { icon: ShieldAlert, label: 'Exposure value', value: selectedResult.total_exposures },
                      { icon: Search, label: 'Evidence sources', value: selectedResult.evidence_items.length },
                      { icon: Database, label: 'Breach records', value: selectedResult.breaches.length },
                      { icon: ShieldCheck, label: 'Privacy score', value: Math.max(0, Math.round(100 - selectedResult.risk_score)) },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="border border-white/8 bg-black/35 p-4">
                        <Icon className="h-4 w-4 text-red-300" />
                        <div className="mt-3 text-2xl font-black text-white">{value}</div>
                        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {selectedResult.provider_status.map(provider => (
                      <span key={provider.provider} className="border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">
                        {provider.label}: {provider.status.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-[#fff7e8]">Recent scans</h2>
        <Link to="/">
          <Button icon={<Plus className="h-4 w-4" />}>New Scan</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <span className="font-semibold text-white">Saved evidence</span>
        </CardHeader>
        <CardBody className="space-y-3">
          {!savedEvidence.length && (
            <div className="py-8 text-center text-gray-500">
              <Vault className="mx-auto mb-3 h-6 w-6 opacity-50" />
              <p className="text-sm">{isAuthenticated ? 'No evidence items saved yet.' : 'No private evidence visible until you sign in.'}</p>
              <p className="mt-1 text-xs text-gray-600">
                {isAuthenticated
                  ? 'Save source-backed findings from a scan to keep them in your vault.'
                  : 'Source-backed findings, timestamps, and vault actions appear here after the account gate is active.'}
              </p>
            </div>
          )}
          {savedEvidence.slice(0, 6).map((action: CommandAction) => {
            const payload = action.payload as Record<string, unknown>
            const sourceUrl = typeof payload.source_url === 'string' ? payload.source_url : ''
            const sourceName = typeof payload.source_name === 'string' ? payload.source_name : action.title
            const detail = typeof payload.detail === 'string' ? payload.detail : ''
            const capturedAt = typeof payload.captured_at === 'string' ? payload.captured_at : ''
            return (
              <div key={action.id} className="rounded-xl border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white">{action.title}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.14em] text-[#f5d7a1]">{sourceName}</div>
                    {detail && <p className="mt-2 text-sm text-gray-400">{detail}</p>}
                    <p className="mt-2 text-xs text-gray-500">
                      Saved {new Date(action.created_at).toLocaleString()}
                      {capturedAt ? ` · Captured ${new Date(capturedAt).toLocaleString()}` : ''}
                    </p>
                  </div>
                  {sourceUrl && (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-2 text-xs font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/30"
                    >
                      Open source <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <span className="font-semibold text-white">Saved vault artifacts</span>
        </CardHeader>
        <CardBody className="space-y-3">
          {!vaultArtifacts.length && (
            <div className="py-8 text-center text-gray-500">
              <Vault className="mx-auto mb-3 h-6 w-6 opacity-50" />
              <p className="text-sm">{isAuthenticated ? 'No saved packets yet.' : 'No private packets visible until you sign in.'}</p>
              <p className="mt-1 text-xs text-gray-600">
                {isAuthenticated
                  ? 'Image receipts, authority packets, trackers, removals, and email blasts will land here once saved.'
                  : 'Account-scoped packets stay hidden until the private vault is unlocked.'}
              </p>
            </div>
          )}
          {vaultArtifacts.map((action: CommandAction) => {
            const payload = action.payload as Record<string, unknown>
            const summary = typeof payload.body === 'string'
              ? payload.body
              : typeof payload.notes === 'string'
                ? payload.notes
                : typeof payload.packet === 'string'
                  ? payload.packet
                  : ''
            return (
              <div key={action.id} className="rounded-xl border border-white/8 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-white">{action.title}</div>
                      <span className="rounded border border-red-500/30 bg-red-950/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-red-200">
                        {action.feature.replace(/-/g, ' ')}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Saved {new Date(action.created_at).toLocaleString()}</p>
                    {summary && (
                      <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/45 p-3 font-mono text-[11px] leading-5 text-gray-300">
                        {summary}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <span className="font-semibold text-white">Vault timeline</span>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading && (
            <div className="py-12 text-center text-gray-500">
              <Loader className="mx-auto h-6 w-6 animate-spin" />
            </div>
          )}
          {!isLoading && !scans.length && (
            <div className="py-12 text-center text-gray-500">
              <p className="text-sm">{isAuthenticated ? 'No scans stored yet.' : 'No private scan history is visible yet.'}</p>
              <Link to={isAuthenticated ? '/' : '/account'} className="mt-2 inline-block text-sm text-red-300 hover:text-white">
                {isAuthenticated ? 'Start your first scan →' : 'Sign in or create vault access →'}
              </Link>
            </div>
          )}
          {scans.map((scan: ScanJob) => (
            <Link
              key={scan.scan_id}
              to={`/scan/${scan.scan_id}`}
              className="flex items-center gap-3 border-b border-gray-800 px-6 py-4 last:border-0 transition-colors hover:bg-red-950/12"
            >
              {statusIcon[scan.status]}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-gray-200">{scan.subject ?? scan.scan_id}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(scan.created_at).toLocaleString()} · {scan.current_stage}
                </p>
              </div>
              {scan.status === 'scanning' && (
                <div className="w-24">
                  <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500 transition-all"
                      style={{ width: `${scan.progress}%` }}
                    />
                  </div>
                </div>
              )}
              <span className={`text-xs capitalize ${
                scan.status === 'completed' ? 'text-gray-200' :
                scan.status === 'failed'    ? 'text-red-400' :
                scan.status === 'scanning'  ? 'text-[#f5d7a1]' : 'text-gray-500'
              }`}>
                {scan.status}
              </span>
            </Link>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}
