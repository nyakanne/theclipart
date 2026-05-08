import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldCheck, ShieldAlert, Search, RotateCcw, Database, Users, FileText, Radio, Target, AlertTriangle, Trash2 } from 'lucide-react'
import { NetworkGraph } from '@/components/ui/NetworkGraph'
import { PrivacyScore } from '@/components/ui/PrivacyScore'

interface Props {
  onNavigate: (tab: string) => void
}

interface ScanResult {
  scan_id: string
  status: string
  progress: number
  privacy_score?: number
  risk_score?: number
  total_exposures?: number
  breaches?: Array<{ source: string; severity: string; exposed_fields: string[]; breach_date: string; record_count?: number }>
  broker_listings?: Array<{ broker_name: string; category: string; opt_out_url: string }>
  compliance?: { risk_level: string; violations: string[]; recommendations: string[] }
  stats?: { people_search: number; broker_sites: number; public_records: number; social_profiles: number; ad_networks: number; breach_data: number }
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

  const hasInput = Object.values(form).some(v => v.trim())

  async function startScan() {
    if (!hasInput) return
    setScanning(true)
    setError('')
    setResult(null)
    setProgress(0)
    setStage('Initializing scan…')

    try {
      const res = await fetch('http://localhost:8000/api/v1/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      const job = await res.json()
      const scanId = job.scan_id

      // Poll until complete
      while (true) {
        await new Promise(r => setTimeout(r, 900))
        const statusRes = await fetch(`http://localhost:8000/api/v1/scans/${scanId}/status`)
        const status = await statusRes.json()
        setProgress(status.progress)
        setStage(status.current_stage)
        if (status.status === 'completed' || status.status === 'failed') break
      }

      const fullRes = await fetch(`http://localhost:8000/api/v1/scans/${scanId}`)
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
      {result && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Score row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-dark p-5 col-span-2 sm:col-span-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Privacy Score</p>
              <PrivacyScore score={result.privacy_score ?? 0} size={72} />
            </div>
            <div className="card-dark p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Sources Found</p>
              <div className="text-3xl font-bold text-white">{result.total_exposures ?? 0}</div>
              <div className="text-xs text-gray-600 mt-1">Across all categories</div>
            </div>
            <div className="card-dark p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Risk Level</p>
              <div className={`text-xl font-bold capitalize ${
                result.compliance?.risk_level === 'critical' ? 'text-red-500' :
                result.compliance?.risk_level === 'high' ? 'text-orange-400' :
                result.compliance?.risk_level === 'medium' ? 'text-yellow-400' : 'text-green-400'
              }`}>{result.compliance?.risk_level ?? '—'}</div>
              <div className="text-xs text-gray-600 mt-1">Based on {result.breaches?.length ?? 0} breaches</div>
            </div>
            <div className="card-dark p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Brokers Found</p>
              <div className="text-3xl font-bold text-white">{result.broker_listings?.length ?? 0}</div>
              <div className="text-xs text-gray-600 mt-1">With opt-out links</div>
            </div>
          </div>

          {/* Data map */}
          <div className="card-dark p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="h-4 w-4 text-red-500" /> Full Data Map
            </h3>
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <NetworkGraph size={300} animated />
              <div className="grid grid-cols-2 gap-3 flex-1">
                {[
                  { label: 'People Search', value: result.stats?.people_search ?? 0, icon: Users },
                  { label: 'Broker Sites', value: result.stats?.broker_sites ?? 0, icon: Database },
                  { label: 'Public Records', value: result.stats?.public_records ?? 0, icon: FileText },
                  { label: 'Social Profiles', value: result.stats?.social_profiles ?? 0, icon: Users },
                  { label: 'Ad Networks', value: result.stats?.ad_networks ?? 0, icon: Radio },
                  { label: 'Breach Data', value: result.stats?.breach_data ?? 0, icon: ShieldAlert },
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
          </div>

          {/* Breach list */}
          {(result.breaches?.length ?? 0) > 0 && (
            <div className="card-dark p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" /> Data Breaches Found
              </h3>
              <div className="space-y-3">
                {result.breaches!.map((b, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-900/40 border border-gray-800">
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border mt-0.5 ${SEV_COLOR[b.severity] ?? SEV_COLOR.low}`}>
                      {b.severity}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{b.source}</span>
                        <span className="text-xs text-gray-600">{b.breach_date?.slice(0,4)}</span>
                        {b.record_count && <span className="text-xs text-gray-600">{(b.record_count / 1_000_000).toFixed(0)}M records</span>}
                      </div>
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

          {/* Recommendations */}
          {(result.compliance?.recommendations?.length ?? 0) > 0 && (
            <div className="card-dark p-5">
              <h3 className="font-semibold text-white mb-4">Recommendations</h3>
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
              <div className="text-xs text-gray-500 mt-0.5">{result.broker_listings?.length} brokers found</div>
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
      )}

      {/* Empty state */}
      {!result && !scanning && (
        <div className="card-dark p-8 text-center">
          <ShieldCheck className="h-12 w-12 text-red-900/60 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-400 mb-2">No scan results yet</h3>
          <p className="text-sm text-gray-600">Enter your name, email, phone, or username above and run a scan to see where your data appears across the web.</p>
        </div>
      )}
    </div>
  )
}
