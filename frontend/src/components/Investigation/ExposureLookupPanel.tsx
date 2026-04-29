import { FormEvent, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Copy, Database, ExternalLink, Fingerprint, Globe2, Search, ShieldAlert, UserSearch } from 'lucide-react'
import { motion } from 'framer-motion'

type LookupKind = 'email' | 'username' | 'name' | 'phone'

const LOOKUP_TARGETS = [
  {
    name: 'Have I Been Pwned',
    type: 'Breach exposure',
    url: 'https://haveibeenpwned.com/',
    note: 'Search an email for known breach exposure. Open the site, then paste the lookup term yourself.',
  },
  {
    name: 'Firefox Monitor',
    type: 'Breach exposure',
    url: 'https://monitor.mozilla.org/',
    note: 'Mozilla breach check for emails and breach education.',
  },
  {
    name: 'DeHashed',
    type: 'Credential intelligence',
    url: 'https://www.dehashed.com/',
    note: 'Credential and paste exposure search. Use only for accounts you own or are authorized to review.',
  },
  {
    name: 'Google exact-match search',
    type: 'Open web',
    url: 'https://www.google.com/',
    note: 'Search quoted names, usernames, emails, old phone numbers, and unique profile text.',
  },
  {
    name: 'FastPeopleSearch',
    type: 'People-search profile',
    url: 'https://www.fastpeoplesearch.com/',
    note: 'Check whether a name, phone, or address has a visible broker listing.',
  },
  {
    name: 'Spokeo',
    type: 'Broker profile',
    url: 'https://www.spokeo.com/',
    note: 'People-search index that often connects name, phone, address, relatives, and usernames.',
  },
  {
    name: 'Whitepages',
    type: 'Directory listing',
    url: 'https://www.whitepages.com/',
    note: 'Phone/address directory and public-record profile search.',
  },
  {
    name: 'PeekYou',
    type: 'Username and profile graph',
    url: 'https://www.peekyou.com/',
    note: 'Useful for usernames, social profiles, and old public account traces.',
  },
] as const

const CHECKLIST = [
  'Search email in HIBP and Firefox Monitor.',
  'Search usernames in Google with exact quotes.',
  'Check people-search brokers for name, city, phone, and address variants.',
  'Open any matching broker result, save the URL, then add it to the removal queue.',
  'If exposure includes threats, doxxing, sextortion, or impersonation, add it to the authority report.',
] as const

async function writeClipboard(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) throw new Error('Copy failed')
}

function inferKind(value: string): LookupKind {
  if (value.includes('@')) return 'email'
  if (/^[+\d\s().-]{7,}$/.test(value)) return 'phone'
  if (value.includes(' ')) return 'name'
  return 'username'
}

function scoreFor(kind: LookupKind, query: string) {
  const base = kind === 'email' ? 62 : kind === 'phone' ? 70 : kind === 'name' ? 58 : 48
  const detailBonus = Math.min(20, Math.max(0, query.length - 8))
  return Math.min(96, base + detailBonus)
}

export function ExposureLookupPanel({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [copied, setCopied] = useState(false)

  const kind = useMemo(() => inferKind(submitted || query), [query, submitted])
  const score = useMemo(() => scoreFor(kind, submitted || query || 'example'), [kind, query, submitted])
  const hasLookup = submitted.trim().length > 0

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(query.trim())
  }

  const copyLookup = async () => {
    if (!query.trim() && !submitted.trim()) return
    await writeClipboard(submitted || query.trim())
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 lg:grid-cols-[390px_1fr]">
      <aside className="glass-panel rounded-xl p-5">
        <div className="flex items-start gap-3 border-b border-white/10 pb-4">
          <div className="rounded-full border border-red-500/40 bg-red-950/25 p-3 text-red-300">
            <UserSearch className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold">Find Yourself</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">Breach, broker, public-record, username, and open-web exposure checklist.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Name, email, phone, or username</span>
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="you@example.com, @handle, full name"
              className="input-field font-mono text-xs"
            />
          </label>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button type="submit" className="red-button-glow inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white">
              <Search className="h-4 w-4" />
              Build lookup map
            </button>
            <button type="button" onClick={copyLookup} className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-black/55 px-4 text-gray-300 transition-colors hover:border-red-500/50 hover:text-white">
              {copied ? <CheckCircle2 className="h-5 w-5 text-green-300" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
        </form>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <LookupMetric label="Signal type" value={kind} />
          <LookupMetric label="Exposure priority" value={`${score}%`} />
        </div>

        <div className="mt-4 rounded-lg border border-yellow-500/25 bg-yellow-950/10 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-300" />
            <p className="text-xs leading-5 text-yellow-100/80">
              This panel does not auto-submit your lookup term to third-party sites. Use copy, open the official site, then decide what to paste.
            </p>
          </div>
        </div>
      </aside>

      <section className="space-y-4">
        <div className="glass-panel rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">Exposure lookup map</h3>
              <p className="mt-1 text-sm text-gray-500">
                {hasLookup ? `Ready to check "${submitted}" across breach, broker, and open-web sources.` : 'Enter a lookup term to stage the workflow.'}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-950/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-200">
              <Fingerprint className="h-4 w-4" />
              local prep
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {LOOKUP_TARGETS.map(target => (
              <a
                key={target.name}
                href={target.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/10 bg-black/45 p-4 transition-colors hover:border-red-500/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{target.name}</div>
                    <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-red-300">{target.type}</div>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-red-400" />
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-500">{target.note}</p>
              </a>
            ))}
          </div>
        </div>

        {!compact && (
          <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
            <div className="glass-panel rounded-xl p-5">
              <h3 className="font-bold">Lookup checklist</h3>
              <div className="mt-4 space-y-3">
                {CHECKLIST.map((item, index) => (
                  <div key={item} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-red-500/35 text-xs font-black text-red-200">{index + 1}</span>
                    <p className="text-sm leading-6 text-gray-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-xl p-5">
              <div className="flex items-center gap-2 text-red-300">
                <ShieldAlert className="h-5 w-5" />
                <h3 className="font-bold text-white">Escalation triggers</h3>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-gray-400">
                <p>Use the report center when exposure includes intimate images, doxxing, threats, impersonation, account compromise, or repeated ignored takedowns.</p>
                <p>Use the broker queue when the result is a people-search or public-record profile.</p>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                <IconTile icon={<Database className="h-4 w-4" />} label="breach" />
                <IconTile icon={<Globe2 className="h-4 w-4" />} label="broker" />
                <IconTile icon={<ShieldAlert className="h-4 w-4" />} label="report" />
              </div>
            </div>
          </div>
        )}
      </section>
    </motion.div>
  )
}

function LookupMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/45 p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{label}</div>
      <div className="mt-2 text-lg font-black capitalize text-white">{value}</div>
    </div>
  )
}

function IconTile({ icon, label }: { icon: JSX.Element; label: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/45 p-3">
      <div className="mx-auto grid h-8 w-8 place-items-center rounded-full border border-red-500/30 text-red-300">{icon}</div>
      <div className="mt-2 font-bold uppercase tracking-[0.12em] text-gray-500">{label}</div>
    </div>
  )
}
