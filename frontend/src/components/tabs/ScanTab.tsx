import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, ShieldAlert, Search, RotateCcw, Database, Users, FileText, Radio, Target, AlertTriangle, Trash2 } from 'lucide-react'
import { NetworkGraph } from '@/components/ui/NetworkGraph'
import { PrivacyScore } from '@/components/ui/PrivacyScore'
import { useAuthStore } from '@/store/authStore'

interface Props {
  onNavigate: (tab: string) => void
}

interface BreachRecord {
  source: string
  severity: string
  exposed_fields: string[]
  breach_date?: string
  record_count?: number
  description?: string
  verified?: boolean
}

interface BrokerListing {
  broker_name: string
  broker_url?: string
  opt_out_url?: string
  fields_exposed?: string[]
  opt_out_status?: string
  dsar_eligible?: boolean
}

interface ComplianceResult {
  overall?: number
  risk_level: string
  violations?: Array<{ description: string; regulation?: string; severity?: string }>
  recommendations: string[]
}

interface ScanResult {
  scan_id: string
  status: string
  progress: number
  risk_score: number
  total_exposures: number
  breaches: BreachRecord[]
  broker_listings: BrokerListing[]
  compliance?: ComplianceResult
}

function deriveStats(result: ScanResult) {
  const brokers = result.broker_listings ?? []
  const breaches = result.breaches ?? []
  return {
    people_search: brokers.filter(b => b.fields_exposed?.some(f => ['name','address','relatives'].includes(f))).length,
    broker_sites:  brokers.length,
    public_records: brokers.filter(b => b.fields_exposed?.includes('criminal')).length,
    social_profiles: brokers.filter(b => b.fields_exposed?.includes('social')).length,
    ad_networks: 0,
    breach_data: breaches.length,
  }
}

function derivePrivacyScore(result: ScanResult): number {
  if (result.risk_score != null) return Math.max(5, Math.round(100 - result.risk_score))
  const breachPenalty = Math.min(60, (result.breaches?.length ?? 0) * 12)
  const brokerPenalty = Math.min(30, (result.broker_listings?.length ?? 0) * 3)
  return Math.max(5, 100 - breachPenalty - brokerPenalty)
}

const SEV_COLOR: Record<string, string> = {
  critical: 'text-red-400 bg-red-950/40 border-red-900/50',
  high:     'text-orange-400 bg-orange-950/40 border-orange-900/50',
  medium:   'text-yellow-400 bg-yellow-950/40 border-yellow-900/50',
  low:      'text-green-400 bg-green-950/40 border-green-900/50',
}

