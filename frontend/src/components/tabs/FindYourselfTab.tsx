import { useState } from 'react'
import { ExternalLink, Search, Copy, Check } from 'lucide-react'

const TOOLS = [
  {
    category: 'Breach Databases',
    color: 'red',
    items: [
      { name: 'Have I Been Pwned', desc: 'Check if your email appears in known data breaches.', buildUrl: (q: string) => `https://haveibeenpwned.com/account/${encodeURIComponent(q)}`, field: 'email', official: true },
      { name: 'Firefox Monitor', desc: 'Mozilla\'s breach monitoring service powered by HIBP.', buildUrl: (q: string) => `https://monitor.firefox.com/scan?email=${encodeURIComponent(q)}`, field: 'email', official: true },
      { name: 'DeHashed', desc: 'Search hashed and plaintext credential databases.', buildUrl: (q: string) => `https://dehashed.com/search?query=${encodeURIComponent(q)}`, field: 'any', official: true },
      { name: 'IntelliCheck', desc: 'Check multiple breach databases at once.', buildUrl: (_q: string) => `https://inteltechniques.com/tools/Breach.html`, field: 'any', official: false },
    ],
  },
  {
    category: 'People Search / Data Brokers',
    color: 'orange',
    items: [
      { name: 'Spokeo', desc: 'People search aggregating public records.', buildUrl: (q: string) => `https://www.spokeo.com/search?q=${encodeURIComponent(q)}`, field: 'any', official: true },
      { name: 'WhitePages', desc: 'Phone, address, and person lookup.', buildUrl: (q: string) => `https://www.whitepages.com/name/${encodeURIComponent(q)}`, field: 'any', official: true },
      { name: 'BeenVerified', desc: 'Background check and people search.', buildUrl: (q: string) => `https://www.beenverified.com/people/${encodeURIComponent(q)}`, field: 'any', official: true },
      { name: 'PeopleFinders', desc: 'Find contact info and public records.', buildUrl: (q: string) => `https://www.peoplefinders.com/people/${encodeURIComponent(q)}`, field: 'any', official: true },
      { name: 'Radaris', desc: 'Aggregates public records and social profiles.', buildUrl: (q: string) => `https://radaris.com/ng/search/people?ff=${encodeURIComponent(q.split(' ')[0])}&fl=${encodeURIComponent(q.split(' ')[1] ?? '')}`, field: 'any', official: true },
      { name: 'Intelius', desc: 'People data and background reports.', buildUrl: (q: string) => `https://www.intelius.com/people-search/results/?firstName=${encodeURIComponent(q.split(' ')[0])}&lastName=${encodeURIComponent(q.split(' ')[1] ?? '')}`, field: 'any', official: true },
    ],
  },
  {
    category: 'Username / Social Search',
    color: 'blue',
    items: [
      { name: 'Sherlock (web)', desc: 'Find username across 300+ social networks.', buildUrl: (q: string) => `https://sherlock-project.github.io/?q=${encodeURIComponent(q)}`, field: 'username', official: true },
      { name: 'NameCheckr', desc: 'Check username availability across platforms.', buildUrl: (q: string) => `https://www.namecheckr.com/search?q=${encodeURIComponent(q)}`, field: 'username', official: true },
      { name: 'KnowEm', desc: 'Username search across 500+ social sites.', buildUrl: (q: string) => `https://knowem.com/checkusernames.php?u=${encodeURIComponent(q)}`, field: 'username', official: true },
      { name: 'Google People Search', desc: 'Search Google for your name or username.', buildUrl: (q: string) => `https://www.google.com/search?q="${encodeURIComponent(q)}"`, field: 'any', official: true },
    ],
  },
  {
    category: 'Dark Web Monitoring',
    color: 'purple',
    items: [
      { name: 'BreachDirectory', desc: 'Search leaked password databases.', buildUrl: (q: string) => `https://breachdirectory.org/?query=${encodeURIComponent(q)}`, field: 'any', official: true },
      { name: 'LeakCheck', desc: 'Check for leaked credentials.', buildUrl: (q: string) => `https://leakcheck.io/check?query=${encodeURIComponent(q)}`, field: 'email', official: true },
      { name: 'Snusbase', desc: 'Search database breaches and pastes.', buildUrl: () => `https://snusbase.com/`, field: 'any', official: true },
      { name: 'Intelligence X', desc: 'Dark web, leaks, and Tor search.', buildUrl: (q: string) => `https://intelx.io/?s=${encodeURIComponent(q)}`, field: 'any', official: true },
    ],
  },
]

const COLOR_MAP: Record<string, string> = {
  red: 'text-red-400 bg-red-950/30 border-red-900/40',
  orange: 'text-orange-400 bg-orange-950/30 border-orange-900/40',
  blue: 'text-blue-400 bg-blue-950/30 border-blue-900/40',
  purple: 'text-purple-400 bg-purple-950/30 border-purple-900/40',
}

export function FindYourselfTab() {
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  function openAll(category: string) {
    const cat = TOOLS.find(t => t.category === category)
    if (!cat || !query.trim()) return
    cat.items.forEach(item => window.open(item.buildUrl(query), '_blank', 'noopener'))
  }

  function copyUrl(url: string, key: string) {
    navigator.clipboard.writeText(url)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="space-y-6">
      <div className="card-dark p-5">
        <h2 className="font-bold text-white mb-1">Find Yourself</h2>
        <p className="text-sm text-gray-500 mb-4">Enter your name, email, username, or phone to generate pre-filled lookup links across every major tool.</p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              className="input-field pl-9"
              placeholder="Jane Smith · jane@email.com · @janesmith"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>
        {!query.trim() && <p className="text-xs text-gray-600 mt-2">Enter a value above to activate all lookup links below.</p>}
      </div>

      {TOOLS.map(group => (
        <div key={group.category} className="card-dark p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold text-sm ${COLOR_MAP[group.color]?.split(' ')[0]}`}>{group.category}</h3>
            {query.trim() && (
              <button
                onClick={() => openAll(group.category)}
                className="text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-700 px-2.5 py-1 rounded-lg transition-colors"
              >
                Open All →
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {group.items.map(item => {
              const url = query.trim() ? item.buildUrl(query) : null
              const key = `${group.category}-${item.name}`
              return (
                <div key={item.name} className={`rounded-xl border p-4 ${query.trim() ? 'hover:border-opacity-60 cursor-pointer' : 'opacity-60'} ${COLOR_MAP[group.color]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm font-semibold text-white">{item.name}</span>
                        {item.official && <span className="text-[9px] bg-gray-800 text-gray-400 px-1 py-0.5 rounded">official</span>}
                      </div>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {url && (
                        <>
                          <button
                            onClick={() => copyUrl(url, key)}
                            className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
                            title="Copy URL"
                          >
                            {copied === key ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
                          </button>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
                            title="Open"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
