import { useState } from 'react'
import { Search, ExternalLink, AlertTriangle, Globe, MapPin, User, Mail, Hash, ChevronDown, ChevronUp, Loader } from 'lucide-react'

// ── Username platforms ────────────────────────────────────────────────────────
interface UPlatform {
  name: string
  url: (u: string) => string
  category: string
}

const USERNAME_PLATFORMS: UPlatform[] = [
  // Social
  { name: 'Instagram',   url: u => `https://instagram.com/${u}`,              category: 'Social' },
  { name: 'Twitter/X',   url: u => `https://twitter.com/${u}`,                category: 'Social' },
  { name: 'TikTok',      url: u => `https://tiktok.com/@${u}`,                category: 'Social' },
  { name: 'Snapchat',    url: u => `https://snapchat.com/add/${u}`,           category: 'Social' },
  { name: 'Facebook',    url: u => `https://facebook.com/${u}`,               category: 'Social' },
  { name: 'Pinterest',   url: u => `https://pinterest.com/${u}`,              category: 'Social' },
  { name: 'LinkedIn',    url: u => `https://linkedin.com/in/${u}`,            category: 'Social' },
  { name: 'Reddit',      url: u => `https://reddit.com/u/${u}`,               category: 'Social' },
  { name: 'Tumblr',      url: u => `https://tumblr.com/${u}`,                 category: 'Social' },
  { name: 'Mastodon',    url: u => `https://mastodon.social/@${u}`,           category: 'Social' },
  // Gaming
  { name: 'Twitch',      url: u => `https://twitch.tv/${u}`,                  category: 'Gaming' },
  { name: 'Steam',       url: u => `https://steamcommunity.com/id/${u}`,      category: 'Gaming' },
  { name: 'Xbox',        url: u => `https://xboxgamertag.com/search/${u}`,    category: 'Gaming' },
  { name: 'PSN',         url: u => `https://psnprofiles.com/${u}`,            category: 'Gaming' },
  { name: 'Roblox',      url: u => `https://roblox.com/users/profile?username=${u}`, category: 'Gaming' },
  // Dev / Tech
  { name: 'GitHub',      url: u => `https://github.com/${u}`,                 category: 'Dev' },
  { name: 'GitLab',      url: u => `https://gitlab.com/${u}`,                 category: 'Dev' },
  { name: 'Bitbucket',   url: u => `https://bitbucket.org/${u}`,              category: 'Dev' },
  { name: 'Hacker News', url: u => `https://news.ycombinator.com/user?id=${u}`, category: 'Dev' },
  { name: 'Dev.to',      url: u => `https://dev.to/${u}`,                     category: 'Dev' },
  // Content
  { name: 'YouTube',     url: u => `https://youtube.com/@${u}`,               category: 'Content' },
  { name: 'Medium',      url: u => `https://medium.com/@${u}`,                category: 'Content' },
  { name: 'Substack',    url: u => `https://substack.com/@${u}`,              category: 'Content' },
  { name: 'Patreon',     url: u => `https://patreon.com/${u}`,                category: 'Content' },
  { name: 'OnlyFans',    url: u => `https://onlyfans.com/${u}`,               category: 'Content' },
  // Forums
  { name: 'Kik',         url: u => `https://kik.me/${u}`,                     category: 'Messaging' },
  { name: 'Telegram',    url: u => `https://t.me/${u}`,                       category: 'Messaging' },
  { name: 'Keybase',     url: u => `https://keybase.io/${u}`,                 category: 'Messaging' },
  // Other
  { name: 'Gravatar',    url: u => `https://gravatar.com/${u}`,               category: 'Other' },
  { name: 'About.me',    url: u => `https://about.me/${u}`,                   category: 'Other' },
  { name: 'Linktree',    url: u => `https://linktr.ee/${u}`,                  category: 'Other' },
]

const U_CATEGORY_COLORS: Record<string, string> = {
  Social:    'bg-red-950/40 text-red-400 border-red-900/40',
  Gaming:    'bg-red-950/40 text-red-400 border-red-900/40',
  Dev:       'bg-red-950/40 text-red-400 border-red-900/40',
  Content:   'bg-red-950/40 text-red-400 border-red-900/40',
  Messaging: 'bg-red-950/40 text-red-400 border-red-900/40',
  Other:     'bg-gray-800 text-gray-400 border-gray-700',
}

// ── IP Lookup ────────────────────────────────────────────────────────────────
interface IpResult {
  ip: string
  city?: string
  region?: string
  country_name?: string
  org?: string
  timezone?: string
  latitude?: number
  longitude?: number
  error?: boolean
  reason?: string
}