export function ScanTab({ onNavigate }: Props) {
  const [form, setForm] = useState({ email: '', phone: '', username: '', full_name: '' })
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')

  const token = useAuthStore(s => s.token)
  const hasInput = Object.values(form).some(v => v.trim())

  function authHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }

  async function startScan() {
    if (!hasInput) return
    setScanning(true)
    setError('')
    setResult(null)
    setProgress(0)
    setStage('Initializing scan…')

    try {
      const res = await fetch('/api/v1/scans', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      const job = await res.json()
      const scanId = job.scan_id

      // Poll until complete
      while (true) {
        await new Promise(r => setTimeout(r, 900))
        const statusRes = await fetch(`/api/v1/scans/${scanId}/status`, { headers: authHeaders() })
        const status = await statusRes.json()
        setProgress(status.progress)
        setStage(status.current_stage)
        if (status.status === 'completed' || status.status === 'failed') break
      }

      const fullRes = await fetch(`/api/v1/scans/${scanId}`, { headers: authHeaders() })
      const full = await fullRes.json()
      setResult(full)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Scan form */}
      <div className="card-dark p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
            <Search className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h2 className="font-bold text-white">Exposure Scan</h2>
            <p className="text-xs text-gray-500">Find where your personal data appears across the web</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {[
            { key: 'full_name', label: 'Full Name', placeholder: 'Jane Smith' },
            { key: 'email',     label: 'Email Address', placeholder: 'jane@example.com' },
            { key: 'phone',     label: 'Phone Number', placeholder: '+1 555 000 0000' },
            { key: 'username',  label: 'Username / Handle', placeholder: '@janesmith' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
              <input
                className="input-field"
                placeholder={f.placeholder}
                value={(form as Record<string, string>)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                disabled={scanning}
              />
            </div>
          ))}
        </div>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        <button
          onClick={startScan}
          disabled={!hasInput || scanning}
          className="btn-red w-full sm:w-auto disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {scanning ? <RotateCcw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {scanning ? 'Scanning…' : 'Scan My Exposure'}
        </button>

        {scanning && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{stage}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-red-600"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (() => {
        const stats = deriveStats(result)
        const privacyScore = derivePrivacyScore(result)
        const riskLevel = result.compliance?.risk_level ?? (privacyScore < 30 ? 'critical' : privacyScore < 50 ? 'high' : privacyScore < 70 ? 'medium' : 'low')
        return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Exposure Dashboard */}
          <div className="card-dark p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-white">Exposure Dashboard</h2>
                <p className="text-xs text-gray-500 mt-0.5">{result.total_exposures} total sources found across the web</p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold capitalize ${
                riskLevel === 'critical' ? 'bg-red-950/40 border-red-900/50 text-red-400' :
                riskLevel === 'high' ? 'bg-orange-950/40 border-orange-900/50 text-orange-400' :
                riskLevel === 'medium' ? 'bg-yellow-950/40 border-yellow-900/50 text-yellow-400' :
                'bg-green-950/40 border-green-900/50 text-green-400'
              }`}>
                <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                {riskLevel} risk
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Privacy score gauge */}
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <PrivacyScore score={privacyScore} size={110} />
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Privacy Score</div>
                  <div className="text-xs text-gray-600 mt-0.5">{privacyScore < 40 ? 'Highly Exposed' : privacyScore < 60 ? 'At Risk' : privacyScore < 80 ? 'Moderate' : 'Well Protected'}</div>
                </div>
              </div>

              {/* Network graph */}
              <div className="flex-1 flex items-center justify-center">
                <NetworkGraph size={280} animated />
              </div>

              {/* Stats */}
              <div className="flex flex-col gap-3 flex-shrink-0 w-44">
                {[
                  { label: 'Total Sources', value: result.total_exposures, sub: 'Across all categories' },
                  { label: 'Data Breaches', value: result.breaches.length, sub: `${result.breaches.filter(b => b.severity === 'critical' || b.severity === 'high').length} high severity` },
                  { label: 'Broker Sites',  value: stats.broker_sites, sub: 'With opt-out links' },
                  { label: 'People Search', value: stats.people_search, sub: 'Listing your info' },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/60">
                    <div className="text-[10px] text-gray-600 uppercase tracking-wide">{s.label}</div>
                    <div className="text-2xl font-bold text-white mt-0.5">{s.value}</div>
                    <div className="text-[10px] text-gray-600">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="card-dark p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="h-4 w-4 text-red-500" /> Exposure Breakdown
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'People Search', value: stats.people_search, icon: Users },
                { label: 'Broker Sites',  value: stats.broker_sites,  icon: Database },
                { label: 'Public Records',value: stats.public_records, icon: FileText },
                { label: 'Social Profiles',value: stats.social_profiles, icon: Users },
                { label: 'Ad Networks',   value: stats.ad_networks,   icon: Radio },
                { label: 'Breach Data',   value: stats.breach_data,   icon: ShieldAlert },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-900/50 border border-gray-800">
                  <s.icon className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <div>
                    <div className="text-lg font-bold text-white">{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Breach list */}
          {result.breaches.length > 0 && (
            <div className="card-dark p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" /> Data Breaches Found
              </h3>
              <div className="space-y-3">
                {result.breaches.map((b, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-900/40 border border-gray-800">
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border mt-0.5 ${SEV_COLOR[b.severity] ?? SEV_COLOR.low}`}>
                      {b.severity}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">{b.source}</span>
                        {b.breach_date && <span className="text-xs text-gray-600">{b.breach_date.slice(0,4)}</span>}
                        {b.record_count && <span className="text-xs text-gray-600">{(b.record_count / 1_000_000).toFixed(0)}M records</span>}
                        {b.verified && <span className="text-[10px] text-green-600 border border-green-900/40 px-1 rounded">verified</span>}
                      </div>
                      {b.description && <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-1">{b.description}</p>}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {b.exposed_fields.map(f => (
                          <span key={f} className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Broker listings */}
          {result.broker_listings.length > 0 && (
            <div className="card-dark p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Database className="h-4 w-4 text-red-500" /> Data Brokers Listing You
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.broker_listings.map((bl, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-900/40 border border-gray-800 gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{bl.broker_name}</div>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {(bl.fields_exposed ?? []).slice(0, 3).map(f => (
                          <span key={f} className="text-[10px] text-gray-500">{f}</span>
                        ))}
                      </div>
                    </div>
                    {bl.opt_out_url && (
                      <a href={bl.opt_out_url} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-red-400 border border-red-900/40 px-2 py-1 rounded hover:bg-red-950/30 transition-colors flex-shrink-0">
                        Opt Out
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compliance / Recommendations */}
          {(result.compliance?.recommendations?.length ?? 0) > 0 && (
            <div className="card-dark p-5">
              <h3 className="font-semibold text-white mb-1">Compliance Recommendations</h3>
              <p className="text-xs text-gray-600 mb-4">CCPA / GDPR violations identified based on your exposure</p>
              <ul className="space-y-2">
                {result.compliance!.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">→</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button onClick={() => onNavigate('removal')} className="card-dark p-4 text-left hover:border-red-900/40 transition-colors">
              <Trash2 className="h-4 w-4 text-red-500 mb-2" />
              <div className="text-sm font-semibold text-white">Start Opt-Outs</div>
              <div className="text-xs text-gray-500 mt-0.5">{result.broker_listings.length} brokers found</div>
            </button>
            <button onClick={() => onNavigate('reports')} className="card-dark p-4 text-left hover:border-red-900/40 transition-colors">
              <FileText className="h-4 w-4 text-red-500 mb-2" />
              <div className="text-sm font-semibold text-white">Build Report</div>
              <div className="text-xs text-gray-500 mt-0.5">CCPA / FTC / legal signals</div>
            </button>
            <button onClick={() => onNavigate('find')} className="card-dark p-4 text-left hover:border-red-900/40 transition-colors">
              <Search className="h-4 w-4 text-red-500 mb-2" />
              <div className="text-sm font-semibold text-white">Find Yourself</div>
              <div className="text-xs text-gray-500 mt-0.5">HIBP, DeHashed, brokers</div>
            </button>
          </div>
        </motion.div>
        )
      })()}

      {/* Pre-scan dashboard */}
      {!result && !scanning && (
        <div className="space-y-4">
          {/* Exposure Dashboard header */}
          <div className="card-dark p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-white">Exposure Dashboard</h2>
                <p className="text-xs text-gray-500 mt-0.5">Run a scan to map your digital footprint</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 border border-gray-800">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-700" />
                <span className="text-xs text-gray-600">Not scanned</span>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Privacy score gauge placeholder */}
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="relative w-32 h-32">
                  <svg width={128} height={128} className="-rotate-90">
                    <circle cx={64} cy={64} r={52} fill="none" stroke="#111" strokeWidth={10} />
                    <circle cx={64} cy={64} r={52} fill="none" stroke="#1f2937" strokeWidth={10} strokeLinecap="round" strokeDasharray={326.7} strokeDashoffset={326.7} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <ShieldCheck className="h-8 w-8 text-gray-700" />
                    <span className="text-xs text-gray-600 mt-1">Score</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-700">—</div>
                  <div className="text-xs text-gray-600">Privacy Score</div>
                </div>
              </div>

              {/* Network graph */}
              <div className="flex-1 flex items-center justify-center">
                <NetworkGraph size={280} animated />
              </div>

              {/* Stats column */}
              <div className="flex flex-col gap-3 flex-shrink-0 w-44">
                {[
                  { label: 'Total Sources', value: '—', sub: 'Across all categories' },
                  { label: 'Risk Level',    value: '—', sub: 'Based on breach data' },
                  { label: 'Data Brokers',  value: '—', sub: 'With opt-out links' },
                  { label: 'Breaches',      value: '—', sub: 'Known leak incidents' },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl bg-gray-900/60 border border-gray-800/60">
                    <div className="text-[10px] text-gray-600 uppercase tracking-wide">{s.label}</div>
                    <div className="text-2xl font-bold text-gray-700 mt-0.5">{s.value}</div>
                    <div className="text-[10px] text-gray-700">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
