import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
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
import { AuthVaultPrompt } from '@/components/auth/AuthVaultPrompt'
import { ExposureLookupPanel } from '@/components/Investigation/ExposureLookupPanel'
import { getProviderSetup } from '@/components/Investigation/providerSetup'
import { ReverseImageSearchPanel } from '@/components/Investigation/ReverseImageSearchPanel'
import { ExposureGraph, type ExposureGraphMode } from '@/components/visuals/ExposureGraph'
import { useAuthSession } from '@/hooks/useAuthSession'
import { useCreateScan, useScanResult, useScanStatus } from '@/hooks/useScan'
import { api } from '@/services/api'
import type { CommandAction, DomainIntelResult, DomainLookupResult, IpLookupResult, PhoneLookupResult, ScanJob, ScanRequest, ScanResult, UsernamePlatformResult } from '@/types'
import {
  DATA_BROKERS,
  EMAIL_BLAST_RECIPIENTS,
  LEGAL_SIGNALS,
  LIVE_SOURCE_ROWS,
  OSINT_SKILL_PLAYBOOKS,
  OSINT_TOOLS,
  PLATFORM_REPORTS,
  PRIORITY_STYLES,
  SECOND_BRAIN_LINKS,
  SECOND_BRAIN_NODES,
  SUPPORT_RESOURCES,
  TRACK_RESOURCES,
} from './home/data'
import {
  DEFAULT_ACTOR_TRACKER,
  DEFAULT_INCIDENT,
  DEFAULT_REMOVAL_PROFILE,
  DEFAULT_SCAN_FIELDS,
  type ActorTrackerDraft,
  type ExposureCounts,
  type HomeSection,
  type IncidentDraft,
  type LiveScanPreview,
  type RemovalProfile,
  type ScanFields,
  type ScanInputKind,
} from './home/types'
import { DEFAULT_EXPOSURE_COUNTS } from './home/types'
import {
  authRequired,
  buildActorPacket,
  buildBrowserOutputRows,
  buildCaseFile,
  buildIncidentPacket,
  buildOsintToolHref,
  buildRemovalRequest,
  cleanScanFields,
  copyText,
  countExposureSources,
  countsFromScanResult,
  formatScanKind,
  kindFromScanRequest,
  operatorConfidence,
  operatorSeverity,
  parseScanInput,
  scanRequestHasIdentifier,
  subjectFromScanRequest,
  totalSourcesFromScanResult,
} from './home/utils'

function ActionReceipt({ id, error }: { id?: string | null; error?: string | null }) {
  if (!id && !error) return null
  const needsLogin = authRequired(error)
  return (
    <div className={clsx('mt-3 rounded-lg border px-3 py-2 text-xs leading-5', error ? 'border-red-500/35 bg-red-950/25 text-red-100' : 'border-red-500/25 bg-red-950/15 text-red-100/85')}>
      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{needsLogin ? 'Sign in to save this output to your Vindica vault.' : error}</span>
          {needsLogin && (
            <Link to="/account" className="font-bold text-white underline decoration-red-300/60 underline-offset-4">
              Log in
            </Link>
          )}
        </div>
      ) : `Saved to command actions: ${id}`}
    </div>
  )
}

function LaunchIntroGate({
  reduceMotion,
  onReplay,
}: {
  reduceMotion: boolean
  onReplay: () => void
}) {
  return (
    <motion.div
      className="pointer-events-auto fixed inset-0 z-[90] overflow-hidden bg-black"
      initial={reduceMotion ? { opacity: 1 } : { opacity: 1 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(239,68,68,0.2),transparent_24rem)]" />
      <SignalBrainBurst active />

      <div className="relative z-20 flex min-h-screen items-center justify-center px-4">
        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 28, scale: 0.96, filter: 'blur(10px)' }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <p className="text-sm font-bold uppercase tracking-[0.32em] text-red-500">Privacy. Restored.</p>
            <button
              type="button"
              onClick={onReplay}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-red-500/35 bg-red-950/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-red-200 transition-colors hover:border-red-400 hover:bg-red-900/35"
            >
              <Play className="h-3 w-3" />
              Replay signal
            </button>
          </div>
          <motion.h1
            className="hero-title mt-6 text-6xl font-black tracking-tight text-white sm:text-7xl lg:text-8xl"
            initial={reduceMotion ? { opacity: 1 } : { y: 42, scale: 0.92, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.84, delay: reduceMotion ? 0 : 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            Take Back <span className="block text-red-500">Your Data.</span>
          </motion.h1>
          <motion.p
            className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-300 sm:text-xl"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.72, delay: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            Find, monitor, and remove personal data from data broker networks, social platforms, public records, and the open web.
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function Home({ initialTab = 'scan' }: { initialTab?: 'scan' | 'scanSelf' | 'optout' | 'find' | 'image' | 'authority' | 'monitor' | 'osint' | 'brokers' | 'fingerprint' | 'platform' | 'email' }) {
  const reduceMotion = useReducedMotion()
  const { mutateAsync, isPending } = useCreateScan()
  const { isAuthenticated } = useAuthSession()
  const hasLaunchIntro = initialTab === 'scan'
  const initialSection: HomeSection =
    initialTab === 'authority' ? 'reports'
      : initialTab === 'optout' ? 'removal'
        : initialTab === 'find' ? 'lookup'
          : initialTab === 'scanSelf' ? 'scanSelf'
            : initialTab === 'image' ? 'image'
              : initialTab === 'monitor' ? 'track'
                : initialTab === 'osint' ? 'osint'
                  : initialTab === 'brokers' ? 'brokers'
                    : initialTab === 'fingerprint' ? 'fingerprint'
                      : initialTab === 'platform' ? 'platform'
                        : initialTab === 'email' ? 'email'
                          : 'overview'
  const [section, setSection] = useState<HomeSection>(initialSection)
  const [query, setQuery] = useState('')
  const [scanFields, setScanFields] = useState<ScanFields>(DEFAULT_SCAN_FIELDS)
  const [queryError, setQueryError] = useState('')
  const [liveScan, setLiveScan] = useState<LiveScanPreview | null>(null)
  const [introKey, setIntroKey] = useState(0)
  const [introSettled, setIntroSettled] = useState(false)
  const [introVisible, setIntroVisible] = useState(hasLaunchIntro)
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
  const liveScanId = liveScan?.scanId ?? null
  const { data: liveStatus } = useScanStatus(liveScanId)
  const { data: liveResult } = useScanResult(liveScanId)

  const brokerDone = DATA_BROKERS.filter((_, index) => completed[`broker-${index}`]).length
  const completion = Math.round((brokerDone / DATA_BROKERS.length) * 100)
  const liveCounts = liveResult ? countsFromScanResult(liveResult) : DEFAULT_EXPOSURE_COUNTS
  const liveTotal = liveResult ? totalSourcesFromScanResult(liveResult) : countExposureSources(liveCounts)
  const privacyScore = liveResult ? `${Math.max(0, Math.round(100 - liveResult.risk_score))}/100` : '--'
  const complianceScore = liveResult?.compliance ? `${liveResult.compliance.overall}%` : '--'

  const reportPacket = useMemo(() => buildIncidentPacket(incident), [incident])
  const actorPacket = useMemo(() => buildActorPacket(actorTracker), [actorTracker])

  useEffect(() => {
    setSection(initialSection)
  }, [initialSection])

  useEffect(() => {
    setIntroSettled(false)
    if (hasLaunchIntro) {
      setIntroVisible(true)
    }
    const timer = window.setTimeout(() => setIntroSettled(true), reduceMotion ? 1600 : 2800)
    const dismissTimer = hasLaunchIntro
      ? window.setTimeout(() => setIntroVisible(false), reduceMotion ? 1700 : 3200)
      : undefined
    return () => {
      window.clearTimeout(timer)
      if (dismissTimer) {
        window.clearTimeout(dismissTimer)
      }
    }
  }, [hasLaunchIntro, introKey, reduceMotion])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const previousOverflow = document.body.style.overflow
    if (introVisible) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [introVisible])

  useEffect(() => {
    if (initialTab === 'scan') return
    const timer = window.setTimeout(() => {
      document.getElementById('active-section-panel')?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    }, reduceMotion ? 100 : 450)
    return () => window.clearTimeout(timer)
  }, [initialTab, reduceMotion, section])

  useEffect(() => {
    const scrollToHash = () => {
      const id = window.location.hash.replace('#', '')
      if (!id) return
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'start',
        })
      }, 80)
    }

    scrollToHash()
    window.addEventListener('hashchange', scrollToHash)
    return () => window.removeEventListener('hashchange', scrollToHash)
  }, [reduceMotion])

  const startLiveScan = async (body: ScanRequest, subject: string, kind: ScanInputKind) => {
    const startedAt = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

    setLiveScan({
      subject,
      kind,
      mode: 'scanning',
      counts: DEFAULT_EXPOSURE_COUNTS,
      startedAt,
    })
    setSection('overview')

    try {
      const job = await mutateAsync(body)
      setLiveScan({
        subject,
        kind,
        mode: 'scanning',
        counts: DEFAULT_EXPOSURE_COUNTS,
        startedAt,
        scanId: job.scan_id,
        vaultSaved: job.vault_saved,
        saveStatus: job.vault_saved
          ? 'Scan saved to your private vault'
          : isAuthenticated
            ? 'Scan started, but this server did not attach it to your vault'
            : 'Live scan started; sign in before scanning to save it',
      })
    } catch (error) {
      setLiveScan(null)
      setQueryError(error instanceof Error ? error.message : 'The scan could not be saved yet.')
    }
  }

  const runScan = async (event: FormEvent) => {
    event.preventDefault()
    const value = query.trim()
    if (!value) {
      setQueryError('Enter a name, email, phone, or username to scan.')
      return
    }
    setQueryError('')

    const { body, kind } = parseScanInput(value)
    await startLiveScan(body, value, kind)
  }

  const runStructuredScan = async (event: FormEvent) => {
    event.preventDefault()
    const body = cleanScanFields(scanFields)
    if (!scanRequestHasIdentifier(body)) {
      setQueryError('Add at least one scan field: name, email, phone, or username.')
      return
    }
    setQueryError('')

    const subject = subjectFromScanRequest(body)
    const kind = kindFromScanRequest(body)
    setQuery(subject)
    await startLiveScan(body, subject, kind)
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
    { id: 'scanSelf' as const, label: 'Scan Yourself', icon: ScanLine },
    { id: 'lookup' as const, label: 'Find Yourself', icon: Search },
    { id: 'osint' as const, label: 'OSINT Tools', icon: Network },
    { id: 'track' as const, label: 'Authorized Tracker', icon: Target },
    { id: 'removal' as const, label: 'One-Stop Opt Out', icon: ClipboardCheck },
    { id: 'brokers' as const, label: 'Broker DB', icon: Database },
    { id: 'image' as const, label: 'Image Search', icon: Upload },
    { id: 'fingerprint' as const, label: 'Fingerprint', icon: Hash },
    { id: 'platform' as const, label: 'Platform Reporter', icon: Siren },
    { id: 'email' as const, label: 'Email Blast', icon: Mail },
    { id: 'reports' as const, label: 'Authority Report', icon: Gavel },
    { id: 'support' as const, label: 'Advocates', icon: LifeBuoy },
  ]

  const replayIntro = () => {
    setIntroVisible(true)
    setIntroKey(key => key + 1)
  }

  return (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <AnimatePresence>
        {introVisible && hasLaunchIntro && (
          <LaunchIntroGate key={`launch-${introKey}`} reduceMotion={Boolean(reduceMotion)} onReplay={replayIntro} />
        )}
      </AnimatePresence>
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
              onClick={replayIntro}
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

          <LiveScanPanel liveScan={liveScan} isPending={isPending} isAuthenticated={isAuthenticated} />
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.9, x: 36 }}
          animate={introSettled ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0.32, scale: 0.94, x: 18 }}
          transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          <HeroCommandDeck
            liveScan={liveScan}
            liveCounts={liveCounts}
            liveTotal={liveTotal}
            graphMode={liveStatus?.status === 'completed' ? 'resolved' : liveStatus && liveStatus.status !== 'failed' ? 'scanning' : liveScan?.mode ?? 'idle'}
          />
        </motion.div>
      </section>

      <HeartbeatDivider />
      <LiveResolutionSection liveScan={liveScan} liveCounts={liveCounts} liveTotal={liveTotal} />
      <HeartbeatDivider reverse />
      <DigitalSecondBrainSection liveScan={liveScan} liveCounts={liveCounts} />
      <HeartbeatDivider />
      <PremiumDashboardPreview
        liveScan={liveScan}
        liveCounts={liveCounts}
        liveTotal={liveTotal}
        statusData={liveStatus}
        result={liveResult}
      />


      <section id="product" className="border-y border-white/10 bg-[#050506]/92">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-5 lg:px-8">
          {[
            ['Operator OSINT Workbench', Network],
            ['Name-linked Broker Hits', Search],
            ['Breach / Dark-Web Signals', ScanLine],
            ['Second-Brain Source Links', Link2],
            ['One-Click Removal Queue', Database],
          ].map(([label, Icon]) => (
            <div key={label as string} className="flex items-center gap-3 border-white/10 px-3 py-3 lg:border-r lg:last:border-r-0">
              <Icon className="h-6 w-6 text-red-500" />
              <span className="font-semibold text-gray-200">{label as string}</span>
            </div>
          ))}
        </div>
      </section>

      <FullDataMap liveScan={liveScan} />
      <LiveBrowserResults statusData={liveStatus} result={liveResult} liveScan={liveScan} isAuthenticated={isAuthenticated} />

      <section id="command-center" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
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

        <div id="active-section-panel" className="scroll-mt-24">
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
                <DashboardMetric label="Privacy score" value={privacyScore} sub={liveResult ? `${formatScanKind(liveScan?.kind ?? 'email')} risk` : 'Run a scan to measure'} />
                <DashboardMetric label="Sources found" value={`${liveTotal}`} sub={liveResult ? 'Across linked evidence groups' : 'Awaiting live evidence'} />
                <DashboardMetric label="Compliance score" value={complianceScore} sub={liveResult?.compliance ? 'Scored from returned findings' : 'Awaiting live evidence'} />
              </div>
              <div className="mt-6 rounded-xl border border-red-500/25 bg-red-950/15 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-1 h-5 w-5 text-red-300" />
                  <div>
                    <h3 className="font-semibold">{liveResult ? 'Returned exposure findings' : 'No exposure score before the scan runs'}</h3>
                    <p className="mt-1 text-sm text-gray-400">
                      {liveResult && liveScan
                        ? `${liveScan.subject} returned broker listings, people-search profiles, public records, breach signals, and social-profile traces that can become removal tasks and report evidence.`
                        : 'The dashboard stays neutral until a real scan returns evidence. Once it does, those findings become removal tasks, report inputs, and vault records.'}
                    </p>
                  </div>
                </div>
              </div>
              <OperatorWorkbench
                liveScan={liveScan}
                liveCounts={liveCounts}
                liveTotal={liveTotal}
                statusData={liveStatus}
                result={liveResult}
              />
              <CommandActionResults />
            </div>

            <div className="space-y-4">
              <SidePanel title="Removal Requests" value={liveResult ? `${liveCounts.brokers}` : `${brokerDone}/${DATA_BROKERS.length}`} body={liveResult ? 'Broker listings returned by the scan.' : 'Submitted through the one-stop broker queue.'} />
              <SidePanel title="Broker Coverage" value={liveResult ? `${liveResult.broker_listings.length} matched` : '--'} body={liveResult ? 'Broker targets actually returned by the current scan.' : 'Measured after broker listings return from a real scan.'} />
              <SidePanel title="Report Pack" value={liveScan?.scanId ? 'Saved' : 'Awaiting scan'} body="IC3 summary, state privacy complaint, platform takedown demand, and family notice drafts." />
            </div>
          </motion.div>
        )}

        {section === 'scanSelf' && (
          <ScanSelfCenter
            scanFields={scanFields}
            setScanFields={setScanFields}
            runStructuredScan={runStructuredScan}
            queryError={queryError}
            liveScan={liveScan}
            liveCounts={liveCounts}
            liveTotal={liveTotal}
            isPending={isPending}
          />
        )}

        {section === 'lookup' && <ExposureLookupPanel />}

        {section === 'osint' && <OSINTToolsPanel />}

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
            liveScan={liveScan}
          />
        )}

        {section === 'brokers' && (
          <BrokerDatabasePanel
            completed={completed}
            copied={copied}
            copyRemovalRequest={copyRemovalRequest}
            toggle={toggle}
          />
        )}

        {section === 'platform' && (
          <PlatformReporterCenter
            incident={incident}
            setIncident={setIncident}
            copyReport={copyReport}
            copied={copied}
          />
        )}

        {section === 'email' && (
          <EmailBlastCenter
            incident={incident}
            reportPacket={reportPacket}
            copied={copied}
            markCopied={markCopied}
          />
        )}

        {section === 'image' && <ReverseImageSearchPanel />}

        {section === 'fingerprint' && (
          <ShieldVault hashReceipt={hashReceipt} hashFile={hashFile} copyHashReceipt={copyHashReceipt} copied={copied} />
        )}

        {section === 'reports' && (
          <ReportCenter incident={incident} setIncident={setIncident} reportPacket={reportPacket} copyReport={copyReport} copied={copied} />
        )}

        {section === 'support' && <SupportCenter />}
        </div>
      </section>
    </div>
  )
}

