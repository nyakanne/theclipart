import { useState } from 'react'
import { Search, ExternalLink, AlertTriangle, Globe, MapPin, User, Mail, Hash, ChevronDown, ChevronUp, Loader, CheckCircle, XCircle, ShieldOff, HelpCircle, RotateCcw, Shield, Wifi } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

// ── Username platform probe result ────────────────────────────────────────────
interface PlatformResult {
  name: string
  category: string
  url: string
  status: 'found' | 'not_found' | 'protected' | 'error'
}

const STATUS_STYLE: Record<string, string> = {
  found:     'text-red-400 bg-red-950/40 border-red-900/50',
  not_found: 'text-gray-600 bg-gray-900/30 border-gray-800',
  protected: 'text-yellow-500 bg-yellow-950/20 border-yellow-900/30',
  error:     'text-gray-700 bg-gray-950 border-gray-900',
}
const STATUS_ICON: Record<string, typeof CheckCircle> = {
  found:     CheckCircle,
  not_found: XCircle,
  protected: ShieldOff,
  error:     HelpCircle,
}
const STATUS_LABEL: Record<string, string> = {
  found:     'Found',
  not_found: 'Not found',
  protected: 'Protected',
  error:     'Error',
}

// ── IP Lookup ────────────────────────────────────────────────────────────────
interface IpResult {
  ip: string; city?: string; region?: string; country_name?: string
  org?: string; timezone?: string; latitude?: number; longitude?: number
  error?: boolean; reason?: string
}

// ── Phone Lookup ─────────────────────────────────────────────────────────────
interface PhoneResult {
  input: string; e164: string; international: string; national: string
  country_code: number; region_code: string; country: string
  carrier: string; line_type: string; timezones: string[]
  valid: boolean; possible: boolean
}

// ── Domain Lookup ────────────────────────────────────────────────────────────
interface DomainResult {
  domain: string; registrar?: string; created?: string; expires?: string
  nameservers?: string[]; status?: string[]; error?: string
}
interface UrlScanResult {
  url: string; title: string; ip: string; country: string
  screenshot: string; scan_date: string; malicious: boolean; score: number; tags: string[]
}
interface DomainIntel {
  domain: string
  virustotal: {
    malicious: number; suspicious: number; harmless: number; undetected: number
    reputation: number; categories: Record<string, string>; tags: string[]
    registrar: string; creation_date?: number; last_analysis_date?: number
  } | null
  urlscan: UrlScanResult[]
  shodan: {
    ip: string; org: string; isp: string; country: string; os?: string
    ports: number[]; hostnames: string[]; vulns: string[]
    services: { port: number; product: string; version: string; banner: string }[]
  } | null
  available: { virustotal: boolean; shodan: boolean }
}

// ── Email scan result (subset we need) ───────────────────────────────────────
interface BreachRecord {
  source: string; severity: string; exposed_fields: string[]
  breach_date?: string; record_count?: number; description?: string
}
interface HibpProvider {
  status: string; breach_count: number; paste_count: number
  evidence: Array<{ source_name: string; source_url?: string; action_label: string; risk_level: string; exposed_fields: string[] }>
}
interface EmailScanResult {
  total_exposures: number; risk_score: number
  breaches: BreachRecord[]; hibp_provider?: HibpProvider | null
}

const SEV: Record<string, string> = {
  critical: 'text-red-400 bg-red-950/40 border-red-900/50',
  high:     'text-red-400 bg-red-950/30 border-red-900/40',
  medium:   'text-red-300 bg-red-950/20 border-red-900/30',
  low:      'text-gray-400 bg-gray-900/40 border-gray-800',
}

type Tool = 'username' | 'ip' | 'domain' | 'email' | 'phone'
const TOOLS: { id: Tool; label: string; icon: typeof Search }[] = [
  { id: 'username', label: 'Username Search', icon: User  },
  { id: 'ip',       label: 'IP Geolocation',  icon: MapPin },
  { id: 'domain',   label: 'Domain Lookup',   icon: Globe  },
  { id: 'email',    label: 'Email Breach',    icon: Mail   },
  { id: 'phone',    label: 'Phone Lookup',    icon: Hash   },
]


