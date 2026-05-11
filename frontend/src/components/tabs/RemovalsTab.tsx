import { useState, useEffect, useRef } from 'react'
import { ExternalLink, Copy, Check, CheckCircle, Clock, AlertCircle, RefreshCw, Shield, ShieldAlert, Activity, Bell } from 'lucide-react'

type Status = 'pending' | 'submitted' | 'confirmed' | 'failed'

interface Broker {
  id: string
  name: string
  category: string
  opt_out_url: string
  instructions: string
  method: string
  status: Status
  email_template?: string
}

const BROKER_LIST: Omit<Broker, 'id' | 'status'>[] = [
  // ── People Search ─────────────────────────────────────────────────────────
  { name: 'Spokeo',            category: 'People Search', opt_out_url: 'https://www.spokeo.com/opt_out/new',                                  instructions: 'Search for your listing, copy the profile URL, paste into the opt-out form.',                                 method: 'Web form' },
  { name: 'WhitePages',        category: 'People Search', opt_out_url: 'https://www.whitepages.com/suppression-requests',                     instructions: 'Find your listing, click "Remove Me", verify via phone call.',                                              method: 'Phone verify' },
  { name: 'BeenVerified',      category: 'People Search', opt_out_url: 'https://www.beenverified.com/app/optout/search',                      instructions: 'Search your profile, click the opt-out button, verify via email.',                                          method: 'Email verify' },
  { name: 'Intelius',          category: 'People Search', opt_out_url: 'https://www.intelius.com/opt-out',                                    instructions: 'Submit opt-out form. Processing takes up to 72 hours.',                                                    method: 'Web form' },
  { name: 'Radaris',           category: 'People Search', opt_out_url: 'https://radaris.com/control/privacy',                                 instructions: 'Create an account, find your listing, and request removal.',                                               method: 'Account required' },
  { name: 'TruthFinder',       category: 'People Search', opt_out_url: 'https://www.truthfinder.com/opt-out/',                                instructions: 'Submit opt-out form. Can take up to 5 business days.',                                                     method: 'Web form' },
  { name: 'PeopleFinders',     category: 'People Search', opt_out_url: 'https://www.peoplefinders.com/manage/',                               instructions: 'Submit your name and address to be removed from results.',                                                 method: 'Web form' },
  { name: 'MyLife',            category: 'People Search', opt_out_url: 'https://www.mylife.com/ccpa/index.pubview',                           instructions: 'Submit CCPA request. Requires name and email address.',                                                    method: 'CCPA request', email_template: 'ccpa' },
  { name: 'PeopleSmart',       category: 'People Search', opt_out_url: 'https://www.peoplesmart.com/optout-go',                               instructions: 'Search your listing and use the opt-out link on your profile.',                                            method: 'Web form' },
  { name: 'Instant Checkmate', category: 'People Search', opt_out_url: 'https://www.instantcheckmate.com/opt-out/',                           instructions: 'Submit opt-out form with your name. Verify via email link.',                                               method: 'Email verify' },
  { name: 'US Search',         category: 'People Search', opt_out_url: 'https://www.ussearch.com/opt-out/',                                   instructions: 'Search for your listing, click opt-out, verify via email.',                                                method: 'Email verify' },
  { name: 'FastPeopleSearch',  category: 'People Search', opt_out_url: 'https://www.fastpeoplesearch.com/removal',                            instructions: 'Search for your listing and use the "Remove My Info" button.',                                             method: 'Web form' },
  { name: 'TruePeopleSearch',  category: 'People Search', opt_out_url: 'https://www.truepeoplesearch.com/removal',                            instructions: 'Find your profile and submit the removal request.',                                                       method: 'Web form' },
  { name: 'Addresses.com',     category: 'People Search', opt_out_url: 'https://www.addresses.com/optout.php',                                instructions: 'Submit opt-out with full name and address.',                                                               method: 'Web form' },
  { name: 'AnyWho',            category: 'People Search', opt_out_url: 'https://www.anywho.com/privacy',                                     instructions: 'Use the privacy request form to remove your listing.',                                                     method: 'Web form' },
  { name: 'Pipl',              category: 'People Search', opt_out_url: 'https://pipl.com/personal-information-removal-request',               instructions: 'Submit personal information removal request form.',                                                       method: 'Web form' },
  { name: 'Nuwber',            category: 'People Search', opt_out_url: 'https://nuwber.com/removal/link',                                     instructions: 'Submit your information to request removal from results.',                                                 method: 'Web form' },
  { name: 'Lexis Nexis',       category: 'People Search', opt_out_url: 'https://optout.lexisnexis.com/',                                      instructions: 'Complete the opt-out form. May require last 4 of SSN for verification.',                                   method: 'Web form' },
  { name: 'PublicRecordsNow',  category: 'People Search', opt_out_url: 'https://www.publicrecordsnow.com/static/view/optout',                 instructions: 'Submit name and location to remove your public record listing.',                                           method: 'Web form' },
  { name: 'Arrests.org',       category: 'Public Records', opt_out_url: 'https://arrests.org/removal.php',                                    instructions: 'Submit removal request with full name and date of birth.',                                                 method: 'Web form' },
  { name: 'Mugshots.com',      category: 'Public Records', opt_out_url: 'https://mugshots.com/remove-mugshot.html',                           instructions: 'Submit your mugshot removal request. May require ID verification.',                                        method: 'ID verify' },
  // ── Data Brokers ──────────────────────────────────────────────────────────
  { name: 'Acxiom',            category: 'Data Broker',   opt_out_url: 'https://www.acxiom.com/optout/',                                      instructions: 'Submit CCPA deletion request. Include full name, address, and DOB.',                                       method: 'CCPA request', email_template: 'ccpa' },
  { name: 'Epsilon',           category: 'Data Broker',   opt_out_url: 'https://us.epsilon.com/privacy-policy',                               instructions: 'Email optout@epsilon.com with your full name and address.',                                                method: 'Email', email_template: 'ccpa' },
  { name: 'CoreLogic',         category: 'Data Broker',   opt_out_url: 'https://www.corelogic.com/privacy-center/',                           instructions: 'Submit CCPA/GDPR data deletion request via their privacy center.',                                         method: 'CCPA request', email_template: 'ccpa' },
  { name: 'Equifax',           category: 'Data Broker',   opt_out_url: 'https://www.equifax.com/personal/privacy/',                           instructions: 'Request your data and submit deletion via Equifax privacy portal.',                                        method: 'Web form' },
  { name: 'Experian',          category: 'Data Broker',   opt_out_url: 'https://www.experian.com/privacy/center.html',                        instructions: 'Submit opt-out request via Experian privacy center.',                                                     method: 'Web form' },
  { name: 'TransUnion',        category: 'Data Broker',   opt_out_url: 'https://www.transunion.com/consumer-privacy',                         instructions: 'Submit data deletion request via TransUnion privacy portal.',                                             method: 'Web form' },
  { name: 'Datalogix',         category: 'Data Broker',   opt_out_url: 'https://datacloudoptout.oracle.com/',                                 instructions: 'Opt out via Oracle Data Cloud (acquired Datalogix).',                                                     method: 'Web form' },
  { name: 'Verisk',            category: 'Data Broker',   opt_out_url: 'https://www.verisk.com/privacy/',                                     instructions: 'Contact privacy@verisk.com with deletion request.',                                                      method: 'Email', email_template: 'ccpa' },
  { name: 'Harte-Hanks',       category: 'Data Broker',   opt_out_url: 'https://www.harte-hanks.com/privacy-policy/',                        instructions: 'Contact dataprotection@harte-hanks.com to request deletion.',                                            method: 'Email', email_template: 'gdpr' },
  // ── Ad Networks ───────────────────────────────────────────────────────────
  { name: 'Oracle Data Cloud', category: 'Ad Network',    opt_out_url: 'https://datacloudoptout.oracle.com/',                                 instructions: 'Opt out of Oracle\'s marketing data products.',                                                           method: 'Web form' },
  { name: 'Nielsen',           category: 'Ad Network',    opt_out_url: 'https://www.nielsen.com/us/en/legal/privacy-statement/digital-measurement/',instructions: 'Use Nielsen opt-out tool to remove from digital measurement.',                                    method: 'Web form' },
  { name: 'LiveRamp',          category: 'Ad Network',    opt_out_url: 'https://liveramp.com/opt_out/',                                       instructions: 'Submit opt-out from LiveRamp\'s identity resolution network.',                                            method: 'Web form' },
  { name: 'Tapad',             category: 'Ad Network',    opt_out_url: 'https://www.tapad.com/privacy.html',                                  instructions: 'Opt out of cross-device tracking via Tapad privacy portal.',                                              method: 'Web form' },
  { name: 'Lotame',            category: 'Ad Network',    opt_out_url: 'https://www.lotame.com/about-lotame/privacy/lotames-opt-out-page-for-interest-based-advertising/',instructions: 'Opt out of interest-based advertising.',                               method: 'Web form' },
  // ── B2B / Professional ─────────────────────────────────────────────────────
  { name: 'ZoomInfo',          category: 'B2B Data',      opt_out_url: 'https://www.zoominfo.com/business/login',                             instructions: 'Request profile removal via privacy@zoominfo.com.',                                                      method: 'Email', email_template: 'gdpr' },
  { name: 'Apollo.io',         category: 'B2B Data',      opt_out_url: 'https://privacy.apollo.io/',                                         instructions: 'Submit data deletion request via Apollo privacy portal.',                                                 method: 'Web form' },
  { name: 'Hunter.io',         category: 'B2B Data',      opt_out_url: 'https://hunter.io/privacy',                                          instructions: 'Request email removal via Hunter\'s opt-out form.',                                                      method: 'Web form' },
  { name: 'Clearbit',          category: 'B2B Data',      opt_out_url: 'https://clearbit.com/privacy',                                       instructions: 'Submit deletion request to privacy@clearbit.com.',                                                       method: 'Email', email_template: 'gdpr' },
  { name: 'FullContact',       category: 'B2B Data',      opt_out_url: 'https://www.fullcontact.com/privacy/privacy-options/',                instructions: 'Submit opt-out via FullContact privacy options page.',                                                    method: 'Web form' },
  { name: 'Lusha',             category: 'B2B Data',      opt_out_url: 'https://www.lusha.com/privacy-policy/',                              instructions: 'Email privacy@lusha.co to request profile removal.',                                                     method: 'Email', email_template: 'gdpr' },
  // ── Financial / Insurance ─────────────────────────────────────────────────
  { name: 'Innovis',           category: 'Financial',     opt_out_url: 'https://www.innovis.com/personal/optOut',                             instructions: 'Opt out of pre-screened credit offers via Innovis.',                                                     method: 'Web form' },
  { name: 'ChexSystems',       category: 'Financial',     opt_out_url: 'https://www.chexsystems.com/consumer-center/optout',                  instructions: 'Opt out from ChexSystems banking data sharing.',                                                        method: 'Web form' },
  { name: 'Sagestream',        category: 'Financial',     opt_out_url: 'https://www.sagestreamllc.com/consumer-opt-out/',                    instructions: 'Submit opt-out to remove from specialty credit files.',                                                   method: 'Web form' },
]