function LiveScanPanel({
  liveScan,
  isPending,
  isAuthenticated,
}: {
  liveScan: LiveScanPreview | null
  isPending: boolean
  isAuthenticated: boolean
}) {
  const counts = liveScan?.counts ?? DEFAULT_EXPOSURE_COUNTS
  const hasMeasuredSignals = countExposureSources(counts) > 0
  const status = liveScan
    ? liveScan.mode === 'scanning' || isPending
      ? 'Resolving source links'
      : liveScan.saveStatus ?? 'Scan completed'
    : 'Enter a name, email, phone, or handle to activate the in-house linkage map.'

  return (
    <div className="glass-panel mt-7 max-w-xl rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-300">Live second-brain scan</div>
          <div className="mt-1 text-sm text-gray-300">{status}</div>
        </div>
        {liveScan ? (
          <div className="rounded-full border border-red-500/40 bg-red-950/25 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-red-100">
            {formatScanKind(liveScan.kind)}
          </div>
        ) : (
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
            Waiting
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, label: liveScan ? liveScan.subject : 'Identity node', detail: hasMeasuredSignals ? `${countExposureSources(counts)} linked sources` : 'Search activates graph' },
          { icon: Lock, label: 'Private evidence', detail: 'Browser-visible evidence' },
          { icon: Bell, label: 'Removal queue', detail: liveScan?.scanId ? 'Ready after evidence returns' : 'Prepared after scan' },
        ].map(({ icon: Icon, label, detail }) => (
          <div key={label} className="rounded-lg border border-white/10 bg-black/40 p-3">
            <Icon className="h-4 w-4 text-red-300" />
            <div className="mt-2 truncate text-sm font-bold text-white">{label}</div>
            <div className="mt-1 text-xs text-gray-500">{detail}</div>
          </div>
        ))}
      </div>

      {!isAuthenticated && (
        <AuthVaultPrompt
          compact
          className="mt-4"
          title="Seal this live scan into a private vault"
          body="Live evidence is visible right now. Sign in or create your secure vault to keep the graph, removal queue, receipts, and reports bound to your account instead of disappearing with the session."
          ctaLabel="Sign in to save scans"
        />
      )}

      {isAuthenticated && liveScan?.scanId && liveScan.vaultSaved === false && (
        <div className="mt-4 rounded-lg border border-amber-400/35 bg-amber-950/20 px-4 py-3 text-xs leading-5 text-amber-100">
          This scan is running, but the server did not confirm vault ownership. Configure Supabase JWT verification before relying on saved history.
        </div>
      )}

      {liveScan && (
        <div className="mt-4 space-y-2">
          {hasMeasuredSignals ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {LIVE_SOURCE_ROWS.slice(0, 4).map(row => (
                <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="truncate text-xs text-gray-300">{row.label}</span>
                  <span className="font-mono text-sm font-black text-red-300">{counts[row.id]}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 text-xs leading-5 text-gray-500">
              No source-group counts are shown until the backend returns real evidence.
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-xs text-gray-500">Started {liveScan.startedAt}. Graph updates before the full report opens.</span>
            {liveScan.scanId && (
              <Link to={`/scan/${liveScan.scanId}`} className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/25 px-3 py-2 text-xs font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/35">
                Open full report
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function HeroCommandDeck({
  liveScan,
  liveCounts,
  liveTotal,
  graphMode,
}: {
  liveScan: LiveScanPreview | null
  liveCounts: ExposureCounts
  liveTotal: number
  graphMode: ExposureGraphMode
}) {
  const hasMeasuredSignals = liveTotal > 0
  const deckCards = [
    { title: 'Heartbeat', value: hasMeasuredSignals ? `${Math.max(76, 98 - liveCounts.breach)} BPM` : 'Standby', detail: hasMeasuredSignals ? 'System pulse locked to privacy events' : 'Activates after live evidence returns' },
    { title: 'Protection score', value: hasMeasuredSignals ? `${Math.max(28, 92 - Math.round(liveTotal / 4))}/100` : '--', detail: hasMeasuredSignals ? 'Animated risk model recalculating live' : 'Calculated from returned evidence only' },
    { title: 'Vault', value: liveScan?.scanId ? 'Armed' : 'Standby', detail: 'Evidence cards stack into retained command memory' },
  ]

  return (
    <div className="hero-command relative">
      <div className="hero-command__backdrop" />
      <div className="gold-scan-ring gold-scan-ring--one" />
      <div className="gold-scan-ring gold-scan-ring--two" />
      <div className="hero-command__graph">
        <ExposureGraph
          subject={liveScan?.subject}
          mode={graphMode}
          signalCounts={liveCounts}
          totalSources={liveTotal}
          className="min-h-[650px]"
        />
      </div>
      <div className="hero-command__floating">
        {deckCards.map((card, index) => (
          <motion.div
            key={card.title}
            className="tilt-card premium-panel"
            initial={{ opacity: 0, y: 30, rotateX: -10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.6, delay: 0.2 + index * 0.12 }}
            style={{ animationDelay: `${index * 0.3}s` }}
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#f5d7a1]">{card.title}</div>
            <div className="mt-3 text-2xl font-black text-[#fff7e8]">{card.value}</div>
            <div className="mt-2 text-xs leading-5 text-gray-400">{card.detail}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function HeartbeatDivider({ reverse = false }: { reverse?: boolean }) {
  return (
    <div className={clsx('heartbeat-divider border-y border-white/6', reverse && 'heartbeat-divider--reverse')}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="heartbeat-line" />
      </div>
    </div>
  )
}

function LiveResolutionSection({
  liveScan,
  liveCounts,
  liveTotal,
}: {
  liveScan: LiveScanPreview | null
  liveCounts: ExposureCounts
  liveTotal: number
}) {
  const subject = liveScan?.subject ?? 'Awaiting live scan'
  const maxCount = Math.max(...LIVE_SOURCE_ROWS.map(row => liveCounts[row.id]), 1)
  const hasMeasuredSignals = liveTotal > 0
  return (
    <section className="relative overflow-hidden bg-[#040404] py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(186,24,27,0.18),transparent_32rem),radial-gradient(circle_at_88%_55%,rgba(212,175,55,0.12),transparent_26rem)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:grid lg:grid-cols-[0.85fr_1.15fr] lg:gap-10 lg:px-8">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#f5d7a1]">Live Scan Resolution</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-[#fff7e8] sm:text-5xl">
            Real scan output should stay visible in the browser.
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-300">
            Vindica resolves linked records, broker surfaces, social traces, breach pressure, and evidence pathways into one protective surface. No staged mock flow, just the live map and the next actions it creates.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="premium-panel p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#f5d7a1]">Active subject</div>
              <div className="mt-2 text-2xl font-black text-white">{subject}</div>
              <div className="mt-1 text-xs text-gray-500">{liveScan ? formatScanKind(liveScan.kind) : 'Run a scan to populate the graph'}</div>
            </div>
            <div className="premium-panel p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#f5d7a1]">Exposure total</div>
              <div className="mt-2 text-2xl font-black text-white">{hasMeasuredSignals ? liveTotal : '--'}</div>
              <div className="mt-1 text-xs text-gray-500">{hasMeasuredSignals ? 'linked public, broker, and social signals' : 'Shown after real evidence returns'}</div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:mt-0 lg:grid-cols-2">
          {LIVE_SOURCE_ROWS.map((row, index) => {
            const count = liveCounts[row.id]
            const width = `${Math.max(10, Math.round((count / maxCount) * 100))}%`
            return (
            <motion.div
              key={row.id}
              className="tilt-card premium-panel p-5"
              initial={{ opacity: 0, y: 18 }}
              whileHover={{ rotateX: -6, rotateY: 6, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-[#fff7e8]">{row.label}</div>
                  <div className={clsx('text-sm font-black', count > Math.round(maxCount * 0.6) ? 'text-red-300' : 'text-[#f5d7a1]')}>{hasMeasuredSignals ? count : '--'}</div>
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-400">{row.detail}</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#7a1117,#ba181b,#d4af37)]"
                    initial={{ width: '0%' }}
                    animate={{ width: hasMeasuredSignals ? width : '0%' }}
                    transition={{ duration: 0.9, delay: 0.2 + index * 0.08 }}
                  />
                </div>
            </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function DigitalSecondBrainSection({
  liveScan,
  liveCounts,
}: {
  liveScan: LiveScanPreview | null
  liveCounts: ExposureCounts
}) {
  const subject = liveScan?.subject ?? 'You'

  return (
    <section className="relative overflow-hidden bg-black py-18">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#f5d7a1]">Digital Second Brain</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-[#fff7e8] sm:text-5xl">
            One graph. Every trace. Every defense path.
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-300">
            Vindica doesn’t dump disconnected findings. It keeps a living knowledge graph centered on the person, linking the identifiers, surfaces, evidence, removals, and alerts that matter.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="premium-panel relative min-h-[620px] overflow-hidden p-4">
            <div className="second-brain__grid" />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {SECOND_BRAIN_LINKS.map(([from, to], index) => (
                <line
                  key={`${from}-${to}`}
                  x1={parseFloat(SECOND_BRAIN_NODES[from].x)}
                  y1={parseFloat(SECOND_BRAIN_NODES[from].y)}
                  x2={parseFloat(SECOND_BRAIN_NODES[to].x)}
                  y2={parseFloat(SECOND_BRAIN_NODES[to].y)}
                  className="second-brain__edge"
                  style={{ animationDelay: `${index * 0.16}s` }}
                />
              ))}
            </svg>

            <div className="second-brain__core">
              <div className="second-brain__ring second-brain__ring--outer" />
              <div className="second-brain__ring second-brain__ring--inner" />
              <div className="second-brain__avatar">
                <Shield className="h-7 w-7 text-[#fff7e8]" />
                <div className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[#f5d7a1]">Core identity</div>
                <div className="mt-1 text-lg font-black text-white">{subject}</div>
              </div>
            </div>

            {SECOND_BRAIN_NODES.map((node, index) => {
              const Icon = node.icon
              return (
                <motion.div
                  key={node.label}
                  className="second-brain__node"
                  style={{ left: node.x, top: node.y }}
                  initial={{ opacity: 0, scale: 0.86 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, delay: 0.1 + index * 0.05 }}
                >
                  <div className="second-brain__pulse" />
                  <Icon className="h-4 w-4 text-[#f5d7a1]" />
                  <span>{node.label}</span>
                </motion.div>
              )
            })}
          </div>

          <div className="space-y-4">
            {[
              { label: 'People-search surfaces', value: liveCounts.people, detail: 'Aliases, relatives, household traces, old directory pages.' },
              { label: 'Broker removals', value: liveCounts.brokers, detail: 'Suppression pathways become tracked action objects.' },
              { label: 'Public record traces', value: liveCounts.records, detail: 'Court, property, and filing visibility mapped into the case.' },
              { label: 'Breach and ad-tech pressure', value: liveCounts.breach + liveCounts.ads, detail: 'Credential risk and targeting pressure shape defense score.' },
            ].map(card => (
              <div key={card.label} className="premium-panel tilt-card p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-[#fff7e8]">{card.label}</div>
                    <p className="mt-2 text-sm leading-6 text-gray-400">{card.detail}</p>
                  </div>
                  <div className="text-3xl font-black text-[#f5d7a1]">{card.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function PremiumDashboardPreview({
  liveScan,
  liveCounts,
  liveTotal,
  statusData,
  result,
}: {
  liveScan: LiveScanPreview | null
  liveCounts: ExposureCounts
  liveTotal: number
  statusData?: ScanJob
  result?: ScanResult
}) {
  const statusLabel = liveScan?.scanId ? 'Vault engaged' : liveScan ? 'Scan active' : 'Awaiting scan'
  const hasMeasuredSignals = liveTotal > 0
  const moduleValues = [
    {
      title: 'Exposure monitoring',
      value: hasMeasuredSignals ? `${liveTotal} linked` : '--',
      detail: hasMeasuredSignals ? 'Returned evidence groups under watch.' : 'Populates after a real scan returns evidence.',
      icon: ShieldCheck,
    },
    {
      title: 'Removals completed',
      value: result ? `${result.broker_listings.filter(item => item.opt_out_status !== 'not_started').length} queued` : '--',
      detail: result ? 'Broker listings with live removal state.' : 'Requires broker listings from a real scan.',
      icon: ClipboardCheck,
    },
    {
      title: 'Live alerts',
      value: result ? `${result.provider_status.filter(item => item.status !== 'completed').length} active` : '--',
      detail: result ? 'Provider failures, misses, or unresolved evidence lanes.' : 'Starts once provider results are returned.',
      icon: Bell,
    },
    {
      title: 'Image monitoring',
      value: '--',
      detail: 'Turns on when reverse-image evidence is captured and saved.',
      icon: Upload,
    },
    {
      title: 'Evidence vault',
      value: result ? `${result.evidence_items.length} items` : '--',
      detail: result ? 'Explicit evidence currently preserved in this scan.' : 'Waits for returned evidence or manual captures.',
      icon: Hash,
    },
    {
      title: 'Privacy reports',
      value: result?.scan_id ? 'Ready' : 'Awaiting scan',
      detail: result?.scan_id ? 'Report generation is unlocked from the saved scan.' : 'Generated from completed scans only.',
      icon: Gavel,
    },
    {
      title: 'Live threat feed',
      value: result ? `${Math.min(4, result.evidence_items.length + result.provider_status.length)} events` : '--',
      detail: result ? 'Derived from provider status and returned evidence.' : 'Starts once a scan returns live status.',
      icon: AlertTriangle,
    },
  ]
  const threatFeed = result
    ? [
        ...result.provider_status.slice(0, 2).map(item => ({
          key: `${item.provider}-${item.status}`,
          label: item.status === 'completed' ? 'Resolved' : item.status === 'failed' ? 'Critical' : 'Watching',
          event: item.message,
        })),
        ...result.evidence_items.slice(0, 2).map(item => ({
          key: item.id,
          label: item.risk_level.toUpperCase(),
          event: `${item.title} | ${item.source_name}`,
        })),
      ]
    : statusData
      ? [{
          key: 'scan-stage',
          label: statusData.status.toUpperCase(),
          event: statusData.current_stage,
        }]
      : []

  return (
    <section className="relative overflow-hidden bg-[#050505] py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_12%,rgba(212,175,55,0.12),transparent_24rem),radial-gradient(circle_at_10%_84%,rgba(186,24,27,0.18),transparent_24rem)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#f5d7a1]">Command Modules</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-[#fff7e8] sm:text-5xl">
              The dashboard should feel like power restored.
            </h2>
            <p className="mt-5 text-lg leading-8 text-gray-300">
              Exposure monitoring, removals, alerts, image evidence, vault memory, regulator packets, and a live threat feed sit together inside one protective surface.
            </p>
          </div>
          <div className="premium-panel p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#f5d7a1]">Status</div>
            <div className="mt-2 text-2xl font-black text-white">{statusLabel}</div>
            <div className="mt-1 text-xs text-gray-500">{hasMeasuredSignals ? `${liveTotal} linked signals under watch` : 'Awaiting real evidence'}</div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {moduleValues.map((module, index) => {
              const Icon = module.icon
              return (
                <motion.div
                  key={module.title}
                  className="tilt-card premium-panel p-5"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.06 }}
                  whileHover={{ rotateX: -5, rotateY: 5, y: -5 }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full border border-[#d4af37]/35 bg-[#d4af37]/8">
                      <Icon className="h-5 w-5 text-[#f5d7a1]" />
                    </div>
                    <div className="text-lg font-black text-white">{module.value}</div>
                  </div>
                  <div className="mt-4 text-base font-bold text-[#fff7e8]">{module.title}</div>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{module.detail}</p>
                </motion.div>
              )
            })}
          </div>

          <div className="space-y-4">
            <div className="premium-panel p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#f5d7a1]">Live Threat Feed</div>
                  <div className="mt-2 text-2xl font-black text-[#fff7e8]">Active defense tape</div>
                </div>
                <div className="rounded-full border border-red-500/30 bg-red-950/25 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-red-200">
                  Monitoring
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {threatFeed.length ? threatFeed.map(item => (
                  <div key={item.key} className="vault-stack rounded-xl border border-white/10 bg-black/35 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-mono text-xs text-[#f5d7a1]">LIVE</div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-200">{item.label}</div>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-gray-300">{item.event}</div>
                  </div>
                )) : (
                  <div className="vault-stack rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm leading-6 text-gray-400">
                    No live threat events are shown until a real scan or provider status returns.
                  </div>
                )}
              </div>
            </div>

            <div className="premium-panel p-5">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#f5d7a1]">Animated risk score</div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <div className="text-5xl font-black text-white">{hasMeasuredSignals ? Math.max(22, 92 - Math.round(liveTotal / 4)) : '--'}</div>
                  <div className="mt-2 text-sm text-gray-400">{hasMeasuredSignals ? 'Protection score after removals and vault evidence.' : 'Calculated after returned evidence is linked.'}</div>
                </div>
                <div className="risk-orbit">
                  <div className="risk-orbit__ring" />
                  <div className="risk-orbit__core">{hasMeasuredSignals ? liveCounts.breach : '--'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function LiveBrowserResults({
  statusData,
  result,
  liveScan,
  isAuthenticated,
}: {
  statusData?: ScanJob
  result?: ScanResult
  liveScan: LiveScanPreview | null
  isAuthenticated: boolean
}) {
  if (!liveScan) return null

  const progress = Math.max(0, Math.min(100, Math.round(statusData?.progress ?? (result ? 100 : 0))))
  const stage = result
    ? 'Results resolved in browser'
    : statusData?.current_stage ?? liveScan.saveStatus ?? 'Building live exposure map'
  const outputCounts = result ? countsFromScanResult(result) : liveScan.counts
  const outputTotal = result ? totalSourcesFromScanResult(result) : countExposureSources(outputCounts)

  return (
    <section id="live-results" className="border-y border-white/10 bg-[#050506]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">Real-time browser results</p>
              <h2 className="mt-2 text-3xl font-black text-white">{liveScan.subject}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                The scan stays on this page while the backend checks breaches, broker listings, honey-token hits, and compliance signals.
              </p>
            </div>
            <div className="rounded-lg border border-red-500/35 bg-red-950/25 px-4 py-3 text-right">
              <div className="text-2xl font-black text-red-200">{progress}%</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-100/70">{statusData?.status ?? liveScan.mode}</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-red-500 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
              <span>{stage}</span>
              {statusData?.estimated_seconds && <span>About {statusData.estimated_seconds}s remaining</span>}
            </div>
          </div>

          {result ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-4">
              <ResultColumn
                title="Breach signals"
                value={result.breaches.length}
                rows={result.breaches.slice(0, 4).map(item => ({
                  label: item.source,
                  detail: `${item.severity.toUpperCase()} - ${item.exposed_fields.join(', ')}`,
                }))}
                empty="No verified breach rows returned yet."
              />
              <ResultColumn
                title="Broker listings"
                value={result.broker_listings.length}
                rows={result.broker_listings.slice(0, 4).map(item => ({
                  label: item.broker_name,
                  detail: `${item.opt_out_status.replace(/_/g, ' ')} - ${item.fields_exposed.join(', ')}`,
                }))}
                empty="No broker listings returned yet."
              />
              <ResultColumn
                title="Compliance flags"
                value={result.compliance?.violations.length ?? 0}
                rows={(result.compliance?.violations ?? []).slice(0, 4).map(item => ({
                  label: item.regulation,
                  detail: `${item.article ?? 'Policy'} - ${item.description}`,
                }))}
                empty="Compliance analysis is pending."
              />
              <ResultColumn
                title="Sentinel hits"
                value={result.honey_token_hits.length}
                rows={result.honey_token_hits.slice(0, 4).map(item => ({
                  label: item.hit_source,
                  detail: `${item.token_type} token - ${new Date(item.hit_timestamp).toLocaleString()}`,
                }))}
                empty="No honey-token hits returned yet."
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {['Queued', 'Breach check', 'Broker scan', 'Compliance report'].map((label, index) => (
                <div key={label} className="rounded-lg border border-white/10 bg-black/45 p-4">
                  <div className={clsx('h-2 w-2 rounded-full', progress > index * 25 ? 'bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.8)]' : 'bg-white/20')} />
                  <div className="mt-3 text-sm font-bold text-white">{label}</div>
                  <div className="mt-1 text-xs text-gray-500">{progress > index * 25 ? 'Active' : 'Waiting'}</div>
                </div>
              ))}
            </div>
          )}

          <BrowserOutputTable liveScan={liveScan} counts={outputCounts} totalSources={outputTotal} result={result} isAuthenticated={isAuthenticated} />

          {result && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={`/scan/${result.scan_id}`} className="inline-flex items-center gap-2 rounded-lg border border-red-500/45 bg-red-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-red-500">
                Open full scan dashboard
                <ExternalLink className="h-4 w-4" />
              </Link>
              <a href="#command-center" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-sm font-bold text-gray-200 transition-colors hover:border-red-500/45 hover:text-white">
                Continue to command center
                <ArrowDownIcon />
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ResultColumn({
  title,
  value,
  rows,
  empty,
}: {
  title: string
  value: number
  rows: Array<{ label: string; detail: string }>
  empty: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/45 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-white">{title}</h3>
        <span className="font-mono text-xl font-black text-red-300">{value}</span>
      </div>
      <div className="mt-4 space-y-3">
        {rows.length ? rows.map(row => (
          <div key={`${row.label}-${row.detail}`} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <div className="truncate text-sm font-semibold text-gray-100">{row.label}</div>
            <div className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{row.detail}</div>
          </div>
        )) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-gray-500">{empty}</div>
        )}
      </div>
    </div>
  )
}

function BrowserOutputTable({
  liveScan,
  counts,
  totalSources,
  result,
  isAuthenticated,
}: {
  liveScan: LiveScanPreview
  counts: ExposureCounts
  totalSources: number
  result?: ScanResult
  isAuthenticated: boolean
}) {
  const [copied, setCopied] = useState(false)
  const rows = buildBrowserOutputRows(liveScan, counts, result)
  const providerStatus = result?.provider_status ?? []
  const providerFallback = providerStatus.filter(status => status.fallback_available)
  const copyOutput = async () => {
    await copyText(buildCaseFile(liveScan, counts, totalSources, result))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className="mt-6 rounded-xl border border-red-500/25 bg-red-950/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">In-browser output</div>
          <h3 className="mt-1 text-xl font-black text-white">Readable scan results before you leave the page</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-400">
            These rows come from backend evidence resolution: explicit source, captured finding, severity, and the next action. Login saves the same output to the vault.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copyOutput} className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-black/55 px-3 py-2 text-xs font-bold text-red-100 transition-colors hover:border-red-400">
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Copied output' : 'Copy output'}
          </button>
          {!isAuthenticated && (
            <Link to="/account" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/55 px-3 py-2 text-xs font-bold text-gray-200 transition-colors hover:border-red-500/45 hover:text-white">
              <Lock className="h-3.5 w-3.5" />
              Sign in / create vault
            </Link>
          )}
        </div>
      </div>

      {!!providerStatus.length && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {providerStatus.map(status => {
            const setup = getProviderSetup(status.provider)
            return (
            <div
              key={`${status.provider}-${status.status}`}
              className={clsx(
                'rounded-lg border px-4 py-3',
                status.status === 'completed'
                  ? 'border-emerald-500/25 bg-emerald-950/15 text-emerald-100/90'
                  : status.status === 'failed'
                    ? 'border-red-500/35 bg-red-950/20 text-red-100/90'
                    : 'border-amber-500/30 bg-amber-950/15 text-amber-100/90'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white">{status.label}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em]">
                  {status.status.replace(/_/g, ' ')}
                </div>
              </div>
              <p className="mt-2 text-sm leading-6">{status.message}</p>
              {status.status === 'unavailable' && setup?.requiredSettings.length ? (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {setup.requiredSettings.map(setting => (
                      <code key={`${status.provider}-${setting}`} className="rounded-md border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] text-white/80">
                        {setting}
                      </code>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <a
                      href={setup.setupHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/25 px-2.5 py-1 text-white/85 transition-colors hover:border-red-500/35 hover:text-white"
                    >
                      {setup.setupLabel}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {setup.docsHref ? (
                      <a
                        href={setup.docsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/25 px-2.5 py-1 text-white/70 transition-colors hover:border-white/20 hover:text-white"
                      >
                        {setup.docsLabel ?? 'Docs'}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            )
          })}
        </div>
      )}

      {!!providerFallback.length && result?.scan_id && (
        <div className="mt-4 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#f1c96b]">Operator fallback</div>
              <h4 className="mt-1 text-lg font-black text-white">If the API misses, we still bring the source into the vault</h4>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Vindica now tells you when a provider is unavailable or comes back empty. At that point we can search manually, capture the exact source URL, and attach that evidence to this same scan so it survives in the vault and the report pack.
              </p>
            </div>
            <Link
              to={`/scan/${result.scan_id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-[#d4af37]/35 bg-black/50 px-4 py-3 text-sm font-bold text-[#f4d889] transition-colors hover:border-[#d4af37]/55 hover:bg-black/65"
            >
              Open evidence capture
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
        <div className="hidden grid-cols-[1fr_1.35fr_0.65fr_0.8fr] gap-3 border-b border-white/10 bg-black/60 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500 md:grid">
          <span>Source</span>
          <span>Evidence returned</span>
          <span>Severity</span>
          <span>Action</span>
        </div>
        <div className="divide-y divide-white/10">
          {rows.length ? rows.map(row => (
            <div key={`${row.source}-${row.finding}-${row.capturedAt ?? 'uncaptured'}`} className="grid gap-2 bg-black/35 px-3 py-3 text-sm md:grid-cols-[1fr_1.35fr_0.65fr_0.8fr] md:gap-3">
              <div className="min-w-0">
                <div className="md:hidden text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Source</div>
                {row.sourceUrl ? (
                  <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-bold text-white hover:text-red-100">
                    <span className="truncate">{row.source}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-red-300" />
                  </a>
                ) : (
                  <div className="font-bold text-white">{row.source}</div>
                )}
                {row.capturedAt && (
                  <div className="mt-1 text-[11px] text-gray-500">{new Date(row.capturedAt).toLocaleString()}</div>
                )}
              </div>
              <div>
                <div className="md:hidden text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Evidence returned</div>
                <div className="leading-6 text-gray-300">{row.finding}</div>
              </div>
              <div>
                <div className="md:hidden text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Severity</div>
                <span className="rounded border border-red-500/30 bg-red-950/20 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-red-100">{row.severity}</span>
              </div>
              <div>
                <div className="md:hidden text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Action</div>
                <div className="text-xs font-bold text-red-200">{row.action}</div>
              </div>
            </div>
          )) : (
            <div className="bg-black/35 px-3 py-4 text-sm leading-6 text-gray-400">
              {result
                ? providerFallback.length
                  ? 'No provider-backed rows were returned yet. Use the operator fallback above to capture the source into this scan anyway.'
                  : 'No explicit evidence rows were returned for this scan yet.'
                : 'Waiting for backend evidence rows. As each provider resolves a source, it will appear here with its link and captured details.'}
            </div>
          )}
        </div>
      </div>
      {!isAuthenticated && (
        <AuthVaultPrompt
          compact
          className="mt-4"
          title="Privacy gets durable once the vault is active"
          body="These evidence rows are real, but they are only durable once attached to your account. Sign in or create your vault to keep source links, timestamps, reports, and removals private and recoverable."
          ctaLabel="Activate private vault"
        />
      )}
    </div>
  )
}

function ArrowDownIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3v12m0 0 5-5m-5 5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

function OperatorWorkbench({
  liveScan,
  liveCounts,
  liveTotal,
  statusData,
  result,
}: {
  liveScan: LiveScanPreview | null
  liveCounts: ExposureCounts
  liveTotal: number
  statusData?: ScanJob
  result?: ScanResult
}) {
  const [copiedCase, setCopiedCase] = useState(false)
  const hasMeasuredSignals = Boolean(result) || liveTotal > 0
  const confidence = hasMeasuredSignals ? operatorConfidence(liveScan?.subject ?? '', liveTotal) : null
  const severity = hasMeasuredSignals ? operatorSeverity(liveTotal, liveCounts.breach) : null
  const progress = Math.max(0, Math.min(100, Math.round(statusData?.progress ?? (result ? 100 : 0))))
  const pipeline = [
    { label: 'Normalize pivots', detail: 'Name, email, phone, handle', activeAt: 1 },
    { label: 'Link identity graph', detail: 'Broker, public-record, social nodes', activeAt: 18 },
    { label: 'Correlate breach signals', detail: 'Breach, paste, honey-token indicators', activeAt: 42 },
    { label: 'Build evidence packet', detail: 'Receipts, source groups, report notes', activeAt: 68 },
    { label: 'Queue removals', detail: 'Broker opt-outs and authority pathways', activeAt: 92 },
  ]
  const intelCards = [
    { label: 'Primary pivot', value: liveScan?.subject ?? 'Awaiting input', detail: liveScan ? formatScanKind(liveScan.kind) : 'Enter an identifier to start' },
    { label: 'Operator severity', value: severity ?? 'Awaiting result', detail: hasMeasuredSignals ? `${liveCounts.breach} breach signals / ${liveCounts.brokers} broker targets` : 'Set after returned evidence is linked' },
    { label: 'Identity confidence', value: confidence !== null ? `${confidence}%` : 'Awaiting result', detail: hasMeasuredSignals ? 'Estimated from linked source groups' : 'Requires returned evidence groups' },
    { label: 'Next best action', value: liveScan?.scanId ? 'Open report' : liveScan ? 'Log in to save' : 'Run scan', detail: liveScan?.scanId ? 'Full scan dashboard is ready' : 'Vault saves evidence and removals' },
  ]

  const copyCaseFile = async () => {
    await copyText(buildCaseFile(liveScan, liveCounts, liveTotal, result))
    setCopiedCase(true)
    window.setTimeout(() => setCopiedCase(false), 1400)
  }

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-black/45 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">Operator workbench</div>
          <h3 className="mt-2 text-2xl font-black text-white">Authorized OSINT case mode</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Treat every scan like a case file: pivot the identifiers, preserve evidence, queue removals, and keep the trail saved to the vault when logged in.
          </p>
        </div>
        <button
          type="button"
          onClick={copyCaseFile}
          className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/25 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/35"
        >
          <ClipboardCheck className="h-4 w-4" />
          {copiedCase ? 'Copied case file' : 'Copy case file'}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {intelCards.map(card => (
          <div key={card.label} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{card.label}</div>
            <div className="mt-2 truncate text-lg font-black text-white">{card.value}</div>
            <p className="mt-1 text-xs leading-5 text-gray-500">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-black/45 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-bold text-white">Live scan pipeline</div>
          <div className="font-mono text-xs font-bold text-red-200">{progress}%</div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-red-500 transition-all duration-500" style={{ width: progress > 0 ? `${Math.max(6, progress)}%` : '0%' }} />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-5">
          {pipeline.map(step => {
            const complete = progress >= step.activeAt
            const active = progress > 0 && progress < step.activeAt + 24 && progress >= step.activeAt - 20
            return (
              <div key={step.label} className={clsx('rounded-lg border p-3', complete ? 'border-red-500/35 bg-red-950/20' : active ? 'border-red-500/25 bg-white/[0.04]' : 'border-white/10 bg-white/[0.02]')}>
                <div className="flex items-center gap-2">
                  <span className={clsx('h-2 w-2 rounded-full', complete ? 'bg-red-400 shadow-[0_0_16px_rgba(248,113,113,0.8)]' : active ? 'bg-red-900' : 'bg-white/20')} />
                  <div className="text-xs font-bold text-white">{step.label}</div>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-gray-500">{step.detail}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-red-500/25 bg-red-950/15 p-4 text-xs leading-5 text-red-100/85">
        Authorized use only: Vindica organizes public-source privacy exposure, user-provided evidence, removals, and reports. It does not perform credential access, exploitation, harassment, or unauthorized intrusion.
      </div>
    </div>
  )
}

function CommandActionResults() {
  const [actions, setActions] = useState<CommandAction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadActions = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.command.list()
      setActions(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load saved command actions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadActions()
  }, [])

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-black/45 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">Deployed results ledger</h3>
          <p className="mt-1 text-sm text-gray-500">Saved command-center outputs pulled back from the backend.</p>
        </div>
        <button type="button" onClick={() => void loadActions()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/25 px-3 py-2 text-xs font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/35 disabled:opacity-70">
          <RefreshCw className={clsx('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/35 bg-red-950/25 px-3 py-2 text-xs leading-5 text-red-100">
          {authRequired(error) ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Log in to view saved scans, reports, receipts, and command actions.</span>
              <Link to="/account" className="font-bold text-white underline decoration-red-300/60 underline-offset-4">
                Open login
              </Link>
            </div>
          ) : error}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {actions.slice(0, 5).map(action => (
          <div key={action.id} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-3 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white">{action.title}</span>
                <span className="rounded border border-red-500/30 bg-red-950/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-red-200">{action.feature}</span>
              </div>
              <div className="mt-1 font-mono text-[11px] text-gray-500">{action.id}</div>
            </div>
            <div className="self-center rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-gray-300">
              {action.status}
            </div>
          </div>
        ))}
        {!actions.length && !error && (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-4 text-sm leading-6 text-gray-500">
            Saved feature outputs will appear here after you use Save OSINT results, Save tracker, Save report, Save receipt, or Save removal queue.
          </div>
        )}
      </div>
    </div>
  )
}

function FullDataMap({ liveScan }: { liveScan: LiveScanPreview | null }) {
  const counts = liveScan?.counts ?? DEFAULT_EXPOSURE_COUNTS
  const total = countExposureSources(counts)
  const hasMeasuredSignals = total > 0
  const mapSignals = [
    { label: 'People search', value: counts.people, icon: UserSearch },
    { label: 'Broker sites', value: counts.brokers, icon: Database },
    { label: 'Public records', value: counts.records, icon: Gavel },
    { label: 'Social profiles', value: counts.social, icon: Network },
    { label: 'Breach data', value: counts.breach, icon: ShieldAlert },
    { label: 'Ad networks', value: counts.ads, icon: Link2 },
  ]

  return (
    <section id="data-map" className="border-b border-white/10 bg-black">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-red-300">In-house exposure graph</p>
            <h2 className="mt-2 text-3xl font-black text-white">{liveScan ? `${liveScan.subject} Data Map` : 'Full Data Map'}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
              {hasMeasuredSignals && liveScan
                ? `Real-time results stay on this page: ${total} linked sources are grouped into broker, breach, public-record, social, and removal pathways.`
                : 'The map stays on the page. It only populates source counts after a real scan returns evidence.'}
            </p>
          </div>
          <a href="#command-center" className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/25 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/35">
            <Map className="h-4 w-4" />
            Open command center
          </a>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="glass-panel overflow-hidden rounded-xl">
            <ExposureGraph
              focused
              subject={liveScan?.subject}
              mode={liveScan?.mode ?? 'idle'}
              signalCounts={counts}
              totalSources={total}
              className="min-h-[640px]"
            />
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
                  <div className="text-3xl font-black text-red-400">{hasMeasuredSignals ? value : '--'}</div>
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

function ScanSelfCenter({
  scanFields,
  setScanFields,
  runStructuredScan,
  queryError,
  liveScan,
  liveCounts,
  liveTotal,
  isPending,
}: {
  scanFields: ScanFields
  setScanFields: (fields: ScanFields) => void
  runStructuredScan: (event: FormEvent) => void
  queryError: string
  liveScan: LiveScanPreview | null
  liveCounts: ExposureCounts
  liveTotal: number
  isPending: boolean
}) {
  const update = (field: keyof ScanFields, value: string) => setScanFields({ ...scanFields, [field]: value })

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 lg:grid-cols-[390px_1fr]">
      <aside className="glass-panel rounded-xl p-5">
        <div className="flex items-start gap-3 border-b border-white/10 pb-4">
          <div className="rounded-full border border-red-500/40 bg-red-950/25 p-3 text-red-300">
            <ScanLine className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold">Scan Yourself</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">Editable identity fields feed the backend scan and the live exposure graph.</p>
          </div>
        </div>

        <form onSubmit={runStructuredScan} className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Full name</span>
            <input
              value={scanFields.full_name}
              onChange={event => update('full_name', event.target.value)}
              placeholder="Full legal name"
              className="input-field font-mono text-xs"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Email</span>
              <input
                type="email"
                value={scanFields.email}
                onChange={event => update('email', event.target.value)}
                placeholder="you@example.com"
                className="input-field font-mono text-xs"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Phone</span>
              <input
                value={scanFields.phone}
                onChange={event => update('phone', event.target.value)}
                placeholder="+1 555 123 4567"
                className="input-field font-mono text-xs"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">IP address</span>
            <input
              value={scanFields.ip_address}
              onChange={event => update('ip_address', event.target.value)}
              placeholder="8.8.8.8 or IPv6"
              className="input-field font-mono text-xs"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Username / handle</span>
            <input
              value={scanFields.username}
              onChange={event => update('username', event.target.value)}
              placeholder="publichandle"
              className="input-field font-mono text-xs"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Notify email</span>
            <input
              type="email"
              value={scanFields.notify_email}
              onChange={event => update('notify_email', event.target.value)}
              placeholder="where to send completion notice"
              className="input-field font-mono text-xs"
            />
          </label>
          <button type="submit" disabled={isPending} className="red-button-glow inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-70">
            {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Run scan and get results
          </button>
          {queryError && <p className="text-sm leading-6 text-red-300">{queryError}</p>}
        </form>

        <div className="mt-4 rounded-lg border border-white/10 bg-black/45 p-4">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-4 w-4 text-red-300" />
            <div>
              <div className="text-sm font-bold text-white">Login keeps your results saved</div>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Run a live scan instantly, then sign in to attach full reports, removals, and evidence receipts to your private vault.
              </p>
              <Link to="/account" className="mt-2 inline-flex text-xs font-bold text-red-200 transition-colors hover:text-white">
                Save future scans
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <DashboardMetric label="Sources" value={`${liveTotal}`} sub="linked results" />
          <DashboardMetric label="Broker queue" value={`${liveCounts.brokers}`} sub="opt-out targets" />
        </div>

        {liveScan?.scanId && (
          <Link to={`/scan/${liveScan.scanId}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-950/25 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/35">
            Open scan report and opt-outs
            <ExternalLink className="h-4 w-4" />
          </Link>
        )}
      </aside>

      <section className="space-y-4">
        <div className="glass-panel overflow-hidden rounded-xl">
          <ExposureGraph
            focused
            subject={liveScan?.subject}
            mode={liveScan?.mode ?? 'idle'}
            signalCounts={liveCounts}
            totalSources={liveTotal}
            className="min-h-[620px]"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {LIVE_SOURCE_ROWS.map(row => (
            <div key={row.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-3xl font-black text-red-400">{liveCounts[row.id]}</div>
              <div className="mt-2 font-bold text-white">{row.label}</div>
              <p className="mt-1 text-xs leading-5 text-gray-500">{row.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  )
}

type OsintKind = 'username' | 'phone' | 'domain' | 'ip' | 'unsupported'

function detectOsintKind(value: string): OsintKind {
  const trimmed = value.trim()
  if (!trimmed) return 'unsupported'
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(trimmed) || (trimmed.includes(':') && /^[a-f0-9:]+$/i.test(trimmed))) return 'ip'
  if (/^[+\d\s().-]{7,}$/.test(trimmed)) return 'phone'
  if (/^(?!.*@)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(trimmed)) return 'domain'
  if (!trimmed.includes('@') && !trimmed.includes(' ')) return 'username'
  return 'unsupported'
}

function OSINTToolsPanel() {
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [activeKind, setActiveKind] = useState<OsintKind>('unsupported')
  const [usernameResults, setUsernameResults] = useState<UsernamePlatformResult[]>([])
  const [phoneResult, setPhoneResult] = useState<PhoneLookupResult | null>(null)
  const [domainResult, setDomainResult] = useState<DomainLookupResult | null>(null)
  const [domainIntel, setDomainIntel] = useState<DomainIntelResult | null>(null)
  const [ipResult, setIpResult] = useState<IpLookupResult | null>(null)
  const [activePlaybookId, setActivePlaybookId] = useState<typeof OSINT_SKILL_PLAYBOOKS[number]['id']>(OSINT_SKILL_PLAYBOOKS[0].id)
  const [playbookCopied, setPlaybookCopied] = useState(false)
  const trimmed = query.trim()
  const activePlaybook = OSINT_SKILL_PLAYBOOKS.find(playbook => playbook.id === activePlaybookId) ?? OSINT_SKILL_PLAYBOOKS[0]

  const playbookPacket = () => [
    'VINDICA OSINT SKILL PLAYBOOK',
    `Playbook: ${activePlaybook.title}`,
    `Mode: ${activePlaybook.mode}`,
    `Current lookup: ${trimmed || 'not set'}`,
    '',
    'Inputs:',
    ...activePlaybook.inputs.map(item => `- ${item}`),
    '',
    'Steps:',
    ...activePlaybook.steps.map((step, index) => `${index + 1}. ${step}`),
    '',
    'Commands / app actions:',
    ...activePlaybook.commands.map(command => `- ${command}`),
    '',
    `Caution: ${activePlaybook.caution}`,
  ].join('\n')

  const copyPacket = async () => {
    if (!trimmed) return
    await copyText([
      'VINDICA OSINT LOOKUP PACKET',
      `Lookup term: ${trimmed}`,
      `Detected mode: ${activeKind}`,
      '',
      ...OSINT_TOOLS.map(tool => `- ${tool.name} (${tool.type}): ${tool.url}`),
      '',
      'Use only for yourself, your accounts, or authorized safety work.',
    ].join('\n'))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  const runLookup = async () => {
    if (!trimmed) {
      setLookupError('Enter a username, phone number, IP, or domain to run in-app OSINT.')
      return
    }

    const kind = detectOsintKind(trimmed)
    setActiveKind(kind)
    setLookupError(null)
    setUsernameResults([])
    setPhoneResult(null)
    setDomainResult(null)
    setDomainIntel(null)
    setIpResult(null)

    if (kind === 'unsupported') {
      setLookupError('This OSINT workspace now handles username, phone, IP, and domain intel. Use Find Yourself for email or full-name evidence scans.')
      return
    }

    setLoading(true)
    try {
      if (kind === 'username') {
        setUsernameResults(await api.lookup.username(trimmed))
      } else if (kind === 'phone') {
        setPhoneResult(await api.lookup.phone(trimmed))
      } else if (kind === 'ip') {
        setIpResult(await api.lookup.ip(trimmed))
      } else if (kind === 'domain') {
        const [rdap, intel] = await Promise.all([
          api.lookup.domain(trimmed),
          api.lookup.domainIntel(trimmed),
        ])
        setDomainResult(rdap)
        setDomainIntel(intel)
      }
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Could not run the in-app OSINT lookup.')
    } finally {
      setLoading(false)
    }
  }

  const saveLookup = async () => {
    if (!trimmed) {
      setSaveError('Enter a lookup term before saving results.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const action = await api.command.create({
        feature: 'osint',
        title: `OSINT lookup: ${trimmed}`,
        status: 'ready',
        payload: {
          query: trimmed,
          kind: activeKind,
          username_results: usernameResults,
          phone_result: phoneResult,
          ip_result: ipResult,
          domain_result: domainResult,
          domain_intel: domainIntel,
          tools: OSINT_TOOLS.map(tool => ({
            name: tool.name,
            type: tool.type,
            url: tool.url,
            query: tool.query,
            note: tool.note,
          })),
        },
      })
      setSavedId(action.id)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save OSINT action.')
    } finally {
      setSaving(false)
    }
  }

  const copyPlaybook = async () => {
    await copyText(playbookPacket())
    setPlaybookCopied(true)
    window.setTimeout(() => setPlaybookCopied(false), 1400)
  }

  const savePlaybook = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const action = await api.command.create({
        feature: 'osint',
        title: `OSINT playbook: ${activePlaybook.title}`,
        status: 'ready',
        payload: {
          query: trimmed || null,
          kind: activeKind,
          playbook: activePlaybook,
          source: 'shannon-skill-adapted',
          safety_note: 'This is a passive/authorized workflow checklist. Vindica does not launch exploit automation from the browser.',
        },
      })
      setSavedId(action.id)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save OSINT playbook.')
    } finally {
      setSaving(false)
    }
  }

  const hasInAppResult = Boolean(usernameResults.length || phoneResult || ipResult || domainResult || domainIntel)
  const groupedUsernameResults = usernameResults.reduce<Record<string, UsernamePlatformResult[]>>((groups, item) => {
    groups[item.category] ||= []
    groups[item.category].push(item)
    return groups
  }, {})
  const domainSetup = {
    virustotal: getProviderSetup('virustotal'),
    shodan: getProviderSetup('shodan'),
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 lg:grid-cols-[390px_1fr]">
      <aside className="glass-panel rounded-xl p-5">
        <div className="flex items-start gap-3 border-b border-white/10 pb-4">
          <div className="rounded-full border border-red-500/40 bg-red-950/25 p-3 text-red-300">
            <Network className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold">OSINT Tools</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">Free in-app username probe, phone parsing, IP context, and domain recon. Use Find Yourself for full evidence scans.</p>
          </div>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Lookup term</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="username, phone, IP, or domain" className="input-field font-mono text-xs" />
        </label>
        <button type="button" onClick={runLookup} disabled={loading} className="red-button-glow mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-70">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Run in-app intel
        </button>
        <button type="button" onClick={copyPacket} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/55 px-4 py-3 text-sm font-bold text-gray-200 transition-colors hover:border-red-500/45 hover:text-white">
          <Copy className="h-4 w-4" />
          {copied ? 'Copied lookup packet' : 'Copy lookup packet'}
        </button>
        <button type="button" onClick={saveLookup} disabled={saving} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-950/25 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/35 disabled:opacity-70">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          Save OSINT results
        </button>
        <ActionReceipt id={savedId} error={saveError} />

        <div className="mt-4 rounded-lg border border-red-500/25 bg-red-950/10 p-3 text-xs leading-5 text-red-100/80">
          This workspace now pulls direct data into the app where we have safe, useful providers. External portals stay secondary.
        </div>
      </aside>

      <section className="space-y-5">
        <div className="glass-panel rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">In-app OSINT workspace</h3>
              <p className="mt-1 text-sm text-gray-500">
                {trimmed
                  ? `Detected mode: ${activeKind.replace(/_/g, ' ')}. Run free in-app reconnaissance first, then use secondary portals only when needed.`
                  : 'Enter a username, phone, IP, or domain to run the free in-app lanes from the handoff.'}
              </p>
            </div>
            <span className="rounded-full border border-red-500/30 bg-red-950/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-200">
              {loading ? 'running' : hasInAppResult ? 'results ready' : 'standby'}
            </span>
          </div>

          {lookupError && (
            <div className="mt-4 rounded-xl border border-red-500/35 bg-red-950/25 px-4 py-3 text-sm text-red-100">
              {lookupError}
            </div>
          )}

          {!hasInAppResult && !lookupError && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/45 px-4 py-4 text-sm leading-6 text-gray-400">
              This lane now handles direct <span className="font-semibold text-white">username probes</span>, <span className="font-semibold text-white">phone parsing</span>, <span className="font-semibold text-white">IP enrichment</span>, and <span className="font-semibold text-white">domain intel</span>. Use Find Yourself when the subject is an email or full name and you want source-backed evidence rows.
            </div>
          )}

          {activeKind === 'username' && !!usernameResults.length && (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ['Found', usernameResults.filter(item => item.status === 'found').length],
                  ['Protected', usernameResults.filter(item => item.status === 'protected').length],
                  ['Not found', usernameResults.filter(item => item.status === 'not_found').length],
                  ['Errors', usernameResults.filter(item => item.status === 'error').length],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-black/45 p-3">
                    <div className="text-2xl font-black text-red-300">{value}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {Object.entries(groupedUsernameResults).map(([category, items]) => (
                  <div key={category} className="rounded-xl border border-white/10 bg-black/45 p-4">
                    <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-red-300">{category}</div>
                    <div className="space-y-2">
                      {items.map(item => (
                        <div key={`${category}-${item.name}`} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-white">{item.name}</div>
                            <div className="truncate text-xs text-gray-500">{item.url}</div>
                          </div>
                          <span className={clsx(
                            'rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em]',
                            item.status === 'found'
                              ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'
                              : item.status === 'protected'
                                ? 'border-amber-500/30 bg-amber-950/20 text-amber-200'
                                : item.status === 'not_found'
                                  ? 'border-white/10 bg-black/45 text-gray-400'
                                  : 'border-red-500/30 bg-red-950/20 text-red-200'
                          )}>
                            {item.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeKind === 'phone' && phoneResult && (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                ['E.164', phoneResult.e164],
                ['International', phoneResult.international],
                ['National', phoneResult.national],
                ['Country', phoneResult.country || 'Unknown'],
                ['Carrier', phoneResult.carrier || 'Unknown'],
                ['Line type', phoneResult.line_type],
                ['Region', phoneResult.region_code || 'Unknown'],
                ['Valid', phoneResult.valid ? 'Yes' : 'No'],
                ['Possible', phoneResult.possible ? 'Yes' : 'No'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-black/45 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{label}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{value}</div>
                </div>
              ))}
              <div className="rounded-xl border border-white/10 bg-black/45 p-4 md:col-span-2 xl:col-span-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Time zones</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {phoneResult.timezones.length
                    ? phoneResult.timezones.map(zone => (
                        <span key={zone} className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-gray-200">
                          {zone}
                        </span>
                      ))
                    : <span className="text-sm text-gray-500">No timezone hints returned.</span>}
                </div>
              </div>
            </div>
          )}

          {activeKind === 'ip' && ipResult && (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                ['IP', ipResult.ip],
                ['Country', ipResult.country || 'Unknown'],
                ['Continent', ipResult.continent || 'Unknown'],
                ['ASN', ipResult.asn || 'Unknown'],
                ['Organization', ipResult.as_name || 'Unknown'],
                ['Domain', ipResult.as_domain || 'Unknown'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-black/45 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{label}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{value}</div>
                </div>
              ))}
              <a
                href={ipResult.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/35 bg-red-950/20 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/30"
              >
                Open {ipResult.source_name}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {activeKind === 'domain' && (
            <div className="mt-5 space-y-4">
              {domainResult && (
                <div className="rounded-xl border border-white/10 bg-black/45 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">RDAP summary</div>
                      <div className="mt-1 text-lg font-bold text-white">{domainResult.domain}</div>
                    </div>
                    {domainResult.error ? (
                      <span className="rounded-full border border-red-500/30 bg-red-950/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-red-200">lookup failed</span>
                    ) : null}
                  </div>
                  {domainResult.error ? (
                    <p className="mt-3 text-sm text-red-200">{domainResult.error}</p>
                  ) : (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        ['Registrar', domainResult.registrar || 'Unknown'],
                        ['Created', domainResult.created || 'Unknown'],
                        ['Expires', domainResult.expires || 'Unknown'],
                        ['Statuses', domainResult.status.join(', ') || 'Unknown'],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{label}</div>
                          <div className="mt-2 text-sm font-semibold text-white">{value}</div>
                        </div>
                      ))}
                      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 md:col-span-2 xl:col-span-4">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">Name servers</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {domainResult.nameservers.length
                            ? domainResult.nameservers.map(name => (
                                <span key={name} className="rounded-md border border-white/10 bg-black/35 px-2.5 py-1 text-xs text-gray-200">
                                  {name}
                                </span>
                              ))
                            : <span className="text-sm text-gray-500">No nameservers returned.</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {domainIntel && (
                <div className="grid gap-4 xl:grid-cols-2">
                  {domainIntel.virustotal ? (
                    <div className="rounded-xl border border-white/10 bg-black/45 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">VirusTotal</div>
                          <div className="mt-1 font-semibold text-white">Threat analysis</div>
                        </div>
                        <span className={clsx(
                          'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]',
                          domainIntel.virustotal.malicious > 0
                            ? 'border-red-500/30 bg-red-950/20 text-red-200'
                            : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'
                        )}>
                          {domainIntel.virustotal.malicious > 0 ? `${domainIntel.virustotal.malicious} malicious` : 'clean'}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {[
                          ['Malicious', domainIntel.virustotal.malicious],
                          ['Suspicious', domainIntel.virustotal.suspicious],
                          ['Harmless', domainIntel.virustotal.harmless],
                          ['Undetected', domainIntel.virustotal.undetected],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
                            <div className="text-2xl font-black text-red-300">{value}</div>
                            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {Object.values(domainIntel.virustotal.categories).length
                          ? Object.values(domainIntel.virustotal.categories).map(category => (
                              <span key={category} className="rounded-md border border-white/10 bg-black/35 px-2.5 py-1 text-xs text-gray-200">
                                {category}
                              </span>
                            ))
                          : <span className="text-sm text-gray-500">No categories returned.</span>}
                      </div>
                    </div>
                  ) : !domainIntel.available.virustotal && domainSetup.virustotal ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-amber-100">
                      <div className="font-semibold text-white">VirusTotal setup still needed</div>
                      <p className="mt-1 text-sm leading-6 text-amber-100/85">{domainSetup.virustotal.hint}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {domainSetup.virustotal.requiredSettings.map(setting => (
                          <code key={setting} className="rounded-md border border-amber-500/25 bg-black/35 px-2.5 py-1 text-xs text-amber-100">
                            {setting}
                          </code>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <a href={domainSetup.virustotal.setupHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-black/35 px-2.5 py-1 text-amber-100 transition-colors hover:border-amber-400/45 hover:text-white">
                          {domainSetup.virustotal.setupLabel}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        {domainSetup.virustotal.docsHref ? (
                          <a href={domainSetup.virustotal.docsHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/35 px-2.5 py-1 text-white/75 transition-colors hover:border-white/20 hover:text-white">
                            {domainSetup.virustotal.docsLabel ?? 'Docs'}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {domainIntel.shodan ? (
                    <div className="rounded-xl border border-white/10 bg-black/45 p-4">
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">Shodan</div>
                      <div className="mt-1 font-semibold text-white">{domainIntel.shodan.ip} · {domainIntel.shodan.country || 'Unknown country'}</div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {[
                          ['Org', domainIntel.shodan.org || 'Unknown'],
                          ['ISP', domainIntel.shodan.isp || 'Unknown'],
                          ['OS', domainIntel.shodan.os || 'Unknown'],
                          ['Ports', domainIntel.shodan.ports.join(', ') || 'None'],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{label}</div>
                            <div className="mt-2 text-sm font-semibold text-white">{value}</div>
                          </div>
                        ))}
                      </div>
                      {!!domainIntel.shodan.vulns.length && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {domainIntel.shodan.vulns.map(vuln => (
                            <span key={vuln} className="rounded-md border border-red-500/25 bg-red-950/20 px-2.5 py-1 text-xs text-red-100">
                              {vuln}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : !domainIntel.available.shodan && domainSetup.shodan ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-amber-100">
                      <div className="font-semibold text-white">Shodan setup still needed</div>
                      <p className="mt-1 text-sm leading-6 text-amber-100/85">{domainSetup.shodan.hint}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {domainSetup.shodan.requiredSettings.map(setting => (
                          <code key={setting} className="rounded-md border border-amber-500/25 bg-black/35 px-2.5 py-1 text-xs text-amber-100">
                            {setting}
                          </code>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <a href={domainSetup.shodan.setupHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-black/35 px-2.5 py-1 text-amber-100 transition-colors hover:border-amber-400/45 hover:text-white">
                          {domainSetup.shodan.setupLabel}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        {domainSetup.shodan.docsHref ? (
                          <a href={domainSetup.shodan.docsHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/35 px-2.5 py-1 text-white/75 transition-colors hover:border-white/20 hover:text-white">
                            {domainSetup.shodan.docsLabel ?? 'Docs'}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-white/10 bg-black/45 p-4 xl:col-span-2">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">URLScan.io</div>
                    <div className="mt-1 font-semibold text-white">Recent scans pulled directly into the app</div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {domainIntel.urlscan.length ? domainIntel.urlscan.map(scan => (
                        <div key={`${scan.url}-${scan.scan_date}`} className={clsx(
                          'rounded-lg border p-3',
                          scan.malicious ? 'border-red-500/25 bg-red-950/15' : 'border-white/10 bg-white/[0.03]'
                        )}>
                          <div className="flex gap-3">
                            {scan.screenshot ? (
                              <img src={scan.screenshot} alt="" className="h-12 w-16 rounded border border-white/10 object-cover" />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-white">{scan.title || scan.url}</div>
                              <div className="truncate text-xs text-gray-500">{scan.url}</div>
                              <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] text-gray-500">
                                {scan.country ? <span>{scan.country}</span> : null}
                                {scan.ip ? <span>{scan.ip}</span> : null}
                                {scan.scan_date ? <span>{scan.scan_date.slice(0, 10)}</span> : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      )) : (
                        <div className="text-sm text-gray-500">No recent URLScan entries returned for this domain.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">Skill Playbooks</h3>
              <p className="mt-1 text-sm text-gray-500">Shannon-style OSINT workflow guidance, adapted into safe in-app checklists and saved case packets.</p>
            </div>
            <span className="rounded-full border border-red-500/30 bg-red-950/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-200">
              workaround
            </span>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {OSINT_SKILL_PLAYBOOKS.map(playbook => (
              <button
                key={playbook.id}
                type="button"
                onClick={() => setActivePlaybookId(playbook.id)}
                className={clsx(
                  'rounded-xl border p-4 text-left transition-colors',
                  playbook.id === activePlaybook.id
                    ? 'border-red-500/50 bg-red-950/20'
                    : 'border-white/10 bg-black/45 hover:border-red-500/35'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{playbook.title}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-red-300">{playbook.mode}</div>
                  </div>
                  {playbook.id === activePlaybook.id ? <Check className="h-4 w-4 text-red-300" /> : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-500">{playbook.summary}</p>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
            <div className="rounded-xl border border-white/10 bg-black/45 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">{activePlaybook.title}</div>
              <ol className="mt-4 space-y-3">
                {activePlaybook.steps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm leading-6 text-gray-300">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-950/20 text-xs font-black text-red-200">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-950/15 p-3 text-xs leading-5 text-amber-100/85">
                {activePlaybook.caution}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/45 p-4">
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Inputs</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {activePlaybook.inputs.map(input => (
                  <span key={input} className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-gray-200">
                    {input}
                  </span>
                ))}
              </div>

              <div className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Actions</div>
              <div className="mt-3 space-y-2">
                {activePlaybook.commands.map(command => (
                  <code key={command} className="block rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-300">
                    {command}
                  </code>
                ))}
              </div>

              <button type="button" onClick={copyPlaybook} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/55 px-4 py-3 text-sm font-bold text-gray-200 transition-colors hover:border-red-500/45 hover:text-white">
                <Copy className="h-4 w-4" />
                {playbookCopied ? 'Copied playbook' : 'Copy playbook'}
              </button>
              <button type="button" onClick={savePlaybook} disabled={saving} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-950/25 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/35 disabled:opacity-70">
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                Save playbook
              </button>
              <ActionReceipt id={savedId} error={saveError} />
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">Secondary portals</h3>
              <p className="mt-1 text-sm text-gray-500">{trimmed ? `Use "${trimmed}" in these only when you need extra corroboration.` : 'These remain useful follow-up portals, not the primary experience.'}</p>
            </div>
            <span className="rounded-full border border-red-500/30 bg-red-950/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-200">
              {OSINT_TOOLS.length} portals
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {OSINT_TOOLS.map(tool => {
              const href = buildOsintToolHref(tool, trimmed)
              return (
                <a key={tool.name} href={href} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/10 bg-black/45 p-4 transition-colors hover:border-red-500/50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">{tool.name}</div>
                      <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-red-300">{tool.type}</div>
                    </div>
                    <ExternalLink className="h-4 w-4 shrink-0 text-red-400" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-500">{tool.note}</p>
                  <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-xs text-gray-400">
                    {trimmed ? `Open with: ${trimmed}` : `Input: ${tool.query}`}
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      </section>
    </motion.div>
  )
}

function BrokerDatabasePanel({
  completed,
  copied,
  copyRemovalRequest,
  toggle,
}: {
  completed: Record<string, boolean>
  copied: string | null
  copyRemovalRequest: (brokerName: string) => Promise<void>
  toggle: (id: string) => void
}) {
  const [filter, setFilter] = useState('')
  const visible = DATA_BROKERS.filter(broker => {
    const haystack = `${broker.name} ${broker.priority} ${broker.note}`.toLowerCase()
    return haystack.includes(filter.toLowerCase())
  })

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="glass-panel rounded-xl p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div>
            <h2 className="text-3xl font-bold">Data Broker Database</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">People-search, background, address, and public-record brokers with opt-out portals and reusable removal packets.</p>
          </div>
          <label>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Filter brokers</span>
            <input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Spokeo, critical, address..." className="input-field font-mono text-xs" />
          </label>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((broker, index) => {
          const done = completed[`broker-${index}`]
          return (
            <article key={broker.name} className={clsx('rounded-xl border p-4', done ? 'border-red-500/30 bg-red-950/15' : 'border-white/10 bg-white/[0.03]')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{broker.name}</h3>
                    <span className={clsx('rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em]', PRIORITY_STYLES[broker.priority])}>
                      {broker.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-gray-500">{broker.note}</p>
                </div>
                <button type="button" onClick={() => toggle(`broker-${index}`)} className={clsx('grid h-9 w-9 place-items-center rounded-lg border', done ? 'border-red-400 bg-red-500 text-white' : 'border-white/20 text-transparent hover:text-white')} aria-label={done ? `Mark ${broker.name} incomplete` : `Mark ${broker.name} submitted`}>
                  <Check className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => void copyRemovalRequest(broker.name)} className="rounded-lg border border-red-500/35 bg-red-950/30 px-3 py-2 text-xs font-bold text-red-100">
                  {copied === broker.name ? 'Copied' : 'Copy removal'}
                </button>
                <a href={broker.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/55 px-3 py-2 text-xs font-bold text-gray-200">
                  Open opt-out
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </article>
          )
        })}
      </div>
    </motion.div>
  )
}

function PlatformReporterCenter({
  incident,
  setIncident,
  copyReport,
  copied,
}: {
  incident: IncidentDraft
  setIncident: (incident: IncidentDraft) => void
  copyReport: () => void
  copied: string | null
}) {
  const update = (field: keyof IncidentDraft, value: string) => setIncident({ ...incident, [field]: value })
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const savePlatformPacket = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const action = await api.command.create({
        feature: 'platform-reporter',
        title: incident.platforms.trim() ? `Platform report: ${incident.platforms}` : 'Platform report packet',
        status: 'ready',
        payload: {
          incident,
          portals: PLATFORM_REPORTS,
          packet: buildIncidentPacket(incident),
        },
      })
      setSavedId(action.id)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save platform report.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 lg:grid-cols-[390px_1fr]">
      <aside className="glass-panel rounded-xl p-5">
        <div className="flex items-start gap-3 border-b border-white/10 pb-4">
          <div className="rounded-full border border-red-500/40 bg-red-950/25 p-3 text-red-300">
            <Siren className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold">Platform Reporter</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">Turn URLs, handles, screenshots, and timeline into platform-ready reports.</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Platforms involved" value={incident.platforms} onChange={value => update('platforms', value)} />
          <Field label="Accounts / identifiers" value={incident.accounts} onChange={value => update('accounts', value)} multiline />
          <Field label="Content URLs" value={incident.urls} onChange={value => update('urls', value)} multiline />
          <Field label="Timeline" value={incident.timeline} onChange={value => update('timeline', value)} multiline />
        </div>
        <button type="button" onClick={copyReport} className="red-button-glow mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-bold text-white">
          <Copy className="h-4 w-4" />
          {copied === 'incident-report' ? 'Copied platform packet' : 'Copy platform packet'}
        </button>
        <button type="button" onClick={savePlatformPacket} disabled={saving} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-950/25 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/35 disabled:opacity-70">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          Save platform report
        </button>
        <ActionReceipt id={savedId} error={saveError} />
      </aside>

      <section className="glass-panel rounded-xl p-5">
        <h3 className="font-bold">Report portals</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {PLATFORM_REPORTS.map(report => (
            <a key={report.name} href={report.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/10 bg-black/45 p-4 transition-colors hover:border-red-500/50">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{report.name}</span>
                <ExternalLink className="h-4 w-4 text-red-400" />
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-500">{report.note}</p>
            </a>
          ))}
        </div>
      </section>
    </motion.div>
  )
}

function EmailBlastCenter({
  incident,
  reportPacket,
  copied,
  markCopied,
}: {
  incident: IncidentDraft
  reportPacket: string
  copied: string | null
  markCopied: (id: string) => void
}) {
  const [recipients, setRecipients] = useState(EMAIL_BLAST_RECIPIENTS.join('\n'))
  const [subject, setSubject] = useState('Urgent privacy and safety takedown request')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const blast = [
    `Subject: ${subject}`,
    '',
    'Recipients:',
    recipients,
    '',
    'Message:',
    'Hello,',
    '',
    'I am requesting urgent review, preservation, and removal action for a privacy and safety incident involving my personal data or content.',
    '',
    reportPacket,
    '',
    'Please confirm receipt, provide a ticket or report number, and preserve relevant records.',
  ].join('\n')

  const copyBlast = async () => {
    await copyText(blast)
    markCopied('email-blast')
  }

  const saveBlast = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const action = await api.command.create({
        feature: 'email-blast',
        title: subject,
        status: 'ready',
        payload: {
          subject,
          recipients: recipients.split('\n').map(value => value.trim()).filter(Boolean),
          incidentType: incident.incidentType,
          body: blast,
        },
      })
      setSavedId(action.id)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save email blast.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 lg:grid-cols-[390px_1fr]">
      <aside className="glass-panel rounded-xl p-5">
        <div className="flex items-start gap-3 border-b border-white/10 pb-4">
          <div className="rounded-full border border-red-500/40 bg-red-950/25 p-3 text-red-300">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold">Email Blast</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">One packet for brokers, platforms, advocates, and authority contacts.</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Subject" value={subject} onChange={setSubject} />
          <Field label="Recipient groups" value={recipients} onChange={setRecipients} multiline />
        </div>
        <button type="button" onClick={copyBlast} className="red-button-glow mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 font-bold text-white">
          <Copy className="h-4 w-4" />
          {copied === 'email-blast' ? 'Copied blast packet' : 'Copy blast packet'}
        </button>
        <button type="button" onClick={saveBlast} disabled={saving} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-950/25 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/35 disabled:opacity-70">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          Save blast packet
        </button>
        <ActionReceipt id={savedId} error={saveError} />
      </aside>

      <section className="glass-panel rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold">Blast packet ready</h3>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">{incident.incidentType}</span>
        </div>
        <pre className="mt-4 max-h-[560px] overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/60 p-4 font-mono text-xs leading-5 text-gray-300">
          {blast}
        </pre>
      </section>
    </motion.div>
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
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const saveTracker = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const action = await api.command.create({
        feature: 'actor-tracker',
        title: tracker.actorLabel.trim() ? `Actor tracker: ${tracker.actorLabel}` : 'Actor evidence tracker',
        status: 'active',
        payload: {
          tracker,
          packet: actorPacket,
        },
      })
      setSavedId(action.id)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save actor tracker.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div id="track-him" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 scroll-mt-24 lg:grid-cols-[390px_1fr]">
      <aside className="glass-panel rounded-xl p-5">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <Target className="h-6 w-6 text-red-300" />
          <div>
            <h2 className="font-bold">Authorized Tracker</h2>
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
        <button type="button" onClick={saveTracker} disabled={saving} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-950/25 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/35 disabled:opacity-70">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          Save tracker
        </button>
        <ActionReceipt id={savedId} error={saveError} />
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
          <h3 className="font-bold">Tracker packet ready</h3>
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
  liveScan,
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
  liveScan: LiveScanPreview | null
}) {
  const update = (field: keyof RemovalProfile, value: string) => setProfile({ ...profile, [field]: value })
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [queueStatus, setQueueStatus] = useState<string | null>(null)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [queueing, setQueueing] = useState(false)

  const saveRemovalQueue = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const action = await api.command.create({
        feature: 'removal',
        title: profile.fullName.trim() ? `Removal queue: ${profile.fullName}` : 'Removal queue',
        status: 'ready',
        payload: {
          profile,
          brokers: DATA_BROKERS.map((broker, index) => ({
            ...broker,
            completed: Boolean(completed[`broker-${index}`]),
          })),
          liveScanId: liveScan?.scanId ?? null,
        },
      })
      setSavedId(action.id)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save removal queue.')
    } finally {
      setSaving(false)
    }
  }

  const queueRealOptOuts = async () => {
    if (!liveScan?.scanId) {
      setQueueError('Run Scan Yourself first, then queue one-stop opt-outs from the saved scan report.')
      return
    }
    setQueueing(true)
    setQueueError(null)
    setQueueStatus(null)
    try {
      const result = await api.optOut.initiateAll(liveScan.scanId)
      setQueueStatus(`${result.queued} broker opt-outs queued. ${result.message}`)
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : 'Could not queue opt-outs.')
    } finally {
      setQueueing(false)
    }
  }

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
        <button type="button" onClick={saveRemovalQueue} disabled={saving} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-950/25 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/35 disabled:opacity-70">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          Save removal queue
        </button>
        <button type="button" onClick={queueRealOptOuts} disabled={queueing} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-black/55 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/35 disabled:opacity-70">
          {queueing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
          Queue real one-stop opt-outs
        </button>
        <ActionReceipt id={savedId} error={saveError ?? queueError} />
        {queueStatus && (
          <div className="mt-3 rounded-lg border border-red-500/25 bg-red-950/15 px-3 py-2 text-xs leading-5 text-red-100/85">
            {queueStatus}
          </div>
        )}
        <p className="mt-3 text-xs leading-5 text-gray-500">
          Saved queues stay in your account. Real delivery requires backend opt-out email configuration to be enabled.
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
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const saveHashReceipt = async () => {
    if (!hashReceipt) {
      setSaveError('Create a hash receipt before saving.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const action = await api.command.create({
        feature: 'fingerprint',
        title: `Hash receipt: ${hashReceipt.caseId}`,
        status: 'preserved',
        payload: hashReceipt,
      })
      setSavedId(action.id)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save hash receipt.')
    } finally {
      setSaving(false)
    }
  }

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
              Select a private image or video you already have. The browser creates a SHA-256 fingerprint locally. This tool does not upload the raw file.
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
            <button type="button" onClick={saveHashReceipt} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-950/25 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/35 disabled:opacity-70">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              Save receipt
            </button>
            <ActionReceipt id={savedId} error={saveError} />
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
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const saveAuthorityReport = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const action = await api.command.create({
        feature: 'authority-report',
        title: `Authority report: ${incident.incidentType}`,
        status: 'ready',
        payload: {
          incident,
          legalSignals: LEGAL_SIGNALS,
          platformReports: PLATFORM_REPORTS,
          packet: reportPacket,
        },
      })
      setSavedId(action.id)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save authority report.')
    } finally {
      setSaving(false)
    }
  }

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
        <button type="button" onClick={saveAuthorityReport} disabled={saving} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-950/25 px-4 py-3 text-sm font-bold text-red-100 transition-colors hover:border-red-400 hover:bg-red-900/35 disabled:opacity-70">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          Save authority report
        </button>
        <ActionReceipt id={savedId} error={saveError} />
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
          <h3 className="font-bold">Authority packet ready</h3>
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
