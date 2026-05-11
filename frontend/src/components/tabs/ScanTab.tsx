import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, ShieldAlert, Search, RotateCcw, Database, Users,
  FileText, Radio, AlertTriangle, Trash2, RefreshCw, Download,
  ExternalLink, TrendingDown, Activity
} from 'lucide-react'
import { NetworkGraph } from '@/components/ui/NetworkGraph'
import { PrivacyScore } from '@/components/ui/PrivacyScore'
import { useAuthStore } from '@/store/authStore'

interface Props { onNavigate: (tab: string) => void }

interface BreachRecord {
  source: string; severity: string; exposed_fields: string[]
  breach_date?: string; record_count?: number; description?: string; verified?: boolean
}
interface BrokerListing {
  broker_name: string; broker_url?: string; opt_out_url?: string
  fields_exposed?: string[]; opt_out_status?: string; dsar_eligible?: boolean
}
interface ComplianceResult {
  overall?: number; risk_level: string
  violations?: Array<{ description: string; regulation?: string; severity?: string }>
  recommendations: string[]
}
interface ScanResult {
  scan_id: string; status: string; progress: number
  risk_score: number; total_exposures: number
  breaches: BreachRecord[]; broker_listings: BrokerListing[]; compliance?: ComplianceResult
}

const SEV: Record<string, string> = {
  critical: 'text-red-400 bg-red-950/40 border-red-900/50',
  high:     'text-orange-400 bg-red-950/40 border-orange-900/50',
  medium:   'text-yellow-400 bg-yellow-950/40 border-yellow-900/50',
  low:      'text-red-400 bg-green-950/40 border-green-900/50',
}

function deriveScore(r: ScanResult) {
  if (r.risk_score != null) return Math.max(5, Math.round(100 - r.risk_score))
  return Math.max(5, 100 - Math.min(60, r.breaches.length * 12) - Math.min(30, r.broker_listings.length * 3))
}

function deriveRisk(score: number, compliance?: ComplianceResult) {
  return compliance?.risk_level ?? (score < 35 ? 'critical' : score < 55 ? 'high' : score < 75 ? 'medium' : 'low')
}

// ── Live Exposure Map (post-scan) ─────────────────────────────────────────────
interface ExposureMapProps { brokers: BrokerListing[]; breaches: BreachRecord[]; userName?: string }

