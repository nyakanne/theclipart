import type { ExposureSignalCounts } from '@/components/visuals/ExposureGraph'
import type { ScanRequest, ScanResult } from '@/types'

import {
  DATA_BROKERS,
  LEGAL_SIGNALS,
  LIVE_SOURCE_ROWS,
  OSINT_TOOLS,
} from './data'
import type {
  ActorTrackerDraft,
  ExposureCounts,
  IncidentDraft,
  LiveScanPreview,
  RemovalProfile,
  ScanFields,
  ScanInputKind,
} from './types'
import { DEFAULT_EXPOSURE_COUNTS } from './types'

export function parseScanInput(value: string): { body: ScanRequest; kind: ScanInputKind } {
  if (value.includes('@')) return { body: { email: value }, kind: 'email' }
  if (isIpAddress(value)) return { body: { ip_address: value }, kind: 'ip' }
  if (/^[+\d\s().-]{7,}$/.test(value)) return { body: { phone: value }, kind: 'phone' }
  if (value.includes(' ')) return { body: { full_name: value }, kind: 'name' }
  return { body: { username: value }, kind: 'username' }
}

function isIpAddress(value: string) {
  const trimmed = value.trim()
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(trimmed) || (trimmed.includes(':') && /^[a-f0-9:]+$/i.test(trimmed))
}

export function cleanScanFields(fields: ScanFields): ScanRequest {
  return {
    full_name: fields.full_name.trim() || undefined,
    email: fields.email.trim() || undefined,
    phone: fields.phone.trim() || undefined,
    ip_address: fields.ip_address.trim() || undefined,
    username: fields.username.trim() || undefined,
    notify_email: fields.notify_email.trim() || undefined,
  }
}

export function scanRequestHasIdentifier(body: ScanRequest) {
  return Boolean(body.full_name || body.email || body.phone || body.ip_address || body.username)
}

export function subjectFromScanRequest(body: ScanRequest) {
  return body.full_name || body.email || body.username || body.phone || body.ip_address || 'Structured scan'
}

export function kindFromScanRequest(body: ScanRequest): ScanInputKind {
  if (body.email) return 'email'
  if (body.phone) return 'phone'
  if (body.ip_address) return 'ip'
  if (body.full_name) return 'name'
  return 'username'
}

export function countExposureSources(counts: ExposureSignalCounts = DEFAULT_EXPOSURE_COUNTS) {
  return LIVE_SOURCE_ROWS.reduce((sum, row) => sum + (counts[row.id] ?? 0), 0)
}

export function operatorConfidence(_subject: string, totalSources: number) {
  if (totalSources <= 0) return 0
  if (totalSources <= 5) return 34
  if (totalSources <= 15) return 52
  if (totalSources <= 40) return 68
  if (totalSources <= 80) return 82
  return 92
}

export function operatorSeverity(totalSources: number, breachSignals: number) {
  if (breachSignals >= 8 || totalSources >= 190) return 'Critical'
  if (breachSignals >= 4 || totalSources >= 120) return 'High'
  if (totalSources >= 60) return 'Elevated'
  return 'Watching'
}

export function buildCaseFile(liveScan: LiveScanPreview | null, counts: ExposureCounts, totalSources: number, result?: ScanResult) {
  const subject = liveScan?.subject ?? 'No active subject'
  const lines = [
    'VINDICA AUTHORIZED OSINT CASE FILE',
    `Subject: ${subject}`,
    `Mode: ${liveScan ? formatScanKind(liveScan.kind) : 'waiting'}`,
    `Started: ${liveScan?.startedAt ?? 'not started'}`,
    `Scan ID: ${liveScan?.scanId ?? 'not saved'}`,
    `Total linked sources: ${totalSources}`,
    `Operator severity: ${totalSources > 0 ? operatorSeverity(totalSources, counts.breach) : 'Awaiting result'}`,
    `Identity confidence: ${totalSources > 0 ? `${operatorConfidence(liveScan?.subject ?? '', totalSources)}%` : 'Awaiting result'}`,
    '',
    'Signal groups:',
    ...LIVE_SOURCE_ROWS.map(row => `- ${row.label}: ${counts[row.id]} (${row.detail})`),
    '',
    'Next actions:',
    '- Save the vault by signing in before collecting long-running results.',
    '- Open broker removals and queue opt-outs for confirmed people-search listings.',
    '- Preserve URLs/screenshots in the evidence receipt tool before submitting reports.',
    '- Use only for yourself, your accounts, or authorized safety work.',
  ]

  if (result) {
    lines.push(
      '',
      'Backend result summary:',
      `- Breach rows: ${result.breaches.length}`,
      `- Broker listings: ${result.broker_listings.length}`,
      `- Honey-token hits: ${result.honey_token_hits.length}`,
      `- Risk score: ${result.risk_score}`,
    )
    if (result.provider_status.length) {
      lines.push(
        '',
        'Provider status:',
        ...result.provider_status.map(status =>
          `- ${status.label}: ${status.status.toUpperCase()} | ${status.message}`
        ),
      )
    }
    if (result.evidence_items.length) {
      lines.push(
        '',
        'Explicit evidence rows:',
        ...result.evidence_items.slice(0, 12).map(item =>
          `- [${item.risk_level.toUpperCase()}] ${item.title} | ${item.source_name} | ${item.detail} | ${item.source_url}`
        ),
      )
    }
  }

  return lines.join('\n')
}

export function authRequired(error?: string | null) {
  return Boolean(error && /auth|login|sign in|token|401|403|not authenticated|unauthorized/i.test(error))
}

