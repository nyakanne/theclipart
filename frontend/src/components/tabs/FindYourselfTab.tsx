import { useState } from 'react'
import { Search, ShieldAlert, Database, AlertTriangle, ExternalLink, Loader, RotateCcw, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface BreachRecord {
  source: string; severity: string; exposed_fields: string[]
  breach_date?: string; record_count?: number; description?: string
  source_type?: string
}
interface BrokerListing {
  broker_name: string; broker_url?: string; opt_out_url?: string
  fields_exposed?: string[]; dsar_eligible?: boolean
}
interface HibpEvidence {
  source_name: string; source_url?: string; action_label: string
  risk_level: string; captured_at?: string; exposed_fields: string[]
}
interface HibpProvider {
  status: 'unavailable' | 'no_match' | 'failed' | 'completed'
  breach_count: number; paste_count: number; evidence: HibpEvidence[]
}
interface ScanResult {
  scan_id: string; status: string; total_exposures: number; risk_score: number
  breaches: BreachRecord[]; broker_listings: BrokerListing[]; hibp_provider?: HibpProvider | null
}

const SEV: Record<string, string> = {
  critical: 'text-red-400 bg-red-950/40 border-red-900/50',
  high:     'text-red-400 bg-red-950/30 border-red-900/40',
  medium:   'text-red-300 bg-red-950/20 border-red-900/30',
  low:      'text-gray-400 bg-gray-900/40 border-gray-800',
}

export function FindYourselfTab() {
  const [query, setQuery] = useState('')
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const token = useAuthStore(s => s.token)

  function headers() {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token && token !== 'demo-token-vindica') h['Authorization'] = `Bearer ${token}`
    return h
  }

  // Detect whether the query looks like an email, phone, or name
  function buildPayload(q: string) {
    const trimmed = q.trim()
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return { email: trimmed }
    if (/^\+?[\d\s\-().]{7,20}$/.test(trimmed)) return { phone: trimmed }
    return { full_name: trimmed }
  }

  async function runScan() {
    if (!query.trim()) return
    setScanning(true); setResult(null); setError(''); setProgress(0); setStage('Starting scan…')

    try {
      const payload = buildPayload(query)
      const res = await fetch('/api/v1/scans', {
        method: 'POST', headers: headers(), body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`Scan failed (${res.status})`)
      const { scan_id } = await res.json()

      // Poll for completion
      while (true) {
        await new Promise(r => setTimeout(r, 1000))
        const s = await fetch(`/api/v1/scans/${scan_id}/status`, { headers: headers() })
        const job = await s.json()
        setProgress(job.progress ?? 0)
        if (job.current_stage) setStage(job.current_stage)
        if (job.status === 'completed' || job.status === 'failed') break
      }

      const full = await fetch(`/api/v1/scans/${scan_id}`, { headers: headers() })
      setResult(await full.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const ev = result?.hibp_provider?.evidence ?? []
  const evBySource = Object.fromEntries(ev.map(e => [e.source_name, e]))

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="card-dark p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold tracking-[0.15em] text-red-500 uppercase">Exposure Audit</span>
          <span className="h-px w-12 bg-red-900/50" />
        </div>
        <h1 className="text-2xl font-black text-white leading-tight mb-1">See What They See.</h1>
        <h2 className="text-2xl font-black text-red-500 leading-tight mb-3">Find Yourself First.</h2>
        <p className="text-sm text-gray-400 max-w-md leading-relaxed">
          Enter your email, name, or phone — we'll scan breach databases and data brokers and show every result right here, inside the app.
        </p>
      </div>

      {/* Search bar */}
      <div className="card-dark p-5">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              className="input-field pl-9"
              placeholder="jane@email.com · Jane Smith · +1 555 000 0000"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !scanning && runScan()}
              disabled={scanning}
            />
          </div>
          <button
            onClick={scanning ? undefined : result ? () => setResult(null) : runScan}
            disabled={!query.trim() && !result}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-40"
          >
            {scanning ? <Loader className="h-4 w-4 animate-spin" /> : result ? <RotateCcw className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            {scanning ? 'Scanning…' : result ? 'New Search' : 'Scan In-App'}
          </button>
        </div>

        {/* Progress bar */}
        {scanning && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-[10px] text-gray-600 font-mono">
              <span>{stage}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-900 overflow-hidden">
              <div className="h-full rounded-full bg-red-600 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-950/20 border border-red-900/30 text-xs text-red-400 font-mono">! {error}</div>
        )}
      </div>

      {/* ── Results ── */}
      {result && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card-dark p-4 text-center">
              <div className="text-3xl font-black text-white">{result.total_exposures}</div>
              <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">Total exposures</div>
            </div>
            <div className="card-dark p-4 text-center">
              <div className="text-3xl font-black text-red-400">{result.breaches.length}</div>
              <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">Breach records</div>
            </div>
            <div className="card-dark p-4 text-center">
              <div className="text-3xl font-black text-white">{result.broker_listings.length}</div>
              <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">Broker listings</div>
            </div>
          </div>

          {/* HIBP provider status */}
          {result.hibp_provider && (
            <div className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${
              result.hibp_provider.status === 'completed' ? 'bg-red-950/20 border-red-900/30 text-red-300' :
              result.hibp_provider.status === 'no_match'  ? 'bg-gray-900/40 border-gray-800 text-gray-400' :
              'bg-gray-900/40 border-gray-800 text-gray-500'
            }`}>
              {result.hibp_provider.status === 'completed'
                ? <ShieldAlert className="h-4 w-4 text-red-500 flex-shrink-0" />
                : <CheckCircle className="h-4 w-4 text-gray-600 flex-shrink-0" />
              }
              <span className="font-semibold">Have I Been Pwned:</span>
              {result.hibp_provider.status === 'completed'
                ? `${result.hibp_provider.breach_count} breach${result.hibp_provider.breach_count !== 1 ? 'es' : ''}, ${result.hibp_provider.paste_count} paste${result.hibp_provider.paste_count !== 1 ? 's' : ''} found`
                : result.hibp_provider.status === 'no_match' ? 'No breaches found — email appears clean'
                : result.hibp_provider.status === 'failed'   ? 'HIBP check failed (rate limit or error)'
                : 'HIBP check skipped (no API key configured)'}
            </div>
          )}

          {/* Breach records */}
          <div className="card-dark p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-bold text-white">Data Breaches</span>
              <span className="text-[10px] bg-red-950/50 text-red-400 border border-red-900/40 px-2 py-0.5 rounded-full">{result.breaches.length}</span>
            </div>
            {result.breaches.length === 0 ? (
              <p className="text-center py-6 text-gray-600 text-sm">No breach records found</p>
            ) : (
              <div className="space-y-2">
                {result.breaches.map((b, i) => {
                  const evidence = evBySource[b.source]
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-800/80 bg-gray-900/30">
                      <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border flex-shrink-0 mt-0.5 ${SEV[b.severity] ?? SEV.low}`}>
                        {b.severity}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {evidence?.source_url ? (
                            <a href={evidence.source_url} target="_blank" rel="noopener noreferrer"
                              className="font-bold text-white text-sm hover:text-red-400 transition-colors flex items-center gap-1">
                              {b.source} <ExternalLink className="h-2.5 w-2.5 opacity-40" />
                            </a>
                          ) : (
                            <span className="font-bold text-white text-sm">{b.source}</span>
                          )}
                          {b.breach_date && <span className="text-[10px] text-gray-600 font-mono">{b.breach_date.slice(0, 4)}</span>}
                          {b.record_count && <span className="text-[10px] text-gray-600">{(b.record_count / 1e6).toFixed(0)}M records</span>}
                        </div>
                        {b.description && <p className="text-[10px] text-gray-500 mb-1.5 leading-relaxed">{b.description}</p>}
                        <div className="flex flex-wrap gap-1 mb-1">
                          {b.exposed_fields.map(f => (
                            <span key={f} className="text-[9px] bg-gray-800/80 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700/50 font-mono">{f}</span>
                          ))}
                        </div>
                        {evidence?.action_label && (
                          <div className="flex items-center gap-1 text-[10px] text-red-400 font-medium pt-1.5 border-t border-gray-800/40 mt-1">
                            <span className="text-red-600">→</span> {evidence.action_label}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Broker listings */}
          {result.broker_listings.length > 0 && (
            <div className="card-dark p-5">
              <div className="flex items-center gap-2 mb-4">
                <Database className="h-4 w-4 text-red-500" />
                <span className="text-sm font-bold text-white">Broker Listings Found</span>
                <span className="text-[10px] bg-red-950/50 text-red-400 border border-red-900/40 px-2 py-0.5 rounded-full">{result.broker_listings.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-800/60">
                      {['Broker', 'Fields Exposed', 'DSAR', 'Opt-Out'].map(h => (
                        <th key={h} className="text-left text-[10px] text-gray-600 font-semibold uppercase tracking-wide pb-2 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900/60">
                    {result.broker_listings.map((bl, i) => (
                      <tr key={i} className="hover:bg-red-950/5 transition-colors">
                        <td className="py-2.5 pr-4 font-semibold text-gray-200">{bl.broker_name}</td>
                        <td className="py-2.5 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {(bl.fields_exposed ?? []).slice(0, 3).map(f => (
                              <span key={f} className="text-[9px] bg-gray-800 text-gray-500 px-1 py-0.5 rounded font-mono">{f}</span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${bl.dsar_eligible ? 'text-red-400 bg-red-950/30' : 'text-gray-600'}`}>
                            {bl.dsar_eligible ? 'Eligible' : '—'}
                          </span>
                        </td>
                        <td className="py-2.5">
                          {bl.opt_out_url
                            ? <a href={bl.opt_out_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-red-500 hover:text-red-400 font-medium">
                                Opt Out <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            : <span className="text-gray-700">Manual</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