export function OsintTab() {
  const [activeTool, setActiveTool] = useState<Tool>('username')
  const token = useAuthStore(s => s.token)

  function authHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token && token !== 'demo-token-vindica') h['Authorization'] = `Bearer ${token}`
    return h
  }

  // ── Username state ──────────────────────────────────────────────────────────
  const [username, setUsername]           = useState('')
  const [uLoading, setULoading]           = useState(false)
  const [uResults, setUResults]           = useState<PlatformResult[] | null>(null)
  const [uError, setUError]               = useState('')
  const [uCategory, setUCategory]         = useState('All')

  async function probeUsername() {
    const u = username.trim().replace(/^@+/, '')
    if (!u) return
    setULoading(true); setUResults(null); setUError('')
    try {
      const r = await fetch(`/api/v1/osint/username/${encodeURIComponent(u)}`, { headers: authHeaders() })
      if (!r.ok) throw new Error(`Probe failed (${r.status})`)
      setUResults(await r.json())
    } catch (e) {
      setUError(e instanceof Error ? e.message : 'Probe failed')
    } finally {
      setULoading(false)
    }
  }

  const uCategories = uResults
    ? ['All', ...Array.from(new Set(uResults.map(r => r.category)))]
    : ['All']
  const filteredResults = uResults
    ? (uCategory === 'All' ? uResults : uResults.filter(r => r.category === uCategory))
    : []
  const foundCount = uResults?.filter(r => r.status === 'found').length ?? 0

  // ── IP state ────────────────────────────────────────────────────────────────
  const [ipInput, setIpInput]     = useState('')
  const [ipResult, setIpResult]   = useState<IpResult | null>(null)
  const [ipLoading, setIpLoading] = useState(false)
  const [ipError, setIpError]     = useState('')

  async function lookupIp() {
    const q = ipInput.trim()
    if (!q) return
    setIpLoading(true); setIpResult(null); setIpError('')
    try {
      const r = await fetch(`https://ipapi.co/${encodeURIComponent(q)}/json/`)
      const d = await r.json()
      if (d.error) setIpError(d.reason ?? 'Invalid IP or rate limited')
      else setIpResult(d)
    } catch {
      setIpError('Request failed — check your connection or try again')
    } finally {
      setIpLoading(false)
    }
  }

  // ── Domain state ────────────────────────────────────────────────────────────
  const [domainInput, setDomainInput]       = useState('')
  const [domainResult, setDomainResult]     = useState<DomainResult | null>(null)
  const [domainIntel, setDomainIntel]       = useState<DomainIntel | null>(null)
  const [domainLoading, setDomainLoading]   = useState(false)
  const [domainExpanded, setDomainExpanded] = useState(false)

  async function lookupDomain() {
    const q = domainInput.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '')
    if (!q) return
    setDomainLoading(true); setDomainResult(null); setDomainIntel(null)
    try {
      const [rdapRes, intelRes] = await Promise.allSettled([
        fetch(`https://rdap.org/domain/${encodeURIComponent(q)}`),
        fetch(`/api/v1/osint/domain-intel/${encodeURIComponent(q)}`, { headers: authHeaders() }),
      ])

      if (rdapRes.status === 'fulfilled' && rdapRes.value.ok) {
        const d = await rdapRes.value.json()
        const ns = d.nameservers?.map((n: { ldhName: string }) => n.ldhName).filter(Boolean) ?? []
        const events = d.events ?? []
        const getDate = (type: string) => events.find((e: { eventAction: string; eventDate: string }) => e.eventAction === type)?.eventDate?.slice(0, 10)
        const registrar = d.entities?.find((e: { roles: string[] }) => e.roles?.includes('registrar'))?.vcardArray?.[1]?.find(
          (v: string[]) => v[0] === 'fn'
        )?.[3]
        setDomainResult({ domain: q, registrar: registrar ?? 'Unknown', created: getDate('registration'), expires: getDate('expiration'), nameservers: ns, status: d.status ?? [] })
      } else {
        setDomainResult({ domain: q, error: 'RDAP lookup failed — domain may not exist' })
      }

      if (intelRes.status === 'fulfilled' && intelRes.value.ok) {
        setDomainIntel(await intelRes.value.json())
      }
    } catch {
      setDomainResult({ domain: domainInput.trim(), error: 'Lookup failed — check your connection' })
    } finally {
      setDomainLoading(false)
    }
  }

  // ── Email scan state ────────────────────────────────────────────────────────
  const [emailInput, setEmailInput]       = useState('')
  const [emailScanning, setEmailScanning] = useState(false)
  const [emailProgress, setEmailProgress] = useState(0)
  const [emailStage, setEmailStage]       = useState('')
  const [emailResult, setEmailResult]     = useState<EmailScanResult | null>(null)
  const [emailError, setEmailError]       = useState('')

  async function runEmailScan() {
    const e = emailInput.trim()
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setEmailError('Enter a valid email address'); return }
    setEmailScanning(true); setEmailResult(null); setEmailError(''); setEmailProgress(0); setEmailStage('Starting scan…')
    try {
      const res = await fetch('/api/v1/scans', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ email: e }) })
      if (!res.ok) throw new Error(`Scan failed (${res.status})`)
      const { scan_id } = await res.json()
      while (true) {
        await new Promise(r => setTimeout(r, 1000))
        const s = await fetch(`/api/v1/scans/${scan_id}/status`, { headers: authHeaders() })
        const job = await s.json()
        setEmailProgress(job.progress ?? 0)
        if (job.current_stage) setEmailStage(job.current_stage)
        if (job.status === 'completed' || job.status === 'failed') break
      }
      const full = await fetch(`/api/v1/scans/${scan_id}`, { headers: authHeaders() })
      setEmailResult(await full.json())
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setEmailScanning(false)
    }
  }

  // ── Phone state ─────────────────────────────────────────────────────────────
  const [phoneInput, setPhoneInput]       = useState('')
  const [phoneResult, setPhoneResult]     = useState<PhoneResult | null>(null)
  const [phoneLoading, setPhoneLoading]   = useState(false)
  const [phoneError, setPhoneError]       = useState('')

  async function analyzePhone() {
    const p = phoneInput.trim()
    if (!p) return
    setPhoneLoading(true); setPhoneResult(null); setPhoneError('')
    try {
      const r = await fetch(`/api/v1/osint/phone/${encodeURIComponent(p)}`, { headers: authHeaders() })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.detail ?? `Phone lookup failed (${r.status})`)
      }
      setPhoneResult(await r.json())
    } catch (e) {
      setPhoneError(e instanceof Error ? e.message : 'Lookup failed')
    } finally {
      setPhoneLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="card-dark p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold tracking-[0.15em] text-red-500 uppercase">OSINT Intelligence Engine</span>
          <span className="h-px w-12 bg-red-900/50" />
        </div>
        <h1 className="text-2xl font-black text-white leading-tight mb-1">Know Your</h1>
        <h2 className="text-2xl font-black text-red-500 leading-tight mb-3">Digital Shadow.</h2>
        <p className="text-sm text-gray-400 max-w-md leading-relaxed">
          Username lookup, IP geolocation, domain intel, breach checks — all public data, mapped to your threat profile.
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/20 border border-red-900/30">
        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-300 mb-1">White-Hat OSINT Only</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            These tools use <strong>public data only</strong>: open social profiles, public WHOIS, and IP geolocation.
            No hacking, no private data, no unauthorized access. Use to document evidence for law enforcement — not to harass or stalk.
          </p>
        </div>
      </div>

      {/* Tool selector */}
      <div className="flex flex-wrap gap-2">
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => setActiveTool(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              activeTool === t.id ? 'bg-red-950/60 text-red-400 border-red-900/50' : 'border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* ── USERNAME SEARCH ───────────────────────────────────────────────────── */}
      {activeTool === 'username' && (
        <div className="space-y-4">
          <div className="card-dark p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
                <User className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-white">Username Search</h2>
                <p className="text-xs text-gray-500">Live-probe 26 platforms — results appear in-app, no redirects</p>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                className="input-field flex-1"
                placeholder="Enter username to probe (no @ needed)"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !uLoading && probeUsername()}
                disabled={uLoading}
              />
              <button
                onClick={uResults ? () => { setUResults(null); setUCategory('All') } : probeUsername}
                disabled={!username.trim() && !uResults}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-40"
              >
                {uLoading ? <Loader className="h-4 w-4 animate-spin" /> : uResults ? <RotateCcw className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                {uLoading ? 'Probing…' : uResults ? 'New Search' : 'Check Platforms'}
              </button>
            </div>

            {uError && <div className="mt-2 p-3 rounded-xl bg-red-950/20 border border-red-900/30 text-xs text-red-400 font-mono">! {uError}</div>}

            {uResults && (
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <span className="text-sm font-bold text-white">{foundCount} found</span>
                <span className="text-xs text-gray-600">across {uResults.length} platforms</span>
                <div className="flex flex-wrap gap-1.5 ml-auto">
                  {uCategories.map(cat => (
                    <button key={cat} onClick={() => setUCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                        uCategory === cat ? 'bg-red-950/60 text-red-400 border-red-900/50' : 'border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400'
                      }`}
                    >{cat}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {uResults && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredResults.map(platform => {
                const Icon = STATUS_ICON[platform.status] ?? HelpCircle
                const styleClass = STATUS_STYLE[platform.status] ?? STATUS_STYLE.error
                return (
                  <div key={platform.name} className={`flex items-center justify-between p-3 rounded-xl border ${styleClass}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="text-sm font-medium text-white truncate">{platform.name}</span>
                      <span className="text-[9px] text-current opacity-70 flex-shrink-0">{STATUS_LABEL[platform.status]}</span>
                    </div>
                    {platform.status === 'found' && (
                      <a href={platform.url} target="_blank" rel="noopener noreferrer"
                        className="ml-2 flex-shrink-0 text-red-400 hover:text-red-300 transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!uResults && !uLoading && (
            <div className="card-dark p-8 text-center">
              <User className="h-8 w-8 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-600">Enter a username above and click <strong className="text-gray-400">Check Platforms</strong></p>
              <p className="text-xs text-gray-700 mt-1">Results show as found / not found / protected — no external redirects</p>
            </div>
          )}
        </div>
      )}

      {/* ── IP GEOLOCATION ───────────────────────────────────────────────────── */}
      {activeTool === 'ip' && (
        <div className="space-y-4">
          <div className="card-dark p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-white">IP Geolocation</h2>
                <p className="text-xs text-gray-500">Look up approximate location, ISP, and timezone for any IP address</p>
              </div>
            </div>

            <div className="flex gap-2">
              <input className="input-field flex-1" placeholder="Enter IP address (e.g. 8.8.8.8)"
                value={ipInput} onChange={e => setIpInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookupIp()} />
              <button onClick={lookupIp} disabled={!ipInput.trim() || ipLoading} className="btn-red">
                {ipLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Lookup
              </button>
            </div>

            {ipError && <div className="mt-3 p-3 rounded-xl bg-red-950/20 border border-red-900/30"><p className="text-xs text-red-400">{ipError}</p></div>}

            {ipResult && !ipResult.error && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  ['IP Address', ipResult.ip],
                  ['City', ipResult.city ?? '—'],
                  ['Region / State', ipResult.region ?? '—'],
                  ['Country', ipResult.country_name ?? '—'],
                  ['ISP / Org', ipResult.org ?? '—'],
                  ['Timezone', ipResult.timezone ?? '—'],
                  ['Coordinates', ipResult.latitude && ipResult.longitude ? `${ipResult.latitude}, ${ipResult.longitude}` : '—'],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="bg-gray-950 rounded-xl border border-gray-800 p-3">
                    <p className="text-[10px] text-gray-600 font-semibold uppercase mb-1">{label}</p>
                    <p className="text-sm text-white font-mono break-all">{value}</p>
                  </div>
                ))}
                {ipResult.latitude && ipResult.longitude && (
                  <a href={`https://maps.google.com/?q=${ipResult.latitude},${ipResult.longitude}`} target="_blank" rel="noopener noreferrer"
                    className="sm:col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-700 text-sm font-semibold text-white hover:border-gray-600 hover:bg-gray-900 transition-colors">
                    <MapPin className="h-4 w-4 text-red-400" /> View on Google Maps
                  </a>
                )}
              </div>
            )}

            <p className="text-[10px] text-gray-700 mt-4 leading-relaxed">
              Geolocation is approximate (city-level). ISP data may reveal VPN/proxy usage. For precise location, you need a court subpoena to the ISP.
            </p>
          </div>
        </div>
      )}

      {/* ── DOMAIN LOOKUP ────────────────────────────────────────────────────── */}
      {activeTool === 'domain' && (
        <div className="space-y-4">
          <div className="card-dark p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
                <Globe className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-white">Domain / WHOIS Lookup</h2>
                <p className="text-xs text-gray-500">Find registration date, expiry, registrar, and nameservers via RDAP</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <input className="input-field flex-1" placeholder="Enter domain (e.g. example.com)"
                value={domainInput} onChange={e => setDomainInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookupDomain()} />
              <button onClick={lookupDomain} disabled={!domainInput.trim() || domainLoading} className="btn-red">
                {domainLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Lookup
              </button>
            </div>

            {domainResult && (
              <div className="space-y-2">
                {domainResult.error ? (
                  <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/30"><p className="text-xs text-red-400">{domainResult.error}</p></div>
                ) : (
                  <>
                    {([
                      ['Domain', domainResult.domain],
                      ['Registrar', domainResult.registrar ?? '—'],
                      ['Registered', domainResult.created ?? '—'],
                      ['Expires', domainResult.expires ?? '—'],
                    ] as [string, string][]).map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between bg-gray-950 rounded-xl border border-gray-800 px-4 py-3">
                        <span className="text-xs text-gray-500 font-semibold">{label}</span>
                        <span className="text-sm text-white font-mono">{value}</span>
                      </div>
                    ))}
                    {(domainResult.nameservers?.length ?? 0) > 0 && (
                      <div>
                        <button onClick={() => setDomainExpanded(!domainExpanded)}
                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                          {domainExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          Nameservers ({domainResult.nameservers?.length})
                        </button>
                        {domainExpanded && (
                          <div className="mt-2 space-y-1.5">
                            {domainResult.nameservers?.map(ns => (
                              <div key={ns} className="bg-gray-950 rounded-lg border border-gray-800 px-4 py-2">
                                <span className="text-xs text-red-400 font-mono">{ns}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

          </div>

          {/* ── Domain Intel ── */}
          {domainIntel && (
            <div className="space-y-4">

              {/* VirusTotal */}
              {domainIntel.virustotal ? (
                <div className="card-dark p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">VirusTotal Analysis</h3>
                      <p className="text-xs text-gray-500">Community threat intelligence</p>
                    </div>
                    <div className={`ml-auto px-3 py-1 rounded-full text-xs font-bold border ${
                      domainIntel.virustotal.malicious > 0
                        ? 'bg-red-950/50 text-red-400 border-red-900/50'
                        : 'bg-gray-900 text-gray-400 border-gray-800'
                    }`}>
                      {domainIntel.virustotal.malicious > 0
                        ? `${domainIntel.virustotal.malicious} malicious`
                        : 'Clean'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    {[
                      ['Malicious',  domainIntel.virustotal.malicious,  'text-red-400'],
                      ['Suspicious', domainIntel.virustotal.suspicious, 'text-yellow-500'],
                      ['Harmless',   domainIntel.virustotal.harmless,   'text-green-500'],
                      ['Undetected', domainIntel.virustotal.undetected, 'text-gray-500'],
                    ].map(([label, val, color]) => (
                      <div key={label as string} className="bg-gray-950 rounded-xl border border-gray-800 p-3 text-center">
                        <div className={`text-2xl font-black ${color}`}>{val as number}</div>
                        <div className="text-[10px] text-gray-600 mt-1 uppercase tracking-wide">{label as string}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      ['Reputation Score', String(domainIntel.virustotal.reputation)],
                      ['Registrar', domainIntel.virustotal.registrar || '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between bg-gray-950 rounded-xl border border-gray-800 px-4 py-3">
                        <span className="text-xs text-gray-500 font-semibold">{k}</span>
                        <span className="text-sm text-white font-mono">{v}</span>
                      </div>
                    ))}
                  </div>

                  {Object.keys(domainIntel.virustotal.categories).length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] text-gray-600 uppercase font-semibold mb-2">Categories</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.values(domainIntel.virustotal.categories).map((cat, i) => (
                          <span key={i} className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700">{cat as string}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : !domainIntel.available.virustotal ? (
                <div className="card-dark p-4 flex items-center gap-3">
                  <Shield className="h-4 w-4 text-gray-700 flex-shrink-0" />
                  <p className="text-xs text-gray-600">VirusTotal analysis unavailable — add <code className="text-gray-500">VIRUSTOTAL_API_KEY</code> to enable (free at virustotal.com)</p>
                </div>
              ) : null}

              {/* URLScan.io */}
              {domainIntel.urlscan.length > 0 && (
                <div className="card-dark p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
                      <Globe className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">URLScan.io — Recent Scans</h3>
                      <p className="text-xs text-gray-500">{domainIntel.urlscan.length} recent scan{domainIntel.urlscan.length !== 1 ? 's' : ''} on record</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {domainIntel.urlscan.map((scan, i) => (
                      <div key={i} className={`p-3 rounded-xl border ${scan.malicious ? 'border-red-900/50 bg-red-950/20' : 'border-gray-800 bg-gray-900/30'}`}>
                        <div className="flex items-start gap-3">
                          {scan.screenshot && (
                            <img src={scan.screenshot} alt="" className="w-16 h-12 object-cover rounded border border-gray-800 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {scan.malicious && <span className="text-[10px] font-bold text-red-400 bg-red-950/40 border border-red-900/40 px-1.5 py-0.5 rounded">MALICIOUS</span>}
                              {scan.tags.map(t => <span key={t} className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">{t}</span>)}
                            </div>
                            {scan.title && <p className="text-sm font-semibold text-white truncate mb-1">{scan.title}</p>}
                            <p className="text-[10px] text-gray-500 font-mono truncate">{scan.url}</p>
                            <div className="flex items-center gap-3 mt-1">
                              {scan.ip && <span className="text-[10px] text-gray-600">IP: {scan.ip}</span>}
                              {scan.country && <span className="text-[10px] text-gray-600">{scan.country}</span>}
                              {scan.scan_date && <span className="text-[10px] text-gray-700">{scan.scan_date.slice(0, 10)}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shodan */}
              {domainIntel.shodan ? (
                <div className="card-dark p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
                      <Wifi className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Shodan — Host Intelligence</h3>
                      <p className="text-xs text-gray-500">{domainIntel.shodan.ip} · {domainIntel.shodan.country}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {[
                      ['IP',  domainIntel.shodan.ip],
                      ['Org', domainIntel.shodan.org || '—'],
                      ['ISP', domainIntel.shodan.isp || '—'],
                      ['OS',  domainIntel.shodan.os  || 'Unknown'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between bg-gray-950 rounded-xl border border-gray-800 px-4 py-3">
                        <span className="text-xs text-gray-500 font-semibold">{k}</span>
                        <span className="text-sm text-white font-mono">{v}</span>
                      </div>
                    ))}
                  </div>

                  {domainIntel.shodan.ports.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] text-gray-600 uppercase font-semibold mb-2">Open Ports</p>
                      <div className="flex flex-wrap gap-1.5">
                        {domainIntel.shodan.ports.map(p => (
                          <span key={p} className="text-[10px] font-mono bg-red-950/30 text-red-400 border border-red-900/40 px-2 py-0.5 rounded">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {domainIntel.shodan.vulns.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] text-gray-600 uppercase font-semibold mb-2">Known CVEs</p>
                      <div className="flex flex-wrap gap-1.5">
                        {domainIntel.shodan.vulns.map(v => (
                          <span key={v} className="text-[10px] font-mono bg-red-950/50 text-red-400 border border-red-900/50 px-2 py-0.5 rounded">{v}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {domainIntel.shodan.services.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-600 uppercase font-semibold mb-2">Services</p>
                      <div className="space-y-1.5">
                        {domainIntel.shodan.services.map((svc, i) => (
                          <div key={i} className="flex items-center gap-3 bg-gray-950 rounded-lg border border-gray-800 px-3 py-2">
                            <span className="text-xs font-mono text-red-400 font-bold w-10 flex-shrink-0">{svc.port}</span>
                            <span className="text-xs text-white">{svc.product || 'Unknown'}{svc.version ? ` ${svc.version}` : ''}</span>
                            {svc.banner && <span className="text-[10px] text-gray-600 truncate ml-auto">{svc.banner}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : !domainIntel.available.shodan ? (
                <div className="card-dark p-4 flex items-center gap-3">
                  <Wifi className="h-4 w-4 text-gray-700 flex-shrink-0" />
                  <p className="text-xs text-gray-600">Shodan host intel unavailable — add <code className="text-gray-500">SHODAN_API_KEY</code> to enable (free at account.shodan.io)</p>
                </div>
              ) : null}

            </div>
          )}
        </div>
      )}

      {/* ── EMAIL BREACH (in-app scan) ────────────────────────────────────────── */}
      {activeTool === 'email' && (
        <div className="space-y-4">
          <div className="card-dark p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
                <Mail className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-white">Email Breach Lookup</h2>
                <p className="text-xs text-gray-500">Real-time breach scan — results shown here, no external redirects</p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                placeholder="Enter email address to scan"
                value={emailInput}
                onChange={e => { setEmailInput(e.target.value); setEmailError('') }}
                onKeyDown={e => e.key === 'Enter' && !emailScanning && runEmailScan()}
                disabled={emailScanning}
                type="email"
              />
              <button
                onClick={emailResult ? () => setEmailResult(null) : runEmailScan}
                disabled={!emailInput.trim() && !emailResult}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-40"
              >
                {emailScanning ? <Loader className="h-4 w-4 animate-spin" /> : emailResult ? <RotateCcw className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                {emailScanning ? 'Scanning…' : emailResult ? 'New Scan' : 'Scan Email'}
              </button>
            </div>

            {emailScanning && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-[10px] text-gray-600 font-mono">
                  <span>{emailStage}</span>
                  <span>{Math.round(emailProgress)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-900 overflow-hidden">
                  <div className="h-full rounded-full bg-red-600 transition-all duration-500" style={{ width: `${emailProgress}%` }} />
                </div>
              </div>
            )}

            {emailError && <div className="mt-3 p-3 rounded-xl bg-red-950/20 border border-red-900/30 text-xs text-red-400 font-mono">! {emailError}</div>}
          </div>

          {emailResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card-dark p-4 text-center">
                  <div className="text-3xl font-black text-red-400">{emailResult.breaches.length}</div>
                  <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">Breach records</div>
                </div>
                <div className="card-dark p-4 text-center">
                  <div className="text-3xl font-black text-white">{emailResult.total_exposures}</div>
                  <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">Total exposures</div>
                </div>
              </div>

              {/* HIBP status */}
              {emailResult.hibp_provider && (
                <div className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${
                  emailResult.hibp_provider.status === 'completed' ? 'bg-red-950/20 border-red-900/30 text-red-300' :
                  emailResult.hibp_provider.status === 'no_match'  ? 'bg-gray-900/40 border-gray-800 text-gray-400' :
                  'bg-gray-900/40 border-gray-800 text-gray-500'
                }`}>
                  {emailResult.hibp_provider.status === 'completed'
                    ? <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    : <CheckCircle className="h-4 w-4 text-gray-600 flex-shrink-0" />}
                  <span className="font-semibold">Have I Been Pwned:</span>
                  {emailResult.hibp_provider.status === 'completed'
                    ? `${emailResult.hibp_provider.breach_count} breach${emailResult.hibp_provider.breach_count !== 1 ? 'es' : ''}, ${emailResult.hibp_provider.paste_count} paste${emailResult.hibp_provider.paste_count !== 1 ? 's' : ''} found`
                    : emailResult.hibp_provider.status === 'no_match' ? 'No breaches found — email appears clean'
                    : emailResult.hibp_provider.status === 'failed'   ? 'HIBP check failed (rate limit or error)'
                    : 'HIBP check skipped (no API key configured)'}
                </div>
              )}

              {/* Breach list */}
              <div className="card-dark p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-bold text-white">Data Breaches</span>
                  <span className="text-[10px] bg-red-950/50 text-red-400 border border-red-900/40 px-2 py-0.5 rounded-full">{emailResult.breaches.length}</span>
                </div>
                {emailResult.breaches.length === 0 ? (
                  <p className="text-center py-6 text-gray-600 text-sm">No breach records found for this email</p>
                ) : (
                  <div className="space-y-2">
                    {emailResult.breaches.map((b, i) => {
                      const ev = emailResult.hibp_provider?.evidence?.find(e => e.source_name === b.source)
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-800/80 bg-gray-900/30">
                          <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border flex-shrink-0 mt-0.5 ${SEV[b.severity] ?? SEV.low}`}>
                            {b.severity}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {ev?.source_url ? (
                                <a href={ev.source_url} target="_blank" rel="noopener noreferrer"
                                  className="font-bold text-white text-sm hover:text-red-400 transition-colors flex items-center gap-1">
                                  {b.source} <ExternalLink className="h-2.5 w-2.5 opacity-40" />
                                </a>
                              ) : (
                                <span className="font-bold text-white text-sm">{b.source}</span>
                              )}
                              {b.breach_date && <span className="text-[10px] text-gray-600 font-mono">{b.breach_date.slice(0, 4)}</span>}
                              {b.record_count && <span className="text-[10px] text-gray-600">{(b.record_count / 1e6).toFixed(1)}M records</span>}
                            </div>
                            {b.description && <p className="text-[10px] text-gray-500 mb-1.5 leading-relaxed">{b.description}</p>}
                            <div className="flex flex-wrap gap-1 mb-1">
                              {b.exposed_fields.map(f => (
                                <span key={f} className="text-[9px] bg-gray-800/80 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700/50 font-mono">{f}</span>
                              ))}
                            </div>
                            {ev?.action_label && (
                              <div className="flex items-center gap-1 text-[10px] text-red-400 font-medium pt-1.5 border-t border-gray-800/40 mt-1">
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
            </div>
          )}
        </div>
      )}

      {/* ── PHONE LOOKUP ─────────────────────────────────────────────────────── */}
      {activeTool === 'phone' && (
        <div className="space-y-4">
          <div className="card-dark p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
                <Hash className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-white">Phone Number Analysis</h2>
                <p className="text-xs text-gray-500">Country, carrier, line type and validity — results in-app, no redirects</p>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                className="input-field flex-1"
                placeholder="Enter phone number (e.g. +1 555 123 4567 or +447911123456)"
                value={phoneInput}
                onChange={e => { setPhoneInput(e.target.value); setPhoneError('') }}
                onKeyDown={e => e.key === 'Enter' && !phoneLoading && analyzePhone()}
                disabled={phoneLoading}
                type="tel"
              />
              <button
                onClick={phoneResult ? () => { setPhoneResult(null) } : analyzePhone}
                disabled={!phoneInput.trim() && !phoneResult}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-40"
              >
                {phoneLoading ? <Loader className="h-4 w-4 animate-spin" /> : phoneResult ? <RotateCcw className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                {phoneLoading ? 'Analyzing…' : phoneResult ? 'New Lookup' : 'Analyze'}
              </button>
            </div>

            {phoneError && <div className="mt-2 p-3 rounded-xl bg-red-950/20 border border-red-900/30 text-xs text-red-400 font-mono">! {phoneError}</div>}
          </div>

          {phoneResult && (
            <div className="card-dark p-5 space-y-4">
              {/* validity badge */}
              <div className="flex items-center gap-3">
                {phoneResult.valid
                  ? <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-950/40 border border-red-900/50 px-3 py-1.5 rounded-full"><CheckCircle className="h-3.5 w-3.5" /> Valid number</span>
                  : <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-900/40 border border-gray-800 px-3 py-1.5 rounded-full"><XCircle className="h-3.5 w-3.5" /> {phoneResult.possible ? 'Possibly valid' : 'Invalid number'}</span>
                }
                <code className="text-sm font-mono text-white">{phoneResult.e164}</code>
              </div>

              {/* formatted variants */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  ['E.164 (international)', phoneResult.e164],
                  ['International', phoneResult.international],
                  ['National', phoneResult.national],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-950 rounded-xl border border-gray-800 p-3">
                    <p className="text-[10px] text-gray-600 font-semibold uppercase mb-1">{label}</p>
                    <p className="text-sm text-white font-mono">{value}</p>
                  </div>
                ))}
              </div>

              {/* intel grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  ['Country', phoneResult.country || '—'],
                  ['Region Code', phoneResult.region_code || '—'],
                  ['Carrier / Network', phoneResult.carrier || 'Unknown'],
                  ['Line Type', phoneResult.line_type || 'Unknown'],
                  ['Country Dial Code', phoneResult.country_code ? `+${phoneResult.country_code}` : '—'],
                  ['Timezones', phoneResult.timezones.length ? phoneResult.timezones.join(', ') : '—'],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between bg-gray-950 rounded-xl border border-gray-800 px-4 py-3">
                    <span className="text-xs text-gray-500 font-semibold">{label}</span>
                    <span className="text-sm text-white font-mono text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card-dark p-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-gray-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 leading-relaxed">
              Carrier, country, and line type come free from Google's libphonenumber library.
              Full name/address reverse lookup (Spokeo, TrueCaller, etc.) has no free API — those services require a paid subscription.
              Include the above data in your evidence package for law enforcement.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
