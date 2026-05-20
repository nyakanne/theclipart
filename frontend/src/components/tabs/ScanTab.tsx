import { useState, useEffect, useRef } from 'react'
import {
  ShieldCheck, ShieldAlert, Search, RotateCcw, Database, Users,
  FileText, Radio, AlertTriangle, Trash2, RefreshCw, Download,
  ExternalLink, TrendingDown, Activity, Terminal, Zap, Lock, Eye
} from 'lucide-react'
import { NetworkGraph } from '@/components/ui/NetworkGraph'
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
interface HibpEvidence {
  source_name: string; source_url?: string; detail: string
  risk_level: string; captured_at?: string; exposed_fields: string[]; action_label: string
}
interface HibpProvider {
  status: 'unavailable' | 'no_match' | 'failed' | 'completed'
  breach_count: number; paste_count: number; evidence: HibpEvidence[]
}
interface ScanResult {
  scan_id: string; status: string; progress: number
  risk_score: number; total_exposures: number
  breaches: BreachRecord[]; broker_listings: BrokerListing[]; compliance?: ComplianceResult
  hibp_provider?: HibpProvider | null
}

const SEV: Record<string, string> = {
  critical: 'text-red-400 bg-red-950/40 border-red-900/50',
  high:     'text-red-400 bg-red-950/30 border-red-900/40',
  medium:   'text-red-300 bg-red-950/20 border-red-900/30',
  low:      'text-gray-400 bg-gray-900/40 border-gray-800',
}


function deriveScore(r: ScanResult) {
  if (r.risk_score != null) return Math.max(5, Math.round(100 - r.risk_score))
  return Math.max(5, 100 - Math.min(60, r.breaches.length * 12) - Math.min(30, r.broker_listings.length * 3))
}

function deriveRisk(score: number, compliance?: ComplianceResult) {
  return compliance?.risk_level ?? (score < 35 ? 'critical' : score < 55 ? 'high' : score < 75 ? 'medium' : 'low')
}

// ── Scan Log Line component ────────────────────────────────────────────────────
function ScanLog({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [lines])
  return (
    <div ref={ref} className="h-32 overflow-y-auto font-mono text-[10px] leading-relaxed space-y-0.5 pr-1">
      {lines.map((l, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-red-900 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
          <span className={l.startsWith('✓') ? 'text-red-400' : l.startsWith('!') ? 'text-red-300' : 'text-gray-500'}>{l}</span>
        </div>
      ))}
      <div className="flex gap-2 animate-pulse">
        <span className="text-red-900">__</span>
        <span className="text-red-600">█</span>
      </div>
    </div>
  )
}