function ExposureMap({ brokers, breaches, userName = 'YOU' }: ExposureMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const tRef = useRef(0)

  const W = 680, H = 320
  const cx = W / 2, cy = H / 2

  // Build nodes from real data
  const nodes = [
    ...brokers.slice(0, 10).map((b, i) => {
      const angle = (i / Math.min(brokers.length, 10)) * Math.PI * 2 - Math.PI / 2
      const r = 115 + (i % 3) * 18
      return {
        label: b.broker_name, sub: 'People Search', type: 'broker' as const,
        x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r,
        color: 'rgba(220,38,38,0.9)'
      }
    }),
    ...breaches.slice(0, 4).map((b, i) => {
      const angle = (i / Math.max(breaches.length, 4)) * Math.PI * 2 + 0.4
      const r = 140
      return {
        label: b.source, sub: 'Breach', type: 'breach' as const,
        x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r,
        color: b.severity === 'critical' ? 'rgba(239,68,68,1)' : 'rgba(249,115,22,0.9)'
      }
    }),
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const draw = () => {
      const t = tRef.current
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#060608'
      ctx.fillRect(0, 0, W, H)

      // Subtle glow at center
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 160)
      bg.addColorStop(0, 'rgba(120,0,0,0.12)')
      bg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // Outer ring
      ctx.beginPath()
      ctx.arc(cx, cy, 135, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(220,38,38,0.08)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 8])
      ctx.stroke()
      ctx.setLineDash([])

      // Inner ring
      ctx.beginPath()
      ctx.arc(cx, cy, 55 * (1 + Math.sin(t * 1.2) * 0.03), 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(220,38,38,0.25)'
      ctx.lineWidth = 1.2
      ctx.stroke()

      // Lines center → nodes
      nodes.forEach((n, i) => {
        const prog = ((t * 0.25 + i * 0.14) % 1 + 1) % 1
        const grad = ctx.createLinearGradient(cx, cy, n.x, n.y)
        grad.addColorStop(0, 'rgba(220,38,38,0.5)')
        grad.addColorStop(1, 'rgba(220,38,38,0.04)')
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(n.x, n.y)
        ctx.strokeStyle = grad
        ctx.lineWidth = 0.8
        ctx.stroke()

        // Dot
        const px = cx + (n.x - cx) * prog, py = cy + (n.y - cy) * prog
        ctx.beginPath()
        ctx.arc(px, py, 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,100,80,${0.9 - prog * 0.5})`
        ctx.shadowColor = 'rgba(255,60,40,0.8)'
        ctx.shadowBlur = 5
        ctx.fill()
        ctx.shadowBlur = 0
      })

      tRef.current += 0.016
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [brokers, breaches])

  return (
    <div className="relative" style={{ width: W, height: H, maxWidth: '100%' }}>
      <canvas ref={canvasRef} width={W} height={H} className="absolute inset-0 w-full h-full" style={{ objectFit: 'contain' }} />

      {/* Center YOU node */}
      <div className="absolute flex items-center justify-center" style={{ left: cx, top: cy, transform: 'translate(-50%,-50%)' }}>
        <div className="relative">
          <div className="absolute inset-0 rounded-full border border-red-600/30 animate-ping" style={{ animationDuration: '3s', width: 80, height: 80, left: -8, top: -8 }} />
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-950 to-black border border-red-600/80 flex flex-col items-center justify-center"
            style={{ boxShadow: '0 0 20px rgba(220,38,38,0.5)' }}>
            <Users className="h-5 w-5 text-red-400 mb-0.5" />
            <span className="text-[9px] font-bold text-red-300 leading-none">{userName.slice(0, 6)}</span>
          </div>
        </div>
      </div>

      {/* Broker / breach nodes */}
      {nodes.map((n, i) => (
        <div key={i} className="absolute" style={{ left: n.x, top: n.y, transform: 'translate(-50%,-50%)' }}>
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-8 h-8 rounded-full bg-gray-950 border border-gray-800 flex items-center justify-center hover:border-red-800/60 transition-colors"
              style={{ boxShadow: `0 0 8px rgba(0,0,0,0.8), 0 0 4px ${n.type === 'breach' ? 'rgba(239,68,68,0.15)' : 'rgba(220,38,38,0.08)'}` }}>
              {n.type === 'breach'
                ? <ShieldAlert className="h-3.5 w-3.5 text-orange-500" />
                : <Users className="h-3.5 w-3.5 text-red-500/70" />
              }
            </div>
            <div className="text-[8px] text-gray-400 font-medium whitespace-nowrap max-w-[70px] truncate text-center">{n.label}</div>
            <div className="text-[7px] text-gray-600">{n.sub}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main ScanTab ──────────────────────────────────────────────────────────────
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
    setScanning(true); setError(''); setResult(null); setProgress(0); setStage('Initializing scan…')
    try {
      const res = await fetch('/api/v1/scans', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      const { scan_id } = await res.json()

      while (true) {
        await new Promise(r => setTimeout(r, 900))
        const s = await (await fetch(`/api/v1/scans/${scan_id}/status`, { headers: authHeaders() })).json()
        setProgress(s.progress); setStage(s.current_stage)
        if (s.status === 'completed' || s.status === 'failed') break
      }

      const full = await (await fetch(`/api/v1/scans/${scan_id}`, { headers: authHeaders() })).json()
      setResult(full)
    } catch (e) { setError(e instanceof Error ? e.message : 'Scan failed') }
    finally { setScanning(false) }
  }

  return (
    <div className="space-y-5">
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
          {result && (
            <button onClick={() => setResult(null)} className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-700 px-3 py-1.5 rounded-lg transition-colors">
              <RefreshCw className="h-3 w-3" /> New Scan
            </button>
          )}
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

        <button onClick={startScan} disabled={!hasInput || scanning}
          className="btn-red w-full sm:w-auto disabled:opacity-40 disabled:cursor-not-allowed">
          {scanning ? <RotateCcw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {scanning ? 'Scanning…' : 'Scan My Exposure'}
        </button>

        {scanning && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{stage}</span><span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
              <motion.div className="h-full rounded-full bg-red-600" style={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>
        )}
      </div>

      {/* ── POST-SCAN DASHBOARD ── */}
      <AnimatePresence>
        {result && (() => {
          const score = deriveScore(result)
          const riskLevel = deriveRisk(score, result.compliance)
          const riskColor = riskLevel === 'critical' ? 'text-red-500' : riskLevel === 'high' ? 'text-orange-400' : riskLevel === 'medium' ? 'text-yellow-400' : 'text-green-400'
          const riskBg    = riskLevel === 'critical' ? 'bg-red-950/40 border-red-900/50' : riskLevel === 'high' ? 'bg-red-950/40 border-orange-900/50' : riskLevel === 'medium' ? 'bg-yellow-950/40 border-yellow-900/50' : 'bg-green-950/40 border-green-900/50'

          const highSev = result.breaches.filter(b => b.severity === 'critical' || b.severity === 'high').length

          return (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Dashboard</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Your privacy at a glance · Last scan just now</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onNavigate('reports')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-800 text-xs text-gray-400 hover:text-gray-200 hover:border-gray-700 transition-colors">
                    <Download className="h-3.5 w-3.5" /> Download Report
                  </button>
                  <button onClick={startScan} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs text-white font-medium transition-colors">
                    <RefreshCw className="h-3.5 w-3.5" /> New Scan
                  </button>
                </div>
              </div>

              {/* ── 4 KPI cards ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Privacy Score */}
                <div className="card-dark p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Privacy Score</span>
                    <ShieldCheck className="h-3.5 w-3.5 text-gray-700" />
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <PrivacyScore score={score} size={68} showLabel={false} />
                    <div>
                      <div className={`text-sm font-bold capitalize ${riskColor}`}>{riskLevel === 'critical' ? 'Critical' : riskLevel === 'high' ? 'High Risk' : riskLevel === 'medium' ? 'Medium' : 'Good'}</div>
                      <div className="text-[10px] text-gray-600 mt-0.5 leading-tight">
                        {score < 55 ? 'Exposure above average' : 'Your privacy is above average'}
                      </div>
                      <button onClick={() => onNavigate('removal')} className={`text-[10px] font-medium mt-1 ${riskColor} hover:opacity-80`}>
                        Improve Score →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Data Sources Found */}
                <div className="card-dark p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Data Sources Found</span>
                    <Database className="h-3.5 w-3.5 text-gray-700" />
                  </div>
                  <div className="flex items-end gap-2 mt-3">
                    <div className="text-4xl font-bold text-white leading-none">{result.total_exposures}</div>
                  </div>
                  <div className="text-[10px] text-red-500 mt-1">+{result.breaches.length} breach records found</div>
                  <button onClick={() => {}} className="text-[10px] text-red-500 mt-1 hover:opacity-80">View all sources →</button>
                </div>

                {/* Active Removals */}
                <div className="card-dark p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Active Removals</span>
                    <Trash2 className="h-3.5 w-3.5 text-gray-700" />
                  </div>
                  <div className="text-4xl font-bold text-white mt-3 leading-none">0</div>
                  <div className="text-[10px] text-gray-600 mt-1">
                    {result.broker_listings.length} brokers ready to opt out
                  </div>
                  <button onClick={() => onNavigate('removal')} className="text-[10px] text-red-500 mt-1 hover:opacity-80">Start removals →</button>
                </div>

                {/* Monitored Brokers */}
                <div className="card-dark p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Monitored Brokers</span>
                    <Activity className="h-3.5 w-3.5 text-gray-700" />
                  </div>
                  <div className="text-4xl font-bold text-white mt-3 leading-none">{result.broker_listings.length}</div>
                  <div className="text-[10px] text-gray-600 mt-1">Found listing your data</div>
                  <button onClick={() => onNavigate('removal')} className="text-[10px] text-red-500 mt-1 hover:opacity-80">Manage brokers →</button>
                </div>
              </div>

              {/* ── Data Exposure Map ── */}
              <div className="card-dark p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white text-sm uppercase tracking-wide">Data Exposure Map</h3>
                    <p className="text-[10px] text-gray-600 mt-0.5">Live view of where your personal data appears across the web</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-600">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />High Risk</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-orange-400 inline-block" />Medium</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-gray-600 inline-block" />Low</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <ExposureMap
                    brokers={result.broker_listings}
                    breaches={result.breaches}
                    userName={form.full_name || form.email?.split('@')[0] || 'YOU'}
                  />
                </div>
              </div>

              {/* ── Two-column: Recent Removals + Exposure Breakdown ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recent Removals / Broker Table */}
                <div className="card-dark p-5 lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white text-sm">Brokers Listing Your Data</h3>
                    <button onClick={() => onNavigate('removal')} className="text-[10px] text-red-500 hover:opacity-80">View All Removals →</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-800/60">
                          {['Source', 'Type', 'Status', 'Action'].map(h => (
                            <th key={h} className="text-left text-gray-600 font-medium pb-2 pr-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-900">
                        {result.broker_listings.slice(0, 6).map((bl, i) => (
                          <tr key={i} className="hover:bg-gray-900/30 transition-colors">
                            <td className="py-2.5 pr-4 font-medium text-gray-200">{bl.broker_name}</td>
                            <td className="py-2.5 pr-4 text-gray-500">People Search</td>
                            <td className="py-2.5 pr-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-950/40 text-red-400 border border-red-900/40">Not Removed</span>
                            </td>
                            <td className="py-2.5">
                              {bl.opt_out_url
                                ? <a href={bl.opt_out_url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-red-500 hover:text-red-400 transition-colors">
                                    Opt Out <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                : <span className="text-gray-700">—</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {result.broker_listings.length > 6 && (
                      <p className="text-[10px] text-gray-600 mt-3 text-center">+{result.broker_listings.length - 6} more brokers found</p>
                    )}
                  </div>
                </div>

                {/* Exposure Breakdown */}
                <div className="card-dark p-5">
                  <h3 className="font-semibold text-white text-sm mb-4">Exposure Breakdown</h3>
                  <div className="space-y-2.5">
                    {[
                      { label: 'People Search', count: result.broker_listings.filter(b => !b.fields_exposed?.includes('criminal')).length, color: 'bg-red-500', pct: 52 },
                      { label: 'Breach Records', count: result.breaches.length, color: 'bg-orange-400', pct: Math.round(result.breaches.length / Math.max(result.total_exposures, 1) * 100) },
                      { label: 'Public Records', count: result.broker_listings.filter(b => b.fields_exposed?.includes('criminal')).length, color: 'bg-yellow-500', pct: 13 },
                      { label: 'Other', count: 0, color: 'bg-gray-600', pct: 8 },
                    ].map(row => (
                      <div key={row.label}>
                        <div className="flex justify-between text-[10px] mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${row.color}`} />
                            <span className="text-gray-400">{row.label}</span>
                          </div>
                          <span className="text-gray-500">{row.count}</span>
                        </div>
                        <div className="h-1 rounded-full bg-gray-900 overflow-hidden">
                          <div className={`h-full rounded-full ${row.color}`} style={{ width: `${Math.min(100, row.pct)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Privacy Tip */}
                  <div className="mt-5 p-3 rounded-xl bg-gray-900/60 border border-gray-800/60">
                    <div className="flex items-center gap-2 mb-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-[10px] font-semibold text-gray-300 uppercase tracking-wide">Privacy Tip</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      {highSev > 0
                        ? `${highSev} high-severity breach${highSev > 1 ? 'es' : ''} found. Change passwords for affected services and enable 2FA immediately.`
                        : 'Use unique email aliases for sign-ups to reduce your exposure and track where your data goes.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Breach Records ── */}
              {result.breaches.length > 0 && (
                <div className="card-dark p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" /> Data Breaches Detected
                    </h3>
                    <span className="text-[10px] text-gray-600">{highSev} high severity</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.breaches.map((b, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-900/40 border border-gray-800 hover:border-gray-700 transition-colors">
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex-shrink-0 mt-0.5 ${SEV[b.severity] ?? SEV.low}`}>
                          {b.severity}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white text-sm">{b.source}</span>
                            {b.breach_date && <span className="text-xs text-gray-600">{b.breach_date.slice(0, 4)}</span>}
                            {b.record_count && <span className="text-xs text-gray-600">{(b.record_count / 1_000_000).toFixed(0)}M records</span>}
                            {b.verified && <span className="text-[9px] text-green-600 border border-green-900/40 px-1 py-0.5 rounded">verified</span>}
                          </div>
                          {b.description && <p className="text-[10px] text-gray-600 mt-0.5 line-clamp-1">{b.description}</p>}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {b.exposed_fields.map(f => (
                              <span key={f} className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{f}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Compliance Recommendations ── */}
              {(result.compliance?.recommendations?.length ?? 0) > 0 && (
                <div className="card-dark p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <h3 className="font-semibold text-white text-sm">Compliance & Legal Signals</h3>
                  </div>
                  <p className="text-[10px] text-gray-600 mb-4">CCPA / GDPR violations identified based on your exposure profile</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.compliance!.recommendations.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-400 p-2.5 rounded-lg bg-gray-900/40 border border-gray-800/60">
                        <span className="text-red-500 flex-shrink-0 mt-0.5">→</span>
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Quick Actions ── */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button onClick={() => onNavigate('removal')} className="card-dark p-4 text-left hover:border-red-900/40 transition-colors group">
                  <div className="h-8 w-8 rounded-lg bg-red-950/40 border border-red-900/30 flex items-center justify-center mb-3 group-hover:bg-red-950/60 transition-colors">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="text-sm font-semibold text-white">Start Opt-Outs</div>
                  <div className="text-xs text-gray-500 mt-0.5">{result.broker_listings.length} brokers to remove from</div>
                </button>
                <button onClick={() => onNavigate('reports')} className="card-dark p-4 text-left hover:border-red-900/40 transition-colors group">
                  <div className="h-8 w-8 rounded-lg bg-red-950/40 border border-red-900/30 flex items-center justify-center mb-3 group-hover:bg-red-950/60 transition-colors">
                    <FileText className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="text-sm font-semibold text-white">Build Report</div>
                  <div className="text-xs text-gray-500 mt-0.5">CCPA / FTC / legal signals</div>
                </button>
                <button onClick={() => onNavigate('find')} className="card-dark p-4 text-left hover:border-red-900/40 transition-colors group">
                  <div className="h-8 w-8 rounded-lg bg-red-950/40 border border-red-900/30 flex items-center justify-center mb-3 group-hover:bg-red-950/60 transition-colors">
                    <Search className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="text-sm font-semibold text-white">Find Yourself</div>
                  <div className="text-xs text-gray-500 mt-0.5">HIBP, DeHashed, brokers</div>
                </button>
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* ── PRE-SCAN DASHBOARD ── */}
      {!result && !scanning && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Dashboard</h2>
              <p className="text-xs text-gray-500 mt-0.5">Your privacy at a glance — run a scan to see your exposure</p>
            </div>
          </div>

          {/* Placeholder KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Privacy Score', icon: ShieldCheck, value: '—', sub: 'Run a scan' },
              { label: 'Data Sources Found', icon: Database, value: '—', sub: 'Across all categories' },
              { label: 'Active Removals', icon: Trash2, value: '—', sub: 'None in progress' },
              { label: 'Monitored Brokers', icon: Activity, value: '—', sub: 'Monitoring 24/7' },
            ].map(c => (
              <div key={c.label} className="card-dark p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-gray-600 uppercase tracking-wide font-medium">{c.label}</span>
                  <c.icon className="h-3.5 w-3.5 text-gray-800" />
                </div>
                <div className="text-3xl font-bold text-gray-700">{c.value}</div>
                <div className="text-[10px] text-gray-700 mt-1">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Hero network visualization */}
          <div className="card-dark p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-white">Your Digital Footprint</h3>
                <p className="text-[10px] text-gray-600 mt-0.5">Live view of where your personal data could appear across the web</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-600">
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />High Risk</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-orange-400 inline-block" />Medium</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-gray-600 inline-block" />Low</span>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <NetworkGraph size={340} animated className="flex-shrink-0" />
              <div className="flex-1 space-y-5">
                <div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    We scan <span className="text-white font-medium">450+ data brokers</span>, people search sites, public records, ad networks, and breach databases to build your complete digital exposure map.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'People Search Sites', sub: '23 typical sources', icon: Users },
                    { label: 'Data Broker DBs', sub: '47 typical sources', icon: Database },
                    { label: 'Public Records', sub: '12 typical sources', icon: FileText },
                    { label: 'Ad Networks', sub: '89 typical sources', icon: Radio },
                    { label: 'Breach Databases', sub: '6 typical sources', icon: ShieldAlert },
                    { label: 'Social Profiles', sub: '19 typical sources', icon: Users },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-900/50 border border-gray-800/60">
                      <item.icon className="h-3.5 w-3.5 text-red-500/70 flex-shrink-0" />
                      <div>
                        <div className="text-[11px] font-medium text-gray-300">{item.label}</div>
                        <div className="text-[10px] text-gray-600">{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 text-[10px] text-gray-600">
                  <ShieldCheck className="h-3.5 w-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>100% secure scan · Data encrypted in transit · No data sold</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="card-dark p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-x divide-gray-800">
              {[
                { value: '1.8B+', label: 'Records Monitored' },
                { value: '450+', label: 'Brokers Scanned' },
                { value: '98%', label: 'Removal Success Rate' },
                { value: '250K+', label: 'People Protected' },
              ].map((s, i) => (
                <div key={i} className={`${i > 0 ? 'pl-4' : ''} flex flex-col`}>
                  <span className="text-lg font-bold text-white">{s.value}</span>
                  <span className="text-[10px] text-gray-600">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