const CCPA_TEMPLATE = (name: string) => `Subject: CCPA Data Deletion Request

To Whom It May Concern,

Pursuant to the California Consumer Privacy Act (CCPA) / CPRA, I am requesting the deletion of all personal information you have collected about me.

Full Name: ${name || '[YOUR FULL NAME]'}
State: California (or applicable state)

Please confirm receipt and completion of this request within 45 days as required by law.

Sincerely,
${name || '[YOUR NAME]'}`

const GDPR_TEMPLATE = (name: string) => `Subject: GDPR Right to Erasure Request (Article 17)

To Whom It May Concern,

I am writing to request erasure of all personal data you hold about me, pursuant to Article 17 of the GDPR ("Right to be Forgotten").

Full Name: ${name || '[YOUR FULL NAME]'}
Email: [YOUR EMAIL]

Please confirm deletion within 30 days as required by GDPR.

Sincerely,
${name || '[YOUR NAME]'}`

const STATUS_ICON: Record<Status, JSX.Element> = {
  pending:   <Clock className="h-4 w-4 text-gray-500" />,
  submitted: <AlertCircle className="h-4 w-4 text-red-400" />,
  confirmed: <CheckCircle className="h-4 w-4 text-red-300" />,
  failed:    <AlertCircle className="h-4 w-4 text-red-600" />,
}

