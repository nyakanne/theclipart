import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  Bell,
  Check,
  ClipboardCheck,
  Copy,
  Database,
  ExternalLink,
  Gavel,
  Hash,
  LifeBuoy,
  Link2,
  Lock,
  Map,
  Mail,
  Network,
  PhoneCall,
  Play,
  RefreshCw,
  Scale,
  ScanLine,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Target,
  Upload,
  UserSearch,
} from 'lucide-react'
import { clsx } from 'clsx'
import { ExposureLookupPanel } from '@/components/Investigation/ExposureLookupPanel'
import { ReverseImageSearchPanel } from '@/components/Investigation/ReverseImageSearchPanel'
import { ExposureGraph } from '@/components/visuals/ExposureGraph'
import { useCreateScan } from '@/hooks/useScan'

const DATA_BROKERS = [
  { name: 'FastPeopleSearch', url: 'https://www.fastpeoplesearch.com/removal', priority: 'CRITICAL', note: 'High-visibility people-search index' },
  { name: 'Spokeo', url: 'https://www.spokeo.com/optout', priority: 'CRITICAL', note: 'Major aggregator' },
  { name: 'WhitePages', url: 'https://www.whitepages.com/suppression-requests', priority: 'CRITICAL', note: 'Often feeds secondary listings' },
  { name: 'BeenVerified', url: 'https://www.beenverified.com/opt-out', priority: 'HIGH', note: 'People-search and background reports' },
  { name: 'Intelius', url: 'https://www.intelius.com/opt-out', priority: 'HIGH', note: 'Background-report network' },
  { name: 'Radaris', url: 'https://radaris.com/opt-out', priority: 'HIGH', note: 'Profile aggregation' },
  { name: 'MyLife', url: 'https://www.mylife.com/ccpa/index.php', priority: 'HIGH', note: 'Reputation/profile pages' },
  { name: 'PeopleFinder', url: 'https://www.peoplefinder.com/opt-out.php', priority: 'HIGH', note: 'People-search index' },
  { name: 'PeopleSmart', url: 'https://www.peoplesmart.com/optout-go', priority: 'HIGH', note: 'People-search index' },
  { name: 'TruthFinder', url: 'https://www.truthfinder.com/opt-out', priority: 'HIGH', note: 'Background reports' },
  { name: 'Instant Checkmate', url: 'https://www.instantcheckmate.com/opt-out', priority: 'HIGH', note: 'Background reports' },
  { name: 'ZabaSearch', url: 'https://www.zabasearch.com/block_records', priority: 'MEDIUM', note: 'Public-record search' },
  { name: 'FamilyTreeNow', url: 'https://www.familytreenow.com/optout', priority: 'MEDIUM', note: 'Family and address graph' },
  { name: 'PeekYou', url: 'https://www.peekyou.com/about/contact/optout', priority: 'MEDIUM', note: 'Username and profile index' },
  { name: 'Pipl', url: 'https://pipl.com/personal-information-removal-request', priority: 'MEDIUM', note: 'Personal-information removal request' },
  { name: '411.com', url: 'https://www.411.com/privacy', priority: 'MEDIUM', note: 'Contact directory' },
  { name: 'USSearch', url: 'https://www.ussearch.com/opt-out', priority: 'MEDIUM', note: 'Public-record search' },
  { name: 'PublicRecordsNow', url: 'https://www.publicrecordsnow.com/static/view/optout', priority: 'MEDIUM', note: 'Public-record search' },
  { name: 'Addresses.com', url: 'https://www.addresses.com/optout.php', priority: 'MEDIUM', note: 'Address directory' },
  { name: 'Nuwber', url: 'https://nuwber.com/removal/link', priority: 'MEDIUM', note: 'People-search profile pages' },
] as const

const PLATFORM_REPORTS = [
  { name: 'Instagram', url: 'https://help.instagram.com/contact/504521742987441', note: 'Impersonation, harassment, privacy, intimate image abuse' },
  { name: 'Facebook', url: 'https://www.facebook.com/help/contact/144059062408922', note: 'Privacy violations and non-consensual intimate image reporting' },
  { name: 'TikTok', url: 'https://support.tiktok.com/en/safety-hc/report-a-problem', note: 'Doxxing, harassment, threats, impersonation, image abuse' },
  { name: 'Discord', url: 'https://discord.com/safety', note: 'User IDs, message links, server abuse, threats, doxxing' },
  { name: 'Google Abuse', url: 'https://support.google.com/mail/contact/abuse', note: 'Gmail abuse, threats, impersonation, harassment' },
  { name: 'FBI IC3', url: 'https://www.ic3.gov', note: 'Cyberstalking, sextortion, extortion, identity theft, account compromise' },
  { name: 'State Attorney General', url: 'https://www.naag.org/find-my-ag/', note: 'State privacy, consumer-protection, and data-broker complaints' },
] as const

const LEGAL_SIGNALS = [
  { law: 'CCPA / CPRA', article: 'Cal. Civ. Code 1798.105', risk: 'Deletion rights for personal information held by businesses and data brokers.' },
  { law: 'California Delete Act', article: 'SB 362', risk: 'Centralized data-broker deletion workflow and broker registration duties.' },
  { law: 'FTC Act', article: 'Section 5', risk: 'Unfair or deceptive practices when a platform ignores abuse, privacy, or impersonation reports.' },
  { law: '18 U.S.C. 2261A', article: 'Cyberstalking', risk: 'Pattern of online conduct causing substantial emotional distress or reasonable fear.' },
  { law: 'NCII / NDII state laws', article: 'State-specific', risk: 'Non-consensual distribution or threat of distribution of intimate images.' },
  { law: 'Platform Terms', article: 'Safety policy', risk: 'Doxxing, harassment, impersonation, or sexual exploitation policy violations.' },
] as const