// ── Exposure Map ──────────────────────────────────────────────────────────────
function ExposureMap({ brokers, breaches, userName = 'YOU' }: { brokers: BrokerListing[]; breaches: BreachRecord[]; userName?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const tRef = useRef(0)
  const W = 700, H = 340, cx = W / 2, cy = H / 2

  const nodes = [
    ...brokers.slice(0, 10).map((b, i) => {
      const angle = (i / Math.min(brokers.length, 10)) * Math.PI * 2 - Math.PI / 2
      const r = 120 + (i % 3) * 16
      return { label: b.broker_name, sub: 'broker', x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, breach: false }
    }),
    ...breaches.slice(0, 5).map((b, i) => {
      const angle = (i / Math.max(breaches.length, 5)) * Math.PI * 2 + 0.4
      return { label: b.source, sub: b.severity, x: cx + Math.cos(angle) * 148, y: cy + Math.sin(angle) * 148, breach: true }
    }),
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const draw = () => {
      const t = tRef.current
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#05050a'
      ctx.fillRect(0, 0, W, H)

      // Radial glow
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 180)
      bg.addColorStop(0, 'rgba(100,0,0,0.14)')
      bg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

      // Grid lines (horizontal + vertical faint)
      ctx.strokeStyle = 'rgba(220,38,38,0.04)'; ctx.lineWidth = 0.5; ctx.setLineDash([])
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

      // Concentric rings
      ;[55, 110, 165].forEach((r, ri) => {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(220,38,38,${0.06 + ri * 0.02})`; ctx.lineWidth = 0.8
        ctx.setLineDash([6, 12]); ctx.stroke(); ctx.setLineDash([])
      })

      // Lines to nodes
      nodes.forEach((n, i) => {
        const prog = ((t * 0.3 + i * 0.12) % 1 + 1) % 1
        const grad = ctx.createLinearGradient(cx, cy, n.x, n.y)
        grad.addColorStop(0, 'rgba(220,38,38,0.6)'); grad.addColorStop(1, 'rgba(220,38,38,0.03)')
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(n.x, n.y)
        ctx.strokeStyle = grad; ctx.lineWidth = 0.7; ctx.stroke()
        const px = cx + (n.x - cx) * prog, py = cy + (n.y - cy) * prog
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,80,60,${0.9 - prog * 0.4})`
        ctx.shadowColor = 'rgba(255,60,40,0.9)'; ctx.shadowBlur = 6; ctx.fill(); ctx.shadowBlur = 0
      })

      // Pulsing rings from center
      ;[0, 0.33, 0.66].forEach(offset => {
        const phase = ((t * 0.4 + offset) % 1)
        const r = 20 + phase * 60
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(220,38,38,${0.35 * (1 - phase)})`
        ctx.lineWidth = 1.5; ctx.stroke()
      })

      tRef.current += 0.016
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [brokers, breaches])

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ width: '100%', height: H }}>
      <canvas ref={canvasRef} width={W} height={H} className="absolute inset-0 w-full h-full" style={{ objectFit: 'cover' }} />
      {/* YOU node */}
      <div className="absolute flex items-center justify-center" style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
        <div className="relative">
          <div className="absolute rounded-full border border-red-600/40 animate-ping"
            style={{ width: 88, height: 88, left: -12, top: -12, animationDuration: '2.5s' }} />
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-950 to-black border border-red-600/80 flex flex-col items-center justify-center"
            style={{ boxShadow: '0 0 24px rgba(220,38,38,0.5), 0 0 4px rgba(220,38,38,0.8)' }}>
            <Lock className="h-4 w-4 text-red-400 mb-0.5" />
            <span className="text-[8px] font-bold text-red-300 tracking-widest">{userName.slice(0, 4).toUpperCase()}</span>
          </div>
        </div>
      </div>
      {/* Node labels */}
      {nodes.map((n, i) => {
        const pct = n.x / W * 100
        return (
          <div key={i} className="absolute" style={{ left: `${pct}%`, top: `${n.y / H * 100}%`, transform: 'translate(-50%,-50%)' }}>
            <div className={`flex flex-col items-center gap-0.5 ${pct < 20 || pct > 80 ? '' : ''}`}>
              <div className={`w-7 h-7 rounded-full border flex items-center justify-center
                ${n.breach ? 'bg-red-950/80 border-red-800/60' : 'bg-gray-950/90 border-gray-800/80'}`}
                style={{ boxShadow: n.breach ? '0 0 8px rgba(220,38,38,0.3)' : undefined }}>
                {n.breach ? <ShieldAlert className="h-3 w-3 text-red-400" /> : <Users className="h-3 w-3 text-gray-500" />}
              </div>
              <div className="text-[7px] text-gray-400 font-medium whitespace-nowrap max-w-[64px] truncate text-center bg-black/60 px-1 rounded">{n.label}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main ScanTab ──────────────────────────────────────────────────────────────
export function ScanTab({ onNavigate }: Props) {
  const [form, setForm] = useState({ email: '', phone: '', username: '', full_name: '' })
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [logLines, setLogLines] = useState<string[]>([])
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')

  const token = useAuthStore(s => s.token)
  const hasInput = Object.values(form).some(v => v.trim())

  function authHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = `Bearer ${token}`
    return h
  }

  function addLog(line: string) { setLogLines(prev => [...prev.slice(-40), line]) }

  async function startScan() {
    if (!hasInput) return
    setScanning(true); setError(''); setResult(null); setProgress(0); setLogLines([])
    addLog('> Initializing Vindica scan engine…')
    addLog(`> Target: ${form.email || form.full_name || form.username || form.phone}`)
    addLog('> Connecting to broker index…')
    try {
      const res = await fetch('/api/v1/scans', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(form),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`API ${res.status}: ${txt.slice(0, 120)}`)
      }
      const { scan_id } = await res.json()
      addLog(`✓ Scan created: ${scan_id.slice(0, 8)}…`)

      while (true) {
        await new Promise(r => setTimeout(r, 900))
        const s = await (await fetch(`/api/v1/scans/${scan_id}/status`, { headers: authHeaders() })).json()
        setProgress(s.progress)
        // stage in log
        if (s.current_stage) addLog(`> ${s.current_stage}`)
        if (s.status === 'completed' || s.status === 'failed') break
      }

      addLog('✓ Scan complete — loading results…')
      const full = await (await fetch(`/api/v1/scans/${scan_id}`, { headers: authHeaders() })).json()
      addLog(`! ${full.total_exposures} exposures detected across ${full.broker_listings?.length ?? 0} brokers`)
      setResult(full)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scan failed'
      setError(msg)
      addLog(`! ERROR: ${msg}`)
    } finally { setScanning(false) }
  }

  return (
    <div className="space-y-4">

      {/* ── COMMAND CENTER HERO ─────────────────────────────────────────────── */}
      <div className="card-dark relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/25 via-transparent to-transparent pointer-events-none" />
        {/* scan-line effect */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
          opacity: 0.3
        }} />

        <div className="p-6 relative">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: headline + form */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="h-3.5 w-3.5 text-red-600" />
                <span className="text-[10px] font-bold tracking-[0.2em] text-red-600 uppercase">Vindica Command Center</span>
              </div>
              <h1 className="text-3xl font-black text-white leading-tight mb-1">
                Scan Your <span className="text-red-500">Exposure.</span>
              </h1>
              <p className="text-sm text-gray-500 mb-5 max-w-sm">
                450+ brokers · breach databases · dark web · public records — all scanned, scored, mapped.
              </p>

              {/* Form grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
                {[
                  { key: 'full_name', label: 'Full Name', placeholder: 'Jane Smith', icon: Users },
                  { key: 'email',     label: 'Email Address', placeholder: 'jane@example.com', icon: Eye },
                  { key: 'phone',     label: 'Phone Number', placeholder: '+1 555 000 0000', icon: Radio },
                  { key: 'username',  label: 'Username / Handle', placeholder: '@janesmith', icon: Search },
                ].map(f => (
                  <div key={f.key} className="relative">
                    <label className="block text-[10px] text-gray-600 mb-1 uppercase tracking-wide font-semibold">{f.label}</label>
                    <div className="relative">
                      <f.icon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-700 pointer-events-none" />
                      <input
                        className="input-field pl-9 text-sm"
                        placeholder={f.placeholder}
                        value={(form as Record<string, string>)[f.key]}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        disabled={scanning}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mb-3 p-3 rounded-lg bg-red-950/30 border border-red-900/40 text-xs text-red-400 font-mono">
                  ! {error}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button onClick={startScan} disabled={!hasInput || scanning}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ boxShadow: hasInput && !scanning ? '0 0 20px rgba(220,38,38,0.4)' : undefined }}>
                  {scanning ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  {scanning ? 'Scanning…' : 'Run Scan'}
                </button>
                {result && (
                  <button onClick={() => setResult(null)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-700 px-3 py-2.5 rounded-lg transition-colors">
                    <RefreshCw className="h-3 w-3" /> New Scan
                  </button>
                )}
                <div className="flex items-center gap-1 text-[10px] text-gray-700">
                  <ShieldCheck className="h-3 w-3" /> Encrypted · No data sold
                </div>
              </div>
            </div>

            {/* Right: live terminal log or network graph */}
            <div className="lg:w-72 flex-shrink-0">
              {scanning || logLines.length > 0 ? (
                <div className="h-full rounded-xl bg-black/60 border border-red-950/40 p-3">
                  <div className="flex items-center gap-2 mb-2 border-b border-red-950/30 pb-2">
                    <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                    <span className="text-[10px] font-mono text-red-600 tracking-widest">SCAN LOG</span>
                    {scanning && <span className="ml-auto text-[10px] font-mono text-gray-600">{Math.round(progress)}%</span>}
                  </div>
                  <ScanLog lines={logLines} />
                  {scanning && (
                    <div className="mt-2 h-1 rounded-full bg-gray-900 overflow-hidden">
                      <div className="h-full rounded-full bg-red-600 transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-4">
                  <NetworkGraph size={200} animated />
                  <div className="grid grid-cols-2 gap-2 w-full text-center">
                    {[['1.8B+', 'Records'], ['450+', 'Brokers'], ['98%', 'Removal rate'], ['24/7', 'Monitoring']].map(([v, l]) => (
                      <div key={l} className="rounded-lg bg-gray-900/40 border border-gray-800/60 p-2">
                        <div className="text-sm font-bold text-white">{v}</div>
                        <div className="text-[9px] text-gray-600">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── POST-SCAN RESULTS DASHBOARD ─────────────────────────────────────── */}
      {result && (() => {
        const score = deriveScore(result)
        const riskLevel = deriveRisk(score, result.compliance)
        const riskColor = riskLevel === 'critical' ? 'text-red-500' : riskLevel === 'high' ? 'text-red-400' : 'text-red-300'
        const highSev = result.breaches.filter(b => b.severity === 'critical' || b.severity === 'high').length

        return (
          <div className="space-y-4">
            {/* Section label */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-red-950/50" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-red-600 uppercase flex items-center gap-1.5">
                <Activity className="h-3 w-3" /> Scan Results
              </span>
              <div className="h-px flex-1 bg-red-950/50" />
            </div>

            {/* ── Score + KPIs ── */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              {/* Privacy Score — large */}
              <div className="card-dark p-5 flex flex-col items-center justify-center gap-3 lg:row-span-1"
                style={{ background: 'linear-gradient(135deg, rgba(60,0,0,0.4) 0%, rgba(10,10,15,1) 100%)' }}>
                <div className="text-[10px] font-bold tracking-[0.15em] text-gray-500 uppercase">Privacy Score</div>
                <div style={{ filter: `drop-shadow(0 0 20px ${score < 35 ? 'rgba(220,38,38,0.6)' : score < 55 ? 'rgba(220,38,38,0.4)' : 'rgba(220,38,38,0.3)'})` }}>
                  <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
                    <svg width={120} height={120} className="absolute inset-0">
                      <circle cx={60} cy={60} r={50} fill="none" stroke="#1a1a1f" strokeWidth={11} />
                    </svg>
                    <svg width={120} height={120} className="absolute inset-0 -rotate-90">
                      <circle cx={60} cy={60} r={50} fill="none" stroke="#dc2626" strokeWidth={11}
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 50}
                        strokeDashoffset={2 * Math.PI * 50 * (1 - score / 100)}
                        style={{ filter: 'drop-shadow(0 0 8px rgba(220,38,38,0.8))', transition: 'stroke-dashoffset 1.2s ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black" style={{ color: score < 35 ? '#ef4444' : score < 55 ? '#dc2626' : '#f87171' }}>{score}</span>
                      <span className="text-[10px] text-gray-600">/100</span>
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-bold capitalize ${riskColor}`}>
                  {riskLevel === 'critical' ? '⚠ Critical Risk' : riskLevel === 'high' ? '⚠ High Risk' : riskLevel === 'medium' ? 'Medium Risk' : 'Low Risk'}
                </div>
                <button onClick={() => onNavigate('removal')} className="text-[10px] text-red-500 hover:opacity-80 border border-red-900/40 px-3 py-1 rounded-lg">
                  Improve Score →
                </button>
              </div>

              {/* 3 KPI cells */}
              <div className="card-dark p-4">
                <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-2 font-semibold flex items-center gap-1.5">
                  <Database className="h-3 w-3" /> Exposures Found
                </div>
                <div className="text-5xl font-black text-white leading-none">{result.total_exposures}</div>
                <div className="text-[10px] text-red-500 mt-2">{result.breaches.length} breach records</div>
                <div className="text-[10px] text-gray-600">{result.broker_listings.length} broker listings</div>
              </div>

              <div className="card-dark p-4">
                <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-2 font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="h-3 w-3" /> High Severity
                </div>
                <div className="text-5xl font-black text-red-500 leading-none">{highSev}</div>
                <div className="text-[10px] text-gray-600 mt-2">Critical / High breaches</div>
                <div className="text-[10px] text-red-400 mt-1">
                  {highSev > 0 ? 'Change passwords now' : 'No critical breaches'}
                </div>
              </div>

              <div className="card-dark p-4">
                <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-2 font-semibold flex items-center gap-1.5">
                  <Trash2 className="h-3 w-3" /> Ready to Remove
                </div>
                <div className="text-5xl font-black text-white leading-none">{result.broker_listings.length}</div>
                <div className="text-[10px] text-gray-600 mt-2">Brokers with your data</div>
                <button onClick={() => onNavigate('removal')} className="text-[10px] text-red-500 mt-1 hover:opacity-80">
                  Start opt-outs →
                </button>
              </div>
            </div>

            {/* ── Exposure Map ── */}
            <div className="card-dark p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-bold tracking-[0.15em] text-red-600 uppercase">Live Exposure Map</span>
                  </div>
                  <p className="text-xs text-gray-600">Your data traced across {result.total_exposures} sources in real time</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-gray-600">
                  <span className="flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-red-500" />Breach</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3 text-gray-600" />Broker</span>
                </div>
              </div>
              <ExposureMap
                brokers={result.broker_listings}
                breaches={result.breaches}
                userName={form.full_name || form.email?.split('@')[0] || 'YOU'}
              />
            </div>

            {/* ── Breach Records + Breakdown ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Breach cards */}
              <div className="card-dark p-5 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-bold text-white">Data Breaches Detected</span>
                    <span className="text-[10px] bg-red-950/50 text-red-400 border border-red-900/40 px-2 py-0.5 rounded-full">{result.breaches.length}</span>
                  </div>
                  {/* HIBP provider status pill */}
                  {result.hibp_provider && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">HIBP</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${
                        result.hibp_provider.status === 'completed'  ? 'bg-red-950/40 text-red-400 border-red-900/30' :
                        result.hibp_provider.status === 'no_match'   ? 'bg-gray-900/60 text-gray-500 border-gray-800/60' :
                        result.hibp_provider.status === 'failed'     ? 'bg-orange-950/40 text-orange-400 border-orange-900/30' :
                        'bg-gray-900/40 text-gray-600 border-gray-800/40'
                      }`}>
                        {result.hibp_provider.status === 'completed'
                          ? `${result.hibp_provider.breach_count + result.hibp_provider.paste_count} found`
                          : result.hibp_provider.status === 'no_match' ? 'clean'
                          : result.hibp_provider.status === 'failed'   ? 'check failed'
                          : 'skipped'}
                      </span>
                    </div>
                  )}
                </div>

                {result.breaches.length === 0 ? (
                  <div className="text-center py-8 text-gray-600 text-sm">No breach records found for this identity</div>
                ) : (
                  <div className="space-y-2">
                    {result.breaches.map((b, i) => {
                      const ev = result.hibp_provider?.evidence.find(e => e.source_name === b.source)
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-800/80 bg-gray-900/30 hover:border-red-900/40 transition-colors">
                          <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border flex-shrink-0 mt-0.5 tracking-wide ${SEV[b.severity] ?? SEV.low}`}>
                            {b.severity}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {ev?.source_url ? (
                                <a href={ev.source_url} target="_blank" rel="noopener noreferrer"
                                  className="font-bold text-white text-sm hover:text-red-400 transition-colors flex items-center gap-1">
                                  {b.source} <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                                </a>
                              ) : (
                                <span className="font-bold text-white text-sm">{b.source}</span>
                              )}
                              {b.breach_date && <span className="text-[10px] text-gray-600 font-mono">{b.breach_date.slice(0, 4)}</span>}
                              {b.record_count && <span className="text-[10px] text-gray-600">{(b.record_count / 1_000_000).toFixed(0)}M records</span>}
                            </div>
                            {b.description && <p className="text-[10px] text-gray-500 mb-1.5 leading-relaxed">{b.description}</p>}
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {b.exposed_fields.map(f => (
                                <span key={f} className="text-[9px] bg-gray-800/80 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700/50 font-mono">{f}</span>
                              ))}
                            </div>
                            {ev?.action_label && (
                              <div className="flex items-center gap-1 text-[10px] text-red-400 font-medium mt-1 pt-1.5 border-t border-gray-800/60">
                                <span className="text-red-600">→</span> {ev.action_label}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Exposure breakdown */}
              <div className="space-y-4">
                <div className="card-dark p-5">
                  <h3 className="text-sm font-bold text-white mb-4">Exposure Breakdown</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'People Search', count: result.broker_listings.length, pct: 52 },
                      { label: 'Breach Records', count: result.breaches.length, pct: Math.round(result.breaches.length / Math.max(result.total_exposures, 1) * 100) },
                      { label: 'Public Records', count: result.broker_listings.filter(b => b.fields_exposed?.includes('criminal')).length, pct: 13 },
                      { label: 'Ad Networks', count: 0, pct: 8 },
                    ].map(row => (
                      <div key={row.label}>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-gray-400">{row.label}</span>
                          <span className="text-gray-500 font-mono">{row.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-900 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-700"
                            style={{ width: `${Math.min(100, row.pct)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-dark p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">Action Required</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    {highSev > 0
                      ? `${highSev} high-severity breach${highSev > 1 ? 'es' : ''} detected. Change affected passwords and enable 2FA immediately.`
                      : 'Start opt-outs on the Removals tab to reduce your broker exposure score.'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* ── Broker Table ── */}
            <div className="card-dark p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-bold text-white">Brokers Listing Your Data</span>
                  <span className="text-[10px] bg-red-950/50 text-red-400 border border-red-900/40 px-2 py-0.5 rounded-full">{result.broker_listings.length}</span>
                </div>
                <button onClick={() => onNavigate('removal')} className="text-[10px] text-red-500 hover:opacity-80 border border-red-900/40 px-2.5 py-1 rounded-lg">
                  Start All Removals →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-800/60">
                      {['Broker', 'Fields Exposed', 'DSAR', 'Action'].map(h => (
                        <th key={h} className="text-left text-[10px] text-gray-600 font-semibold uppercase tracking-wide pb-2 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900/60">
                    {result.broker_listings.slice(0, 8).map((bl, i) => (
                      <tr key={i} className="hover:bg-red-950/5 transition-colors">
                        <td className="py-2.5 pr-4 font-semibold text-gray-200">{bl.broker_name}</td>
                        <td className="py-2.5 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {(bl.fields_exposed ?? ['name', 'address']).slice(0, 3).map(f => (
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
                                className="flex items-center gap-1 text-red-500 hover:text-red-400 font-medium transition-colors">
                                Opt Out <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            : <span className="text-gray-700">Manual</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.broker_listings.length > 8 && (
                  <button onClick={() => onNavigate('removal')} className="w-full mt-3 text-[10px] text-gray-600 hover:text-red-400 transition-colors">
                    +{result.broker_listings.length - 8} more brokers — view all in Removals tab →
                  </button>
                )}
              </div>
            </div>

            {/* ── Compliance ── */}
            {(result.compliance?.recommendations?.length ?? 0) > 0 && (
              <div className="card-dark p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-bold text-white">Legal & Compliance Signals</span>
                  <span className="text-[10px] text-gray-600">CCPA · GDPR · SHIELD Act</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.compliance!.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-400 p-3 rounded-xl bg-gray-900/40 border border-gray-800/60">
                      <span className="text-red-600 flex-shrink-0 font-mono mt-0.5">→</span>
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Quick Actions ── */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Trash2, label: 'Start Opt-Outs', sub: `${result.broker_listings.length} brokers`, tab: 'removal' },
                { icon: FileText, label: 'Build Report', sub: 'CCPA / FTC signals', tab: 'reports' },
                { icon: Download, label: 'Download Report', sub: 'Full PDF export', tab: 'reports' },
              ].map(a => (
                <button key={a.label} onClick={() => onNavigate(a.tab)}
                  className="card-dark p-4 text-left hover:border-red-900/40 transition-colors group">
                  <div className="h-8 w-8 rounded-lg bg-red-950/30 border border-red-900/30 flex items-center justify-center mb-3 group-hover:bg-red-950/60 transition-colors">
                    <a.icon className="h-4 w-4 text-red-500" />
                  </div>
                  <div className="text-sm font-semibold text-white">{a.label}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">{a.sub}</div>
                </button>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── PRE-SCAN: EXPOSURE DASHBOARD (Screenshot 2 layout) ─────────────── */}
      {!result && !scanning && (
        <div className="space-y-3">
          {/* Dashboard title */}
          <div>
            <h2 className="text-2xl font-black text-white">Exposure Dashboard</h2>
            <p className="text-xs text-gray-500 mt-0.5">Your personal data exposure overview</p>
          </div>

          {/* Two score cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card-dark p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="text-[10px] font-bold tracking-[0.12em] text-gray-500 uppercase mb-2">Privacy Score</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-black text-gray-700">—</span>
                  <span className="text-sm text-gray-700">/100</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-700">
                  <ShieldCheck className="h-3 w-3" /> Run a scan
                </div>
              </div>
              <div className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
                <svg width={64} height={64} className="absolute inset-0">
                  <circle cx={32} cy={32} r={26} fill="none" stroke="#1a1a1f" strokeWidth={7} />
                </svg>
                <svg width={64} height={64} className="absolute inset-0 -rotate-90">
                  <circle cx={32} cy={32} r={26} fill="none" stroke="#2a0a0a" strokeWidth={7}
                    strokeDasharray={2 * Math.PI * 26} strokeDashoffset={0} />
                </svg>
              </div>
            </div>

            <div className="card-dark p-4">
              <div className="text-[10px] font-bold tracking-[0.12em] text-gray-500 uppercase mb-2">Total Sources Found</div>
              <div className="text-4xl font-black text-gray-700 mb-1">—</div>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-700">
                <Database className="h-3 w-3 text-gray-800" /> Across 6 categories
              </div>
            </div>
          </div>

          {/* Rescan / Scan button — full width */}
          <button onClick={startScan} disabled={!hasInput}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl font-semibold text-sm transition-all
              bg-red-700/80 hover:bg-red-600 text-white border border-red-600/50 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ boxShadow: hasInput ? '0 0 24px rgba(220,38,38,0.3)' : undefined }}>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              {hasInput ? 'Scan My Exposure' : 'Enter details above to scan'}
            </div>
            <span className="text-red-300">→</span>
          </button>

          {/* Network graph — full width, card variant */}
          <div className="card-dark overflow-hidden" style={{ padding: 0 }}>
            <NetworkGraph variant="cards" animated size={360} />
          </div>

          {/* Action card */}
          <button onClick={startScan} disabled={!hasInput}
            className="w-full card-dark p-4 flex items-center gap-4 hover:border-red-900/50 transition-colors text-left disabled:cursor-default">
            <div className="h-12 w-12 rounded-full bg-red-950/60 border border-red-900/50 flex items-center justify-center flex-shrink-0"
              style={{ boxShadow: '0 0 16px rgba(220,38,38,0.3)' }}>
              <Activity className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-white mb-0.5">Your data may be widely exposed</div>
              <div className="text-xs text-gray-500">
                {hasInput ? 'Ready to scan — click to find your personal information across 450+ sources.' : 'Enter your name, email, or phone above to start your exposure scan.'}
              </div>
            </div>
            <span className="text-gray-700 flex-shrink-0">→</span>
          </button>

          {/* Stats bar */}
          <div className="card-dark p-4">
            <div className="grid grid-cols-4 gap-4 divide-x divide-gray-800/60">
              {[['1.8B+','Records Monitored'],['450+','Brokers Scanned'],['98%','Removal Rate'],['24/7','Monitoring']].map(([v,l],i) => (
                <div key={l} className={i > 0 ? 'pl-4' : ''}>
                  <div className="text-base font-black text-white">{v}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