// ── Domain Lookup ────────────────────────────────────────────────────────────
interface DomainResult {
  domain: string
  registrar?: string
  created?: string
  expires?: string
  nameservers?: string[]
  status?: string[]
  error?: string
}

// ── Email Breach links ────────────────────────────────────────────────────────
const BREACH_TOOLS = [
  { name: 'Have I Been Pwned', url: (e: string) => `https://haveibeenpwned.com/account/${encodeURIComponent(e)}`, desc: 'Check if email appeared in data breaches' },
  { name: 'DeHashed', url: () => 'https://dehashed.com/', desc: 'Deep breach search — email, username, IP, name, address' },
  { name: 'Intelx.io', url: (e: string) => `https://intelx.io/?s=${encodeURIComponent(e)}`, desc: 'Search paste sites, dark web, breaches' },
  { name: 'Spycloud', url: () => 'https://spycloud.com/', desc: 'Enterprise breach exposure lookup' },
  { name: 'Email Rep', url: (e: string) => `https://emailrep.io/${encodeURIComponent(e)}`, desc: 'Email reputation, age, and risk scoring' },
]

// ── Phone lookup links ────────────────────────────────────────────────────────
const PHONE_TOOLS = [
  { name: 'Spokeo', url: (p: string) => `https://spokeo.com/search?q=${encodeURIComponent(p)}`, desc: 'Name, address, relatives from phone number' },
  { name: 'TrueCaller', url: () => 'https://truecaller.com/', desc: 'Caller ID and spam detection globally' },
  { name: 'NumLookup', url: (p: string) => `https://www.numlookup.com/?number=${encodeURIComponent(p)}`, desc: 'Free reverse phone lookup' },
  { name: 'WhoCalledMe', url: (p: string) => `https://whocalledme.com/PhoneNumber/${p.replace(/\D/g, '')}`, desc: 'Spam reports and caller identification' },
  { name: 'BeenVerified', url: () => 'https://beenverified.com/', desc: 'Comprehensive public records search' },
]

type Tool = 'username' | 'ip' | 'domain' | 'email' | 'phone'

const TOOLS: { id: Tool; label: string; icon: typeof Search }[] = [
  { id: 'username', label: 'Username Search',  icon: User   },
  { id: 'ip',       label: 'IP Geolocation',   icon: MapPin  },
  { id: 'domain',   label: 'Domain Lookup',    icon: Globe   },
  { id: 'email',    label: 'Email Breach',     icon: Mail    },
  { id: 'phone',    label: 'Phone Lookup',     icon: Hash    },
]