const SUPPORT_RESOURCES = [
  { name: 'CCRI Image Abuse Helpline', url: 'tel:18448782274', detail: '1-844-878-2274, free 24/7 support in the US' },
  { name: 'Cyber Civil Rights Safety Center', url: 'https://cybercivilrights.org/ccri-crisis-helpline/', detail: 'Image-based sexual abuse support, referrals, and safety planning' },
  { name: 'StopNCII.org', url: 'https://stopncii.org/how-it-works/', detail: 'Adult intimate image hash case creation on participating platforms' },
  { name: 'NCMEC Take It Down', url: 'https://takeitdown.ncmec.org/', detail: 'Under-18 intimate image hash protection with NCMEC' },
] as const

const TRACK_RESOURCES = [
  { name: 'Google Alerts', url: 'https://alerts.google.com', type: 'Monitoring', note: 'Monitor your name, known abusive handles, public URLs, and exact phrases from threats.' },
  { name: 'WhatsMyName', url: 'https://whatsmyname.app', type: 'Username check', note: 'Check known public usernames across platforms. Do not use this for harassment or doxxing.' },
  { name: 'Epieos', url: 'https://epieos.com', type: 'Authorized lookup', note: 'Use only for accounts you own, manage, or have explicit permission to investigate.' },
  { name: 'TinEye', url: 'https://tineye.com', type: 'Image evidence', note: 'Reverse-search profile or incident images you are allowed to use as evidence.' },
  { name: 'Google Lens', url: 'https://lens.google.com', type: 'Image evidence', note: 'Find reposts or visual matches for report documentation.' },
  { name: 'IC3', url: 'https://www.ic3.gov/', type: 'Authority report', note: 'Use for cyberstalking, sextortion, extortion, identity theft, or account compromise.' },
] as const

const DEFAULT_REMOVAL_PROFILE = {
  fullName: '',
  email: '',
  phone: '',
  cityState: '',
  addressHistory: '',
  profileUrls: '',
  extraNotes: '',
}
type RemovalProfile = typeof DEFAULT_REMOVAL_PROFILE

const DEFAULT_INCIDENT = {
  incidentType: 'Doxxing / stalking / non-consensual intimate image threat',
  platforms: '',
  accounts: '',
  urls: '',
  timeline: '',
  evidence: '',
  impact: '',
}
type IncidentDraft = typeof DEFAULT_INCIDENT

const DEFAULT_ACTOR_TRACKER = {
  actorLabel: '',
  knownAccounts: '',
  knownEmails: '',
  knownPhones: '',
  incidentUrls: '',
  timeline: '',
  evidenceNotes: '',
  reportNumbers: '',
}
type ActorTrackerDraft = typeof DEFAULT_ACTOR_TRACKER

type HomeSection = 'overview' | 'lookup' | 'track' | 'removal' | 'shield' | 'reports' | 'support'

const PRIORITY_STYLES = {
  CRITICAL: 'border-red-500/40 bg-red-950/30 text-red-200',
  HIGH: 'border-red-400/30 bg-red-950/20 text-red-100',
  MEDIUM: 'border-white/15 bg-white/[0.04] text-gray-200',
}