export type BrowserOutputRow = {
  source: string
  finding: string
  severity: string
  action: string
  sourceUrl?: string
  capturedAt?: string
}

export function buildBrowserOutputRows(_liveScan: LiveScanPreview, _counts: ExposureCounts, result?: ScanResult): BrowserOutputRow[] {
  if (result) {
    const evidenceRows = result.evidence_items.slice(0, 12).map(item => ({
      source: item.source_name,
      finding: item.detail,
      severity: item.risk_level.toUpperCase(),
      action: item.action_label,
      sourceUrl: item.source_url,
      capturedAt: item.captured_at,
    }))

    if (evidenceRows.length) return evidenceRows

    return [
      ...result.breaches.slice(0, 5).map(item => ({
        source: item.source,
        finding: item.description || item.exposed_fields.join(', ') || 'Breach exposure',
        severity: item.severity.toUpperCase(),
        action: 'Review breach evidence',
      })),
      ...result.broker_listings.slice(0, 5).map(item => ({
        source: item.broker_name,
        finding: item.fields_exposed.join(', ') || 'Broker profile match',
        severity: item.opt_out_status.replace(/_/g, ' ').toUpperCase(),
        action: 'Open listing',
        sourceUrl: item.listing_url || item.broker_url,
        capturedAt: item.last_seen,
      })),
    ]
  }

  return []
}

export function buildOsintToolHref(tool: typeof OSINT_TOOLS[number], term: string) {
  if (!term) return tool.url
  const encoded = encodeURIComponent(term)
  if (tool.name === 'Have I Been Pwned') return `https://haveibeenpwned.com/account/${encoded}`
  if (tool.name === 'Firefox Monitor') return `https://monitor.mozilla.org/user/breach-scan/?email=${encoded}`
  if (tool.name === 'WhatsMyName') return `https://whatsmyname.app/?q=${encoded}`
  if (tool.name === 'IPinfo') return `https://ipinfo.io/${encoded}`
  if (tool.name === 'MXToolbox') return `https://mxtoolbox.com/SuperTool.aspx?action=mx%3A${encoded}&run=toolpage`
  return tool.url
}

function hostnameFromUrl(url?: string) {
  if (!url) return ''
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

function normalizedBrokerKeys() {
  return DATA_BROKERS.map(broker => broker.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
}

function looksLikeBroker(item: ScanResult['evidence_items'][number]) {
  const normalizedName = item.source_name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const host = hostnameFromUrl(item.source_url).replace(/[^a-z0-9]/g, '')
  return normalizedBrokerKeys().some(key => normalizedName.includes(key) || host.includes(key))
}

function hasAnyField(fields: string[], matches: string[]) {
  return matches.some(match => fields.includes(match))
}

export function totalSourcesFromScanResult(result: ScanResult) {
  return Math.max(
    result.total_exposures,
    result.evidence_items.length,
    result.breaches.length + result.broker_listings.length + result.honey_token_hits.length,
  )
}

export function countsFromScanResult(result: ScanResult): ExposureCounts {
  const counts: ExposureCounts = { ...DEFAULT_EXPOSURE_COUNTS }
  const evidenceItems = result.evidence_items

  if (evidenceItems.length > 0) {
    for (const item of evidenceItems) {
      const fields = item.exposed_fields.map(field => field.toLowerCase())
      const category = item.source_category.toLowerCase()
      const hostname = hostnameFromUrl(item.source_url)

      if (item.kind === 'breach' || category.includes('breach') || hasAnyField(fields, ['password', 'credential'])) {
        counts.breach += 1
      }

      if (item.kind === 'broker_listing' || category === 'data_broker' || looksLikeBroker(item)) {
        counts.brokers += 1
      }

      if (
        item.kind === 'ip_enrichment'
        || category === 'ip_enrichment'
        || hasAnyField(fields, ['ip', 'asn', 'country', 'continent'])
      ) {
        counts.records += 1
      }

      if (
        category === 'public_web'
        || category === 'manual_capture'
        || hasAnyField(fields, ['name', 'email', 'phone', 'address', 'username'])
      ) {
        counts.people += 1
      }

      if (
        item.kind === 'honey_token'
        || category === 'honey_token'
        || hasAnyField(fields, ['username', 'profile', 'avatar'])
        || /(instagram|facebook|tiktok|discord|x|twitter|linkedin|reddit|youtube|github)/.test(hostname)
      ) {
        counts.social += 1
      }

      if (
        category.includes('ad')
        || hasAnyField(fields, ['advertising_id', 'device_id', 'cookie', 'audience'])
      ) {
        counts.ads += 1
      }

      if (
        category.includes('record')
        || hasAnyField(fields, ['address', 'property', 'court', 'voter'])
      ) {
        counts.records += 1
      }
    }

    return counts
  }

  counts.brokers = result.broker_listings.length
  counts.breach = result.breaches.length
  counts.social = result.honey_token_hits.length
  return counts
}

export function formatScanKind(kind: ScanInputKind) {
  return kind === 'name' ? 'name scan' : kind === 'ip' ? 'ip scan' : `${kind} scan`
}

export async function copyText(text: string) {
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

export function buildRemovalRequest(brokerName: string, profile: RemovalProfile) {
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

export function buildIncidentPacket(incident: IncidentDraft) {
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

export function buildActorPacket(tracker: ActorTrackerDraft) {
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

export function countCompletedBrokerRequests(completed: Record<string, boolean>) {
  return DATA_BROKERS.filter((_, index) => completed[`broker-${index}`]).length
}