export function OsintTab() {
  const [activeTool, setActiveTool] = useState<Tool>('username')

  // Username search
  const [username, setUsername] = useState('')
  const [uLaunched, setULaunched] = useState<Set<string>>(new Set())
  const [uCategory, setUCategory] = useState('All')

  // IP lookup
  const [ipInput, setIpInput] = useState('')
  const [ipResult, setIpResult] = useState<IpResult | null>(null)
  const [ipLoading, setIpLoading] = useState(false)
  const [ipError, setIpError] = useState('')

  // Domain lookup
  const [domainInput, setDomainInput] = useState('')
  const [domainResult, setDomainResult] = useState<DomainResult | null>(null)
  const [domainLoading, setDomainLoading] = useState(false)
  const [domainExpanded, setDomainExpanded] = useState(false)

  // Email
  const [emailInput, setEmailInput] = useState('')

  // Phone
  const [phoneInput, setPhoneInput] = useState('')

  async function lookupIp() {
    const q = ipInput.trim()
    if (!q) return
    setIpLoading(true)
    setIpResult(null)
    setIpError('')
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

  async function lookupDomain() {
    const q = domainInput.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '')
    if (!q) return
    setDomainLoading(true)
    setDomainResult(null)
    try {
      const r = await fetch(`https://rdap.org/domain/${encodeURIComponent(q)}`)
      const d = await r.json()
      const ns = d.nameservers?.map((n: { ldhName: string }) => n.ldhName).filter(Boolean) ?? []
      const events = d.events ?? []
      const getDate = (type: string) => events.find((e: { eventAction: string; eventDate: string }) => e.eventAction === type)?.eventDate?.slice(0, 10)
      const registrar = d.entities?.find((e: { roles: string[] }) => e.roles?.includes('registrar'))?.vcardArray?.[1]?.find(
        (v: string[]) => v[0] === 'fn'
      )?.[3]
      setDomainResult({
        domain: q,
        registrar: registrar ?? 'Unknown',
        created: getDate('registration'),
        expires: getDate('expiration'),
        nameservers: ns,
        status: d.status ?? [],
      })
    } catch {
      setDomainResult({ domain: domainInput.trim(), error: 'Lookup failed — domain may not exist or RDAP is unavailable' })
    } finally {
      setDomainLoading(false)
    }
  }

  function launchAllUsernames() {
    const u = username.trim()
    if (!u) return
    const toOpen = filteredPlatforms
    toOpen.forEach((p, i) => {
      setTimeout(() => {
        window.open(p.url(u), '_blank')
        setULaunched(prev => new Set([...prev, p.name]))
      }, i * 300)
    })
  }

  const uCategories = ['All', ...Array.from(new Set(USERNAME_PLATFORMS.map(p => p.category)))]
  const filteredPlatforms = uCategory === 'All' ? USERNAME_PLATFORMS : USERNAME_PLATFORMS.filter(p => p.category === uCategory)

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
          <button
            key={t.id}
            onClick={() => setActiveTool(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              activeTool === t.id
                ? 'bg-red-950/60 text-red-400 border-red-900/50'
                : 'border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── USERNAME SEARCH ──────────────────────────────────────────── */}
      {activeTool === 'username' && (
        <div className="space-y-4">
          <div className="card-dark p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
                <User className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-white">Username Search</h2>
                <p className="text-xs text-gray-500">Check {USERNAME_PLATFORMS.length} platforms for a username simultaneously</p>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                className="input-field flex-1"
                placeholder="Enter username to search (no @ needed)"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && launchAllUsernames()}
              />
              <button
                onClick={launchAllUsernames}
                disabled={!username.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-40"
              >
                <ExternalLink className="h-4 w-4" /> Open All
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {uCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setUCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    uCategory === cat
                      ? 'bg-red-950/60 text-red-400 border-red-900/50'
                      : 'border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredPlatforms.map(platform => {
              const isLaunched = uLaunched.has(platform.name)
              const href = username.trim() ? platform.url(username.trim()) : '#'
              const catClass = U_CATEGORY_COLORS[platform.category] ?? 'bg-gray-800 text-gray-400 border-gray-700'

              return (
                <a
                  key={platform.name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => username.trim() && setULaunched(prev => new Set([...prev, platform.name]))}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors group ${
                    isLaunched ? 'opacity-60 border-red-900/40 bg-red-950/10' : 'border-gray-800 bg-gray-900/30 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${catClass}`}>{platform.category}</span>
                    <span className="text-sm font-medium text-white">{platform.name}</span>
                    {isLaunched && <span className="text-[10px] text-red-400">✓</span>}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-600 group-hover:text-gray-400 flex-shrink-0" />
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* ── IP GEOLOCATION ───────────────────────────────────────────── */}
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
              <input
                className="input-field flex-1"
                placeholder="Enter IP address (e.g. 8.8.8.8)"
                value={ipInput}
                onChange={e => setIpInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lookupIp()}
              />
              <button onClick={lookupIp} disabled={!ipInput.trim() || ipLoading} className="btn-red">
                {ipLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Lookup
              </button>
            </div>

            {ipError && (
              <div className="mt-3 p-3 rounded-xl bg-red-950/20 border border-red-900/30">
                <p className="text-xs text-red-400">{ipError}</p>
              </div>
            )}

            {ipResult && !ipResult.error && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['IP Address', ipResult.ip],
                  ['City', ipResult.city ?? '—'],
                  ['Region / State', ipResult.region ?? '—'],
                  ['Country', ipResult.country_name ?? '—'],
                  ['ISP / Org', ipResult.org ?? '—'],
                  ['Timezone', ipResult.timezone ?? '—'],
                  ['Coordinates', ipResult.latitude && ipResult.longitude ? `${ipResult.latitude}, ${ipResult.longitude}` : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-950 rounded-xl border border-gray-800 p-3">
                    <p className="text-[10px] text-gray-600 font-semibold uppercase mb-1">{label}</p>
                    <p className="text-sm text-white font-mono break-all">{value}</p>
                  </div>
                ))}
                {ipResult.latitude && ipResult.longitude && (
                  <a
                    href={`https://maps.google.com/?q=${ipResult.latitude},${ipResult.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sm:col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-700 text-sm font-semibold text-white hover:border-gray-600 hover:bg-gray-900 transition-colors"
                  >
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

      {/* ── DOMAIN LOOKUP ────────────────────────────────────────────── */}
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
              <input
                className="input-field flex-1"
                placeholder="Enter domain (e.g. example.com)"
                value={domainInput}
                onChange={e => setDomainInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lookupDomain()}
              />
              <button onClick={lookupDomain} disabled={!domainInput.trim() || domainLoading} className="btn-red">
                {domainLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Lookup
              </button>
            </div>

            {domainResult && (
              <div className="space-y-2">
                {domainResult.error ? (
                  <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/30">
                    <p className="text-xs text-red-400">{domainResult.error}</p>
                  </div>
                ) : (
                  <>
                    {[
                      ['Domain', domainResult.domain],
                      ['Registrar', domainResult.registrar ?? '—'],
                      ['Registered', domainResult.created ?? '—'],
                      ['Expires', domainResult.expires ?? '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between bg-gray-950 rounded-xl border border-gray-800 px-4 py-3">
                        <span className="text-xs text-gray-500 font-semibold">{label}</span>
                        <span className="text-sm text-white font-mono">{value}</span>
                      </div>
                    ))}

                    {(domainResult.nameservers?.length ?? 0) > 0 && (
                      <div>
                        <button
                          onClick={() => setDomainExpanded(!domainExpanded)}
                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                        >
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

            <div className="mt-4 pt-4 border-t border-gray-900">
              <p className="text-xs text-gray-600 mb-3">Additional lookup tools:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Who.is',       url: (d: string) => `https://who.is/whois/${d}` },
                  { label: 'DNSDumpster', url: () => 'https://dnsdumpster.com/' },
                  { label: 'Shodan',       url: (d: string) => `https://www.shodan.io/search?query=${d}` },
                  { label: 'VirusTotal',   url: (d: string) => `https://www.virustotal.com/gui/domain/${d}` },
                  { label: 'URLScan.io',   url: (d: string) => `https://urlscan.io/search/#domain%3A${d}` },
                ].map(tool => (
                  <a
                    key={tool.label}
                    href={domainInput.trim() ? tool.url(domainInput.trim().replace(/^https?:\/\//, '').replace(/\/.*/, '')) : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-800 text-xs text-gray-500 hover:border-gray-700 hover:text-gray-300 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" /> {tool.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EMAIL BREACH ─────────────────────────────────────────────── */}
      {activeTool === 'email' && (
        <div className="space-y-4">
          <div className="card-dark p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
                <Mail className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-white">Email Breach Lookup</h2>
                <p className="text-xs text-gray-500">Check if an email address appeared in known data breaches</p>
              </div>
            </div>

            <input
              className="input-field mb-4"
              placeholder="Enter email address to search"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              type="email"
            />

            <div className="space-y-2">
              {BREACH_TOOLS.map(tool => (
                <a
                  key={tool.name}
                  href={emailInput.trim() ? tool.url(emailInput.trim()) : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors group ${
                    emailInput.trim() ? 'border-gray-800 bg-gray-900/30 hover:border-gray-700 cursor-pointer' : 'border-gray-900 bg-gray-900/10 opacity-50 cursor-not-allowed pointer-events-none'
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">{tool.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{tool.desc}</div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-600 group-hover:text-gray-400 flex-shrink-0" />
                </a>
              ))}
            </div>

            <p className="text-[10px] text-gray-700 mt-4">
              Type an email above to open pre-filled breach lookup URLs. HIBP requires you to verify you own the email you're checking.
            </p>
          </div>
        </div>
      )}

      {/* ── PHONE LOOKUP ─────────────────────────────────────────────── */}
      {activeTool === 'phone' && (
        <div className="space-y-4">
          <div className="card-dark p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center">
                <Hash className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-white">Phone Number Lookup</h2>
                <p className="text-xs text-gray-500">Reverse lookup via public records and caller-ID databases</p>
              </div>
            </div>

            <input
              className="input-field mb-4"
              placeholder="Enter phone number (e.g. +1 555 123 4567)"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)}
              type="tel"
            />

            <div className="space-y-2">
              {PHONE_TOOLS.map(tool => (
                <a
                  key={tool.name}
                  href={phoneInput.trim() ? tool.url(phoneInput.trim()) : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors group ${
                    phoneInput.trim() ? 'border-gray-800 bg-gray-900/30 hover:border-gray-700 cursor-pointer' : 'border-gray-900 bg-gray-900/10 opacity-50 cursor-not-allowed pointer-events-none'
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">{tool.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{tool.desc}</div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-600 group-hover:text-gray-400 flex-shrink-0" />
                </a>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-xl bg-gray-900/50 border border-gray-800">
              <p className="text-xs text-gray-500 leading-relaxed">
                Most free services show carrier and general area only. Full reverse lookup (name + address) typically requires a paid service like Spokeo or BeenVerified. Include your state's public records in your evidence package.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