async function copyText(text: string) {
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

function buildRemovalRequest(brokerName: string, profile: RemovalProfile) {
  const field = (value: string, placeholder: string) => value.trim() || `[${placeholder}]`
  return [
    `Privacy removal request for ${brokerName}`,
    '',
    `Hello ${brokerName} privacy team,`,
    '',
    'Please remove, suppress, and opt out any public listing connected to my personal information from your website and downstream search results where applicable.',
    '',
    'Identity / listing details:',
    `Full name: ${field(profile.fullName, 'full legal name')}`,
    `Email for confirmation: ${field(profile.email, 'email address')}`,
    `Phone number: ${field(profile.phone, 'phone number')}`,
    `City / state: ${field(profile.cityState, 'city, state')}`,
    `Current or prior addresses: ${field(profile.addressHistory, 'current and previous addresses')}`,
    `Profile URLs or search-result links: ${field(profile.profileUrls, 'paste broker listing URLs here')}`,
    '',
    `Additional context: ${field(profile.extraNotes, 'optional notes')}`,
    '',
    'Please confirm when removal has been completed and let me know if additional verification is required.',
  ].join('\n')
}

function buildIncidentPacket(incident: IncidentDraft) {
  const fallback = (value: string, label: string) => value.trim() || `[${label}]`
  return [
    'DATA GUARD INCIDENT PACKET',
    '',
    `Incident type: ${fallback(incident.incidentType, 'incident type')}`,
    `Platforms involved: ${fallback(incident.platforms, 'platforms')}`,
    `Accounts / identifiers: ${fallback(incident.accounts, 'usernames, profile URLs, email addresses, phone numbers')}`,
    `Content URLs: ${fallback(incident.urls, 'post, message, image, or profile URLs')}`,
    '',
    'Timeline:',
    fallback(incident.timeline, 'dates, times, and sequence of events'),
    '',
    'Evidence preserved:',
    fallback(incident.evidence, 'screenshots, message IDs, email headers, filenames, hashes, confirmation numbers'),
    '',
    'Impact and safety concern:',
    fallback(incident.impact, 'impact, threats, fear, financial risk, reputational harm, or safety concern'),
    '',
    'Requested action:',
    'Please preserve records, review for privacy/safety policy violations, remove non-consensual or doxxing content, suspend abusive accounts where appropriate, and provide a written confirmation or report number.',
    '',
    'Potential legal / policy signals to review:',
    ...LEGAL_SIGNALS.map(item => `- ${item.law} (${item.article}): ${item.risk}`),
  ].join('\n')
}

function buildActorPacket(tracker: ActorTrackerDraft) {
  const fallback = (value: string, label: string) => value.trim() || `[${label}]`
  return [
    'DATA GUARD ACTOR EVIDENCE TRACKER',
    '',
    `Actor / case label: ${fallback(tracker.actorLabel, 'known name, alias, or case label')}`,
    `Known accounts: ${fallback(tracker.knownAccounts, 'public profile URLs, usernames, user IDs')}`,
    `Known emails: ${fallback(tracker.knownEmails, 'known emails only, if already available')}`,
    `Known phones: ${fallback(tracker.knownPhones, 'known phone numbers only, if already available')}`,
    `Incident URLs: ${fallback(tracker.incidentUrls, 'posts, messages, profiles, image URLs, broker listings')}`,
    '',
    'Timeline:',
    fallback(tracker.timeline, 'dates, times, platform actions, report submissions'),
    '',
    'Evidence notes:',
    fallback(tracker.evidenceNotes, 'screenshots, hashes, filenames, witnesses, context'),
    '',
    'Report / ticket numbers:',
    fallback(tracker.reportNumbers, 'platform, IC3, police, school, employer, attorney, or advocate reference numbers'),
    '',
    'Safety boundary:',
    'Use this tracker to preserve evidence and organize reports. Do not attempt physical tracking, credential access, harassment, or doxxing.',
  ].join('\n')
}

export function Home({ initialTab = 'scan' }: { initialTab?: 'scan' | 'optout' | 'find' | 'image' | 'authority' | 'monitor' }) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const { mutateAsync, isPending } = useCreateScan()
  const initialSection: HomeSection =
    initialTab === 'authority' ? 'reports'
      : initialTab === 'optout' ? 'removal'
        : initialTab === 'find' ? 'lookup'
          : initialTab === 'image' ? 'shield'
            : initialTab === 'monitor' ? 'track'
            : 'overview'
  const [section, setSection] = useState<HomeSection>(initialSection)
  const [query, setQuery] = useState('')
  const [queryError, setQueryError] = useState('')
  const [introKey, setIntroKey] = useState(0)
  const [introSettled, setIntroSettled] = useState(false)
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    const saved = window.localStorage.getItem('vindica-command-progress')
    return saved ? JSON.parse(saved) as Record<string, boolean> : {}
  })
  const [removalProfile, setRemovalProfile] = useState<RemovalProfile>(DEFAULT_REMOVAL_PROFILE)
  const [incident, setIncident] = useState<IncidentDraft>(DEFAULT_INCIDENT)
  const [actorTracker, setActorTracker] = useState<ActorTrackerDraft>(DEFAULT_ACTOR_TRACKER)
  const [copied, setCopied] = useState<string | null>(null)
  const [hashReceipt, setHashReceipt] = useState<null | {
    fileName: string
    fileSize: string
    sha256: string
    createdAt: string
    caseId: string
  }>(null)

  const brokerDone = DATA_BROKERS.filter((_, index) => completed[`broker-${index}`]).length
  const completion = Math.round((brokerDone / DATA_BROKERS.length) * 100)

  const reportPacket = useMemo(() => buildIncidentPacket(incident), [incident])
  const actorPacket = useMemo(() => buildActorPacket(actorTracker), [actorTracker])

  useEffect(() => {
    setIntroSettled(false)
    const timer = window.setTimeout(() => setIntroSettled(true), reduceMotion ? 1600 : 2800)
    return () => window.clearTimeout(timer)
  }, [introKey, reduceMotion])

  useEffect(() => {
    if (initialTab === 'scan') return
    const timer = window.setTimeout(() => {
      document.getElementById('command-center')?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    }, reduceMotion ? 100 : 450)
    return () => window.clearTimeout(timer)
  }, [initialTab, reduceMotion])

  const runScan = async (event: FormEvent) => {
    event.preventDefault()
    const value = query.trim()
    if (!value) {
      setQueryError('Enter a name, email, phone, or username to scan.')
      return
    }
    setQueryError('')

    const body = value.includes('@')
      ? { email: value }
      : /^[+\d\s().-]{7,}$/.test(value)
        ? { phone: value }
        : value.includes(' ')
          ? { full_name: value }
          : { username: value }

    const job = await mutateAsync(body)
    navigate(`/scan/${job.scan_id}`)
  }

  const toggle = (id: string) => {
    setCompleted(prev => {
      const next = { ...prev, [id]: !prev[id] }
      window.localStorage.setItem('vindica-command-progress', JSON.stringify(next))
      return next
    })
  }

  const markCopied = (id: string) => {
    setCopied(id)
    window.setTimeout(() => setCopied(null), 1600)
  }

  const copyRemovalRequest = async (brokerName: string) => {
    await copyText(buildRemovalRequest(brokerName, removalProfile))
    markCopied(brokerName)
  }

  const copyAllRemovals = async () => {
    const text = DATA_BROKERS.map(broker => buildRemovalRequest(broker.name, removalProfile)).join('\n\n------------------------------\n\n')
    await copyText(text)
    markCopied('all-removals')
  }

  const copyReport = async () => {
    await copyText(reportPacket)
    markCopied('incident-report')
  }

  const copyActorPacket = async () => {
    await copyText(actorPacket)
    markCopied('actor-packet')
  }

  const hashFile = async (file: File) => {
    const buffer = await file.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', buffer)
    const sha256 = Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')
    setHashReceipt({
      fileName: file.name,
      fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      sha256,
      createdAt: new Date().toLocaleString(),
      caseId: `DG-SHIELD-${sha256.slice(0, 8).toUpperCase()}`,
    })
  }

  const copyHashReceipt = async () => {
    if (!hashReceipt) return
    await copyText([
      'DATA GUARD SHIELD HASH RECEIPT',
      `Case ID: ${hashReceipt.caseId}`,
      `File: ${hashReceipt.fileName}`,
      `Size: ${hashReceipt.fileSize}`,
      `SHA-256: ${hashReceipt.sha256}`,
      `Created: ${hashReceipt.createdAt}`,
      'Raw file status: not uploaded by this browser tool.',
    ].join('\n'))
    markCopied('hash-receipt')
  }

  const sections = [
    { id: 'overview' as const, label: 'Dashboard', icon: Shield },
    { id: 'lookup' as const, label: 'Find Yourself', icon: Search },
    { id: 'track' as const, label: 'Track Him', icon: Target },
    { id: 'removal' as const, label: 'Removals', icon: ClipboardCheck },
    { id: 'shield' as const, label: 'Image Search', icon: Hash },
    { id: 'reports' as const, label: 'Reports', icon: Gavel },
    { id: 'support' as const, label: 'Advocates', icon: LifeBuoy },
  ]

  return (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <section
        id="scan"
        className={clsx(
          'hero-stage relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:px-8',
          introSettled ? 'is-settled' : 'is-intro'
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_22%,rgba(239,68,68,0.14),transparent_24rem)]" />
        <SignalBrainBurst key={introKey} active={!introSettled} />

        <motion.div
          key={`copy-${introKey}`}
          initial={reduceMotion ? false : { opacity: 0.2, x: -34, filter: 'blur(12px)' }}
          animate={introSettled ? { opacity: 1, x: 0, filter: 'blur(0px)' } : { opacity: 0.34, x: -16, filter: 'blur(6px)' }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-20 max-w-2xl"
        >
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold uppercase tracking-[0.32em] text-red-500">Privacy. Restored.</p>
            <button
              type="button"
              onClick={() => setIntroKey(key => key + 1)}
              className="inline-flex items-center gap-2 rounded-full border border-red-500/35 bg-red-950/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-red-200 transition-colors hover:border-red-400 hover:bg-red-900/35"
            >
              <Play className="h-3 w-3" />
              Replay signal
            </button>
          </div>
          <motion.h1
            className="hero-title mt-5 text-6xl font-black tracking-tight text-white sm:text-7xl lg:text-8xl"
            initial={reduceMotion ? false : { y: 44, scale: 0.92, opacity: 0 }}
            animate={introSettled ? { y: 0, scale: 1, opacity: 1 } : { y: 18, scale: 0.96, opacity: 0.24 }}
            transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
          >
            Take Back <span className="block text-red-500">Your Data.</span>
          </motion.h1>
          <p className="mt-6 max-w-xl text-xl leading-8 text-gray-300">
            Find, monitor, and remove personal data from data broker networks, social platforms, public records, and the open web.
          </p>

          <form onSubmit={runScan} className="mt-8 max-w-xl">
            <div className="flex overflow-hidden rounded-xl border border-red-500/55 bg-black/70 shadow-[0_0_40px_rgba(239,68,68,0.18)]">
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Enter your name, email, or phone"
                className="min-w-0 flex-1 bg-transparent px-5 py-4 text-base text-white outline-none placeholder:text-gray-600"
              />
              <button
                type="submit"
                disabled={isPending}
                aria-label="Scan My Exposure"
                className="red-button-glow inline-flex items-center gap-2 bg-red-600 px-5 font-bold text-white transition-colors hover:bg-red-500 disabled:opacity-70"
              >
                {isPending ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                <span>Scan My Exposure</span>
              </button>
            </div>
            {queryError && <p className="mt-2 text-sm text-red-300">{queryError}</p>}
          </form>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <HeroProof icon={<ShieldCheck />} label="256+ data brokers monitored" />
            <HeroProof icon={<Lock />} label="Local private hashing" />
            <HeroProof icon={<Bell />} label="Ongoing removal and monitoring" />
          </div>

          <div className="glass-panel mt-9 grid max-w-xl grid-cols-3 divide-x divide-white/10 rounded-lg">
            <Stat value="20" label="Broker opt-outs" />
            <Stat value="6" label="Legal signals" />
            <Stat value="24/7" label="Support links" />
          </div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.9, x: 36 }}
          animate={introSettled ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0.32, scale: 0.94, x: 18 }}
          transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          <ExposureGraph totalSources={273} className="min-h-[610px]" />
        </motion.div>
      </section>

      <section id="product" className="border-y border-white/10 bg-[#050506]/92">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-5 lg:px-8">
          {[
            ['Automated Removals', RefreshCw],
            ['Find Yourself', Search],
            ['Reverse Image Search', Hash],
            ['Dark Web Scanning', ScanLine],
            ['Data Broker Database', Database],
          ].map(([label, Icon]) => (
            <div key={label as string} className="flex items-center gap-3 border-white/10 px-3 py-3 lg:border-r lg:last:border-r-0">
              <Icon className="h-6 w-6 text-red-500" />
              <span className="font-semibold text-gray-200">{label as string}</span>
            </div>
          ))}
        </div>
      </section>

      <FullDataMap />

      <section id="command-center" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={clsx(
                'flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-bold transition-colors',
                section === id
                  ? 'border-red-500 bg-red-600 text-white red-button-glow'
                  : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-red-500/50 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {section === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 lg:grid-cols-[1fr_380px]">
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold">Exposure Dashboard</h2>
                  <p className="mt-2 text-gray-400">The scan resolves into a second-brain privacy map with linked sources, scores, and legal pathways.</p>
                </div>
                <div className="rounded-full border border-red-500/40 p-4 text-red-400">
                  <ShieldAlert className="h-8 w-8" />
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <DashboardMetric label="Privacy score" value="27/100" sub="High risk" />
                <DashboardMetric label="Sources found" value="273" sub="Across 6 categories" />
                <DashboardMetric label="Compliance score" value="58%" sub="Action required" />
              </div>
              <div className="mt-6 rounded-xl border border-red-500/25 bg-red-950/15 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-1 h-5 w-5 text-red-300" />
                  <div>
                    <h3 className="font-semibold">Your data is widely exposed</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Broker listings, people-search profiles, public records, breach data, and social-profile traces are converted into removal tasks and report evidence.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <SidePanel title="Removal Requests" value={`${brokerDone}/${DATA_BROKERS.length}`} body="Submitted through the one-stop broker queue." />
              <SidePanel title="Broker Coverage" value="97%" body="Coverage across people-search, address, background, and public-record sources." />
              <SidePanel title="Report Pack" value="Ready" body="IC3 summary, state privacy complaint, platform takedown demand, and family notice drafts." />
            </div>
          </motion.div>
        )}

        {section === 'lookup' && <ExposureLookupPanel />}

        {section === 'track' && (
          <ActorTracker
            tracker={actorTracker}
            setTracker={setActorTracker}
            actorPacket={actorPacket}
            copyActorPacket={copyActorPacket}
            copied={copied}
          />
        )}

        {section === 'removal' && (
          <RemovalHub
            profile={removalProfile}
            setProfile={setRemovalProfile}
            completed={completed}
            completion={completion}
            brokerDone={brokerDone}
            copied={copied}
            copyAllRemovals={copyAllRemovals}
            copyRemovalRequest={copyRemovalRequest}
            toggle={toggle}
          />
        )}

        {section === 'shield' && (
          <div className="space-y-5">
            <ReverseImageSearchPanel />
            <ShieldVault hashReceipt={hashReceipt} hashFile={hashFile} copyHashReceipt={copyHashReceipt} copied={copied} />
          </div>
        )}

        {section === 'reports' && (
          <ReportCenter incident={incident} setIncident={setIncident} reportPacket={reportPacket} copyReport={copyReport} copied={copied} />
        )}

        {section === 'support' && <SupportCenter />}
      </section>
    </div>
  )
}