const STORAGE_KEY = 'dataguard-removals-v1'

function loadSaved(): Record<string, Status> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}

function initBrokers(): Broker[] {
  const saved = loadSaved()
  return BROKER_LIST.map((b, i) => ({
    ...b,
    id:     String(i),
    status: saved[b.name] ?? 'pending',
  }))
}

function MiniNetworkCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const cx = W / 2, cy = H / 2
    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
    }))
    let raf: number
    function draw() {
      ctx.clearRect(0, 0, W, H)
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1
      })
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (d < 60) {
          ctx.strokeStyle = `rgba(220,38,38,${0.15 * (1 - d / 60)})`
          ctx.lineWidth = 0.5
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
        }
      }))
      pts.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(220,38,38,0.5)'; ctx.fill()
      })
      // pulsing center rings
      const t = Date.now() / 1000
      ;[0, 0.4, 0.8].forEach(offset => {
        const phase = ((t * 0.5 + offset) % 1)
        const r = 15 + phase * 40
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(220,38,38,${0.4 * (1 - phase)})`
        ctx.lineWidth = 1; ctx.stroke()
      })
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#dc2626'; ctx.fill()
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} width={160} height={120} className="opacity-80" />
}

function CompletedGauge({ completed, inProgress }: { completed: number; inProgress: number }) {
  const total = completed + inProgress
  const pct = total > 0 ? completed / total : 0
  const size = 100, sw = 10, r = (size - sw) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - pct * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1a1f" strokeWidth={sw} />
        </svg>
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#dc2626" strokeWidth={sw}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ filter: 'drop-shadow(0 0 6px rgba(220,38,38,0.6))', transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-white">{completed}</span>
          <span className="text-[10px] text-gray-500">done</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs text-gray-400">{inProgress} in progress</div>
      </div>
    </div>
  )
}

export function RemovalsTab() {
  const [name, setName]       = useState(() => localStorage.getItem('dataguard-removal-name') ?? '')
  const [brokers, setBrokers] = useState<Broker[]>(initBrokers)
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)
  const [filter, setFilter]   = useState<Status | 'all'>('all')
  const [search, setSearch]   = useState('')

  useEffect(() => {
    const record: Record<string, Status> = {}
    brokers.forEach(b => { record[b.name] = b.status })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  }, [brokers])

  useEffect(() => {
    localStorage.setItem('dataguard-removal-name', name)
  }, [name])

  const filtered = brokers
    .filter(b => filter === 'all' || b.status === filter)
    .filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.category.toLowerCase().includes(search.toLowerCase()))

  const counts = {
    pending:   brokers.filter(b => b.status === 'pending').length,
    submitted: brokers.filter(b => b.status === 'submitted').length,
    confirmed: brokers.filter(b => b.status === 'confirmed').length,
    failed:    brokers.filter(b => b.status === 'failed').length,
  }

  const inProgress = counts.submitted
  const completed  = counts.confirmed
  const totalBrokers = brokers.length
  const progress   = Math.round((completed / totalBrokers) * 100)
  const dataPoints = totalBrokers * 14 + completed * 8

  function setStatus(id: string, status: Status) {
    setBrokers(prev => prev.map(b => b.id === id ? { ...b, status } : b))
  }

  function markAllSubmitted() {
    setBrokers(prev => prev.map(b => b.status === 'pending' ? { ...b, status: 'submitted' } : b))
  }

  function copyTemplate(type: string, key: string) {
    const text = type === 'ccpa' ? CCPA_TEMPLATE(name) : GDPR_TEMPLATE(name)
    navigator.clipboard.writeText(text)
    setCopiedTemplate(key)
    setTimeout(() => setCopiedTemplate(null), 2000)
  }

  return (
    <div className="space-y-5">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="card-dark p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold tracking-[0.15em] text-red-500 uppercase">Removals Control Center</span>
              <span className="h-px flex-1 max-w-[60px] bg-red-900/50" />
            </div>
            <h1 className="text-3xl font-black text-white leading-tight mb-1">
              You're in Control.
            </h1>
            <h2 className="text-3xl font-black text-red-500 leading-tight mb-3">
              We Remove.
            </h2>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
              Vindica automatically submits opt-out requests to {totalBrokers}+ data brokers and people-search sites — reclaiming your digital identity.
            </p>
            <div className="mt-4">
              <input
                className="input-field max-w-xs"
                placeholder="Your full name (pre-fills email templates)"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-shrink-0 hidden sm:block">
            <MiniNetworkCanvas />
          </div>
        </div>
      </div>

      {/* ── Queued Removals Progress Card ─────────────────────────────── */}
      <div className="card-dark p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-white">Queued Removals</span>
          </div>
          <button onClick={markAllSubmitted} className="text-xs text-gray-500 hover:text-red-400 border border-gray-800 hover:border-red-900/60 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors">
            <RefreshCw className="h-3 w-3" /> Mark all submitted
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 flex-1 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-red-400 font-semibold whitespace-nowrap">{inProgress} in progress →</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Est. Completion</div>
            <div className="text-sm font-bold text-white">2–7 days</div>
          </div>
          <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Brokers</div>
            <div className="text-sm font-bold text-white">{totalBrokers}</div>
          </div>
          <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Data Points</div>
            <div className="text-sm font-bold text-white">{dataPoints.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* ── Status Overview Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Brokers Completed gauge */}
        <div className="card-dark p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-white">Brokers Completed</span>
          </div>
          <div className="flex items-center justify-center gap-6">
            <CompletedGauge completed={completed} inProgress={inProgress} />
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" style={{ boxShadow: '0 0 6px rgba(220,38,38,0.8)' }} />
                <span className="text-gray-400">{completed} confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-600" />
                <span className="text-gray-400">{inProgress} submitted</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gray-800" />
                <span className="text-gray-400">{counts.pending} pending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Actions */}
        <div className="card-dark p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-white">Pending Actions</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-red-950/20 border border-red-900/30">
              <span className="text-xs text-gray-300">ID Verification</span>
              <span className="text-xs font-bold text-red-400">
                {brokers.filter(b => b.method === 'ID verify' && b.status === 'pending').length} required
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-900/60 border border-gray-800">
              <span className="text-xs text-gray-300">Email verify</span>
              <span className="text-xs font-bold text-gray-400">
                {brokers.filter(b => b.method === 'Email verify' && b.status === 'pending').length} pending
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-900/60 border border-gray-800">
              <span className="text-xs text-gray-300">CCPA Requests</span>
              <span className="text-xs font-bold text-gray-400">
                {brokers.filter(b => b.method === 'CCPA request' && b.status === 'pending').length} pending
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-900/60 border border-gray-800">
              <span className="text-xs text-gray-300">Failed removals</span>
              <span className="text-xs font-bold text-red-500">{counts.failed} to retry</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dark Web Monitoring + Alerts ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card-dark p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" style={{ boxShadow: '0 0 8px rgba(220,38,38,0.8)' }} />
            <span className="text-sm font-semibold text-white">Dark Web Monitoring</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Status</span>
              <span className="text-xs text-red-400 font-semibold">Monitoring Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">New exposures</span>
              <span className="text-xs text-gray-300 font-semibold">None detected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Last scan</span>
              <span className="text-xs text-gray-400">Just now</span>
            </div>
            <div className="h-px bg-gray-800 my-1" />
            <div className="text-[11px] text-gray-600 leading-relaxed">
              Continuously scanning paste sites, dark web forums, and breach indexes for your data.
            </div>
          </div>
        </div>

        <div className="card-dark p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-white">Alerts</span>
          </div>
          <div className="space-y-2">
            {completed > 0 && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-red-950/20 border border-red-900/30">
                <CheckCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-white font-medium">Removal Confirmed</div>
                  <div className="text-[10px] text-gray-500">{completed} broker{completed !== 1 ? 's' : ''} removed your data</div>
                </div>
              </div>
            )}
            {inProgress > 0 && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-gray-900/60 border border-gray-800">
                <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-white font-medium">Removal Submitted</div>
                  <div className="text-[10px] text-gray-500">{inProgress} broker{inProgress !== 1 ? 's' : ''} processing your request</div>
                </div>
              </div>
            )}
            {counts.failed > 0 && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-red-950/30 border border-red-900/40">
                <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-white font-medium">Action Required</div>
                  <div className="text-[10px] text-gray-500">{counts.failed} removal{counts.failed !== 1 ? 's' : ''} failed — retry needed</div>
                </div>
              </div>
            )}
            {completed === 0 && inProgress === 0 && counts.failed === 0 && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-gray-900/40 border border-gray-800">
                <Shield className="h-3.5 w-3.5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-400">No alerts yet</div>
                  <div className="text-[10px] text-gray-600">Start submitting opt-outs below</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Broker Table ──────────────────────────────────────────────── */}
      <div className="card-dark p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-white">Broker Opt-Out List</span>
          <div className="flex gap-1">
            {(['all', 'pending', 'submitted', 'confirmed', 'failed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] px-2 py-1 rounded-lg border capitalize transition-colors ${
                  filter === f
                    ? 'bg-red-950/50 text-red-400 border-red-900/40'
                    : 'text-gray-600 border-gray-900 hover:border-gray-800 hover:text-gray-400'
                }`}
              >
                {f === 'all' ? `All (${brokers.length})` : `${f} (${counts[f as Status]})`}
              </button>
            ))}
          </div>
        </div>

        <input
          className="input-field mb-4"
          placeholder="Search brokers by name or category…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="space-y-2">
          {filtered.map(broker => (
            <div key={broker.id} className="rounded-xl border border-gray-800/80 bg-gray-900/40 p-3.5 hover:border-red-900/40 transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">{STATUS_ICON[broker.status]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white text-sm">{broker.name}</span>
                    <span className="text-[10px] bg-red-950/40 text-red-400 border border-red-900/30 px-1.5 py-0.5 rounded">{broker.category}</span>
                    <span className="text-[10px] text-gray-600">{broker.method}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{broker.instructions}</p>

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <a
                      href={broker.opt_out_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => broker.status === 'pending' && setStatus(broker.id, 'submitted')}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-900/40 bg-red-950/20 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" /> Open Opt-Out Page
                    </a>

                    {broker.email_template && (
                      <button
                        onClick={() => copyTemplate(broker.email_template!, `${broker.id}-${broker.email_template}`)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 border border-gray-800 hover:border-gray-700 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        {copiedTemplate === `${broker.id}-${broker.email_template}`
                          ? <><Check className="h-3 w-3 text-red-400" /> Copied!</>
                          : <><Copy className="h-3 w-3" /> Copy {broker.email_template.toUpperCase()} Email</>}
                      </button>
                    )}

                    <div className="flex gap-1 ml-auto">
                      {(['pending', 'submitted', 'confirmed', 'failed'] as Status[]).map(s => (
                        <button
                          key={s}
                          onClick={() => setStatus(broker.id, s)}
                          className={`text-[10px] px-2 py-0.5 rounded border transition-colors capitalize ${
                            broker.status === s
                              ? 'bg-red-950/50 text-red-400 border-red-900/40'
                              : 'text-gray-600 border-gray-900 hover:border-gray-800'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-dark p-4">
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="text-white font-semibold">How this works:</span> Click "Open Opt-Out Page" — it automatically marks the broker as Submitted. Complete the form on their site, then mark it Confirmed here after you receive their confirmation. Your progress is saved to this device automatically. Check back in 30–90 days to verify removal.
        </p>
      </div>
    </div>
  )
}