function HeroProof({ icon, label }: { icon: JSX.Element; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-300">
      <span className="grid h-9 w-9 place-items-center rounded-full border border-red-500/40 text-red-400">{icon}</span>
      <span>{label}</span>
    </div>
  )
}

function SignalBrainBurst({ active }: { active: boolean }) {
  const nodes = [
    { x: 18, y: 30, label: 'People Search' },
    { x: 32, y: 15, label: 'Brokers' },
    { x: 52, y: 24, label: 'Public Records' },
    { x: 72, y: 18, label: 'Social' },
    { x: 82, y: 46, label: 'Breach' },
    { x: 67, y: 70, label: 'Ad Networks' },
    { x: 42, y: 78, label: 'Doxxing Risk' },
    { x: 20, y: 62, label: 'NCII Shield' },
  ]
  const edges = [
    [0, 1], [0, 7], [1, 2], [1, 5], [2, 3],
    [2, 6], [3, 4], [4, 5], [5, 6], [6, 7],
    [7, 0], [1, 6], [3, 5],
  ]

  return (
    <motion.div
      className="signal-burst pointer-events-none absolute inset-0 z-30"
      initial={{ opacity: 1 }}
      animate={active ? { opacity: 1 } : { opacity: 0.16 }}
      transition={{ duration: 0.7 }}
      aria-hidden="true"
    >
      <motion.div
        className="signal-burst-panel"
        initial={{ scale: 0.72, y: 52, filter: 'blur(18px)' }}
        animate={active
          ? { scale: [0.72, 1.04, 0.96], y: [52, 0, -12], filter: ['blur(18px)', 'blur(0px)', 'blur(0px)'] }
          : { scale: 1.18, y: -34, filter: 'blur(12px)' }}
        transition={{ duration: active ? 2.55 : 0.72, ease: [0.22, 1, 0.36, 1] }}
      >
        <svg className="signal-web" viewBox="0 0 100 100" preserveAspectRatio="none">
          {edges.map(([from, to]) => (
            <motion.line
              key={`${from}-${to}`}
              x1={nodes[from].x}
              y1={nodes[from].y}
              x2={nodes[to].x}
              y2={nodes[to].y}
              className="signal-edge"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={active ? { pathLength: 1, opacity: [0, 0.9, 0.35] } : { pathLength: 1, opacity: 0.12 }}
              transition={{ duration: 1.4, delay: 0.22 + from * 0.035 }}
            />
          ))}
        </svg>

        {nodes.map((node, index) => (
          <motion.div
            key={node.label}
            className="signal-node"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            initial={{ opacity: 0, scale: 0, x: '-50%', y: '-50%' }}
            animate={active
              ? { opacity: [0, 1, 0.85], scale: [0, 1.18, 1], x: '-50%', y: '-50%' }
              : { opacity: 0.16, scale: 0.82, x: '-50%', y: '-50%' }}
            transition={{ duration: 1.25, delay: 0.18 + index * 0.09 }}
          >
            <span />
            <strong>{node.label}</strong>
          </motion.div>
        ))}

        <motion.div
          className="signal-core"
          initial={{ scale: 0.58, opacity: 0 }}
          animate={active ? { scale: [0.58, 1, 1.34], opacity: [0, 1, 0.92] } : { scale: 1.7, opacity: 0.1 }}
          transition={{ duration: active ? 2.4 : 0.72, ease: [0.22, 1, 0.36, 1] }}
        >
          <Network className="h-12 w-12 text-white" />
          <span>Privacy Signal</span>
        </motion.div>

        <motion.div
          className="signal-headline-ghost"
          initial={{ opacity: 0, scale: 0.82, y: 24 }}
          animate={active ? { opacity: [0, 0, 1, 0], scale: [0.82, 0.9, 1.08, 1.24], y: [24, 8, -8, -28] } : { opacity: 0 }}
          transition={{ duration: 2.6, times: [0, 0.44, 0.72, 1] }}
        >
          TAKE BACK YOUR DATA
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-5 py-4 text-center">
      <div className="text-2xl font-black text-red-500">{value}</div>
      <div className="mt-1 text-xs text-gray-400">{label}</div>
    </div>
  )
}

function DashboardMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/45 p-5">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{label}</div>
      <div className="mt-3 text-4xl font-black text-white">{value}</div>
      <div className="mt-2 text-sm text-red-300">{sub}</div>
    </div>
  )
}

function SidePanel({ title, value, body }: { title: string; value: string; body: string }) {
  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{title}</div>
      <div className="mt-3 text-4xl font-black text-red-500">{value}</div>
      <p className="mt-2 text-sm leading-6 text-gray-400">{body}</p>
    </div>
  )
}

function FullDataMap() {
  const mapSignals = [
    { label: 'People search', value: '23', icon: UserSearch },
    { label: 'Broker sites', value: '47', icon: Database },
    { label: 'Public records', value: '12', icon: Gavel },
    { label: 'Social profiles', value: '19', icon: Network },
    { label: 'Breach data', value: '6', icon: ShieldAlert },
    { label: 'Ad networks', value: '89', icon: Link2 },
  ]

  return (
    <section id="data-map" className="border-b border-white/10 bg-black">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-red-300">In-house exposure graph</p>
            <h2 className="mt-2 text-3xl font-black text-white">Full Data Map</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
              The map stays on the page: brokers, people-search sites, public records, breach traces, social profiles, and report pathways connect into one command view.
            </p>
          </div>
          <a href="#command-center" className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/25 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/35">
            <Map className="h-4 w-4" />
            Open command center
          </a>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="glass-panel overflow-hidden rounded-xl">
            <ExposureGraph focused totalSources={273} className="min-h-[640px]" />
          </div>
          <div className="space-y-3">
            {mapSignals.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full border border-red-500/35 bg-red-950/20 text-red-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="font-bold text-white">{label}</div>
                      <div className="text-xs uppercase tracking-[0.14em] text-gray-500">linked source group</div>
                    </div>
                  </div>
                  <div className="text-3xl font-black text-red-400">{value}</div>
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-red-500/25 bg-red-950/15 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-red-200">Map output</div>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Every confirmed source can become either a broker removal, image-search evidence item, actor evidence note, or authority report line.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ActorTracker({
  tracker,
  setTracker,
  actorPacket,
  copyActorPacket,
  copied,
}: {
  tracker: ActorTrackerDraft
  setTracker: (tracker: ActorTrackerDraft) => void
  actorPacket: string
  copyActorPacket: () => void
  copied: string | null
}) {
  const update = (field: keyof ActorTrackerDraft, value: string) => setTracker({ ...tracker, [field]: value })

  return (
    <motion.div id="track-him" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 scroll-mt-24 lg:grid-cols-[390px_1fr]">
      <aside className="glass-panel rounded-xl p-5">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <Target className="h-6 w-6 text-red-300" />
          <div>
            <h2 className="font-bold">Track Him</h2>
            <p className="text-xs text-gray-500">Actor evidence, accounts, reports, and safety timeline.</p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-red-500/25 bg-red-950/10 p-3 text-xs leading-5 text-red-100/80">
          Evidence tracking only. This does not support physical tracking, credential access, harassment, or doxxing.
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Actor / case label" value={tracker.actorLabel} onChange={value => update('actorLabel', value)} />
          <Field label="Known accounts / user IDs" value={tracker.knownAccounts} onChange={value => update('knownAccounts', value)} multiline />
          <Field label="Known emails" value={tracker.knownEmails} onChange={value => update('knownEmails', value)} multiline />
          <Field label="Known phones" value={tracker.knownPhones} onChange={value => update('knownPhones', value)} multiline />
          <Field label="Incident URLs" value={tracker.incidentUrls} onChange={value => update('incidentUrls', value)} multiline />
          <Field label="Timeline" value={tracker.timeline} onChange={value => update('timeline', value)} multiline />
          <Field label="Evidence notes" value={tracker.evidenceNotes} onChange={value => update('evidenceNotes', value)} multiline />
          <Field label="Report numbers" value={tracker.reportNumbers} onChange={value => update('reportNumbers', value)} multiline />
        </div>
        <button type="button" onClick={copyActorPacket} className="red-button-glow mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-bold text-white">
          <Copy className="h-4 w-4" />
          {copied === 'actor-packet' ? 'Copied tracker' : 'Copy tracker packet'}
        </button>
      </aside>

      <section className="space-y-4">
        <div className="glass-panel rounded-xl p-5">
          <h3 className="font-bold">Track and monitor toolkit</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {TRACK_RESOURCES.map(resource => (
              <a key={resource.name} href={resource.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/10 bg-black/45 p-4 transition-colors hover:border-red-500/50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{resource.name}</div>
                    <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-red-300">{resource.type}</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-red-400" />
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-500">{resource.note}</p>
              </a>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-xl p-5">
          <h3 className="font-bold">Actor evidence map</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ['Known IDs', tracker.knownAccounts || 'Add accounts'],
              ['Incidents', tracker.incidentUrls || 'Add URLs'],
              ['Reports', tracker.reportNumbers || 'Add report IDs'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-black/45 p-4">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{label}</div>
                <div className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-gray-200">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-xl p-5">
          <h3 className="font-bold">Generated tracker preview</h3>
          <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/60 p-4 font-mono text-xs leading-5 text-gray-300">
            {actorPacket}
          </pre>
        </div>
      </section>
    </motion.div>
  )
}

function RemovalHub({
  profile,
  setProfile,
  completed,
  completion,
  brokerDone,
  copied,
  copyAllRemovals,
  copyRemovalRequest,
  toggle,
}: {
  profile: RemovalProfile
  setProfile: (profile: RemovalProfile) => void
  completed: Record<string, boolean>
  completion: number
  brokerDone: number
  copied: string | null
  copyAllRemovals: () => void
  copyRemovalRequest: (brokerName: string) => void
  toggle: (id: string) => void
}) {
  const update = (field: keyof RemovalProfile, value: string) => setProfile({ ...profile, [field]: value })

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <aside className="glass-panel rounded-xl p-5">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <ClipboardCheck className="h-6 w-6 text-red-300" />
          <div>
            <h2 className="font-bold">One Stop Removal</h2>
            <p className="text-xs text-gray-500">{completion}% broker queue complete</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Full name" value={profile.fullName} onChange={value => update('fullName', value)} />
          <Field label="Confirmation email" value={profile.email} onChange={value => update('email', value)} />
          <Field label="Phone" value={profile.phone} onChange={value => update('phone', value)} />
          <Field label="City / state" value={profile.cityState} onChange={value => update('cityState', value)} />
          <Field label="Address history" value={profile.addressHistory} onChange={value => update('addressHistory', value)} multiline />
          <Field label="Broker profile URLs" value={profile.profileUrls} onChange={value => update('profileUrls', value)} multiline />
          <Field label="Extra notes" value={profile.extraNotes} onChange={value => update('extraNotes', value)} multiline />
        </div>
        <button type="button" onClick={copyAllRemovals} className="red-button-glow mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-bold text-white">
          <Copy className="h-4 w-4" />
          {copied === 'all-removals' ? 'Copied full queue' : 'Copy full queue'}
        </button>
        <p className="mt-3 text-xs leading-5 text-gray-500">
          The app prepares and tracks removals here. Final submission still happens through each official portal.
        </p>
      </aside>

      <section className="space-y-3">
        <div className="glass-panel rounded-xl p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <DashboardMetric label="Submitted" value={`${brokerDone}`} sub="Marked complete" />
            <DashboardMetric label="Remaining" value={`${DATA_BROKERS.length - brokerDone}`} sub="Still in queue" />
            <DashboardMetric label="Critical" value="3" sub="Start here" />
          </div>
        </div>
        {DATA_BROKERS.map((broker, index) => (
          <article key={broker.name} className={clsx('rounded-xl border p-4', completed[`broker-${index}`] ? 'border-red-500/30 bg-red-950/15' : 'border-white/10 bg-white/[0.03]')}>
            <div className="grid gap-3 lg:grid-cols-[auto_1fr_auto]">
              <button
                type="button"
                onClick={() => toggle(`broker-${index}`)}
                className={clsx('grid h-9 w-9 place-items-center rounded-lg border', completed[`broker-${index}`] ? 'border-red-400 bg-red-500 text-white' : 'border-white/20 text-transparent hover:text-white')}
                aria-label={completed[`broker-${index}`] ? `Mark ${broker.name} incomplete` : `Mark ${broker.name} submitted`}
              >
                <Check className="h-5 w-5" />
              </button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{broker.name}</h3>
                  <span className={clsx('rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em]', PRIORITY_STYLES[broker.priority])}>
                    {broker.priority}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{broker.note}</p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button type="button" onClick={() => copyRemovalRequest(broker.name)} className="rounded-lg border border-red-500/35 bg-red-950/30 px-3 py-2 text-xs font-bold text-red-100">
                  {copied === broker.name ? 'Copied' : 'Copy request'}
                </button>
                <a href={broker.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/55 px-3 py-2 text-xs font-bold text-gray-200">
                  Open portal <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </article>
        ))}
      </section>
    </motion.div>
  )
}

function ShieldVault({
  hashReceipt,
  hashFile,
  copyHashReceipt,
  copied,
}: {
  hashReceipt: { fileName: string; fileSize: string; sha256: string; createdAt: string; caseId: string } | null
  hashFile: (file: File) => void
  copyHashReceipt: () => void
  copied: string | null
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full border border-red-500/45 p-4 text-red-400">
            <Hash className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Vindica Shield</h2>
            <p className="mt-2 text-gray-400">
              Select a private image or video you already have. The browser creates a SHA-256 fingerprint locally. This demo does not upload the raw file.
            </p>
          </div>
        </div>
        <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-red-500/40 bg-red-950/10 px-6 py-12 text-center transition-colors hover:bg-red-950/20">
          <Upload className="h-10 w-10 text-red-400" />
          <span className="mt-3 font-semibold">Create local hash receipt</span>
          <span className="mt-1 text-sm text-gray-500">File remains on your device</span>
          <input
            type="file"
            className="sr-only"
            accept="image/*,video/*"
            onChange={event => {
              const file = event.target.files?.[0]
              if (file) hashFile(file)
            }}
          />
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ResourceLink href="https://stopncii.org/how-it-works/" label="Open StopNCII" />
          <ResourceLink href="https://takeitdown.ncmec.org/" label="Open Take It Down" />
        </div>
      </div>

      <div className="glass-panel rounded-xl p-6">
        <h3 className="font-bold">Hash receipt</h3>
        {hashReceipt ? (
          <div className="mt-4 space-y-3">
            <ReceiptLine label="Case ID" value={hashReceipt.caseId} />
            <ReceiptLine label="File" value={`${hashReceipt.fileName} (${hashReceipt.fileSize})`} />
            <ReceiptLine label="Created" value={hashReceipt.createdAt} />
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">SHA-256</div>
              <div className="mt-2 break-all rounded-lg border border-white/10 bg-black/55 p-3 font-mono text-xs text-red-100">{hashReceipt.sha256}</div>
            </div>
            <button type="button" onClick={copyHashReceipt} className="red-button-glow inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-bold text-white">
              <Copy className="h-4 w-4" />
              {copied === 'hash-receipt' ? 'Copied receipt' : 'Copy hash receipt'}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-gray-500">
            No receipt yet. This mirrors the StopNCII/Take It Down idea for your app architecture: local hashing, evidence record, and partner/platform action paths.
          </p>
        )}
      </div>
    </motion.div>
  )
}

function ReportCenter({
  incident,
  setIncident,
  reportPacket,
  copyReport,
  copied,
}: {
  incident: IncidentDraft
  setIncident: (incident: IncidentDraft) => void
  reportPacket: string
  copyReport: () => void
  copied: string | null
}) {
  const update = (field: keyof IncidentDraft, value: string) => setIncident({ ...incident, [field]: value })

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 lg:grid-cols-[390px_1fr]">
      <aside className="glass-panel rounded-xl p-5">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <Gavel className="h-6 w-6 text-red-300" />
          <div>
            <h2 className="font-bold">Authority Report</h2>
            <p className="text-xs text-gray-500">IC3, state privacy, platform safety, and trusted-contact drafts</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Incident type" value={incident.incidentType} onChange={value => update('incidentType', value)} />
          <Field label="Platforms involved" value={incident.platforms} onChange={value => update('platforms', value)} />
          <Field label="Accounts / identifiers" value={incident.accounts} onChange={value => update('accounts', value)} multiline />
          <Field label="Content URLs" value={incident.urls} onChange={value => update('urls', value)} multiline />
          <Field label="Timeline" value={incident.timeline} onChange={value => update('timeline', value)} multiline />
          <Field label="Evidence preserved" value={incident.evidence} onChange={value => update('evidence', value)} multiline />
          <Field label="Impact / safety concern" value={incident.impact} onChange={value => update('impact', value)} multiline />
        </div>
        <button type="button" onClick={copyReport} className="red-button-glow mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-bold text-white">
          <Copy className="h-4 w-4" />
          {copied === 'incident-report' ? 'Copied packet' : 'Copy incident packet'}
        </button>
      </aside>

      <section className="space-y-4">
        <div className="glass-panel rounded-xl p-5">
          <h3 className="font-bold">Law and compliance evaluation</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {LEGAL_SIGNALS.map(signal => (
              <div key={signal.law} className="rounded-lg border border-white/10 bg-black/45 p-4">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-red-400" />
                  <span className="font-semibold">{signal.law}</span>
                </div>
                <div className="mt-1 font-mono text-xs text-red-200">{signal.article}</div>
                <p className="mt-2 text-sm leading-6 text-gray-400">{signal.risk}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-xl p-5">
          <h3 className="font-bold">Platform and authority portals</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PLATFORM_REPORTS.map(platform => (
              <a key={platform.name} href={platform.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/10 bg-black/45 p-4 transition-colors hover:border-red-500/50">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{platform.name}</span>
                  <ExternalLink className="h-4 w-4 text-red-400" />
                </div>
                <p className="mt-2 text-sm text-gray-500">{platform.note}</p>
              </a>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-xl p-5">
          <h3 className="font-bold">Generated report preview</h3>
          <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/60 p-4 font-mono text-xs leading-5 text-gray-300">
            {reportPacket}
          </pre>
        </div>
      </section>
    </motion.div>
  )
}

function SupportCenter() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full border border-red-500/45 p-4 text-red-400">
            <LifeBuoy className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-3xl font-bold">Advocate connection center</h2>
            <p className="mt-2 text-gray-400">
              The app keeps the emergency and advocate resources close to the evidence workflow, including CCRI, StopNCII, Take It Down, IC3, and state privacy contacts.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {SUPPORT_RESOURCES.map(resource => (
            <a key={resource.name} href={resource.url} target={resource.url.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="rounded-xl border border-white/10 bg-black/45 p-5 transition-colors hover:border-red-500/50">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">{resource.name}</span>
                {resource.url.startsWith('tel:') ? <PhoneCall className="h-5 w-5 text-red-400" /> : <ExternalLink className="h-5 w-5 text-red-400" />}
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-500">{resource.detail}</p>
            </a>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <SupportScript title="Trusted contact script" icon={<Mail className="h-5 w-5" />}>
          I need to tell you what happened. I was targeted online and someone may try to contact people around me or use personal information to pressure me. Please do not respond to unknown accounts, screenshot anything you receive, and send it to me.
        </SupportScript>
        <SupportScript title="Advocate call notes" icon={<Siren className="h-5 w-5" />}>
          I am dealing with online abuse involving doxxing, stalking, impersonation, or intimate-image risk. I have screenshots, URLs, timestamps, and platform report attempts. I need help with documentation, safety planning, takedowns, and referrals.
        </SupportScript>
      </div>
    </motion.div>
  )
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={event => onChange(event.target.value)} rows={4} className="input-field min-h-24 resize-y font-mono text-xs leading-5" />
      ) : (
        <input value={value} onChange={event => onChange(event.target.value)} className="input-field font-mono text-xs" />
      )}
    </label>
  )
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-200">{value}</div>
    </div>
  )
}

function ResourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/55 px-4 py-3 text-sm font-bold text-gray-200 transition-colors hover:border-red-500/50">
      {label}
      <ExternalLink className="h-4 w-4" />
    </a>
  )
}

function SupportScript({ title, icon, children }: { title: string; icon: JSX.Element; children: string }) {
  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="flex items-center gap-2 text-red-300">
        {icon}
        <h3 className="font-bold text-white">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-gray-400">{children}</p>
    </div>
  )
}
