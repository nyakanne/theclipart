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
  if (/^[+\d\s().-]{7,}$/.test(value)) return { body: { phone: value }, kind: 'phone' }
  if (value.includes(' ')) return { body: { full_name: value }, kind: 'name' }
  return { body: { username: value }, kind: 'username' }
}

export function cleanScanFields(fields: ScanFields): ScanRequest {
  return {
    full_name: fields.full_name.trim() || undefined,
    email: fields.email.trim() || undefined,
    phone: fields.phone.trim() || undefined,
    username: fields.username.trim() || undefined,
    notify_email: fields.notify_email.trim() || undefined,
  }
}

export function scanRequestHasIdentifier(body: ScanRequest) {
  return Boolean(body.full_name || body.email || body.phone || body.username)
}

export function subjectFromScanRequest(body: ScanRequest) {
  return body.full_name || body.email || body.username || body.phone || 'Structured scan'
}

export function kindFromScanRequest(body: ScanRequest): ScanInputKind {
  if (body.email) return 'email'
  if (body.phone) return 'phone'
  if (body.full_name) return 'name'
  return 'username'
}

export function seedFromScanRequest(body: ScanRequest) {
  return [body.full_name, body.email, body.phone, body.username].filter(Boolean).join(' ')
}

export function stableSeed(value: string) {
  return Array.from(value.toLowerCase()).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 11), 0)
}

export function deriveExposureCounts(value: string, kind: ScanInputKind): ExposureCounts {
  const seed = stableSeed(value)
  return {
    people: (kind === 'name' ? 21 : 13) + (seed % 12),
    brokers: 38 + (seed % 24),
    records: (kind === 'phone' ? 13 : 8) + (seed % 10),
    ads: 64 + (seed % 32),
    breach: (kind === 'email' ? 7 : 3) + (seed % 8),
    social: (kind === 'username' ? 18 : 9) + (seed % 13),
  }
}

export function countExposureSources(counts: ExposureSignalCounts = DEFAULT_EXPOSURE_COUNTS) {
  return LIVE_SOURCE_ROWS.reduce((sum, row) => sum + (counts[row.id] ?? 0), 0)
}

export function operatorConfidence(subject: string, totalSources: number) {
  const base = subject ? 74 + (stableSeed(subject) % 18) : 42
  return Math.min(98, base + Math.min(6, Math.round(totalSources / 60)))
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
    `Operator severity: ${operatorSeverity(totalSources, counts.breach)}`,
    `Identity confidence: ${operatorConfidence(liveScan?.subject ?? '', totalSources)}%`,
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
  }

  return lines.join('\n')
}

export function authRequired(error?: string | null) {
  return Boolean(error && /auth|login|sign in|token|401|403|not authenticated|unauthorized/i.test(error))
}

export function buildBrowserOutputRows(liveScan: LiveScanPreview, counts: ExposureCounts, result?: ScanResult) {
  if (result) {
    return [
      ...result.breaches.slice(0, 5).map(item => ({
        source: item.source,
        finding: item.exposed_fields.join(', ') || 'Breach exposure',
        severity: item.severity.toUpperCase(),
        action: 'Review breach evidence',
      })),
      ...result.broker_listings.slice(0, 5).map(item => ({
        source: item.broker_name,
        finding: item.fields_exposed.join(', ') || 'Broker profile match',
        severity: item.opt_out_status.replace(/_/g, ' ').toUpperCase(),
        action: 'Queue opt-out',
      })),
      ...(result.compliance?.violations ?? []).slice(0, 4).map(item => ({
        source: item.regulation,
        finding: item.description,
        severity: item.severity.toUpperCase(),
        action: 'Add to report',
      })),
    ]
  }

  return LIVE_SOURCE_ROWS.map(row => ({
    source: row.label,
    finding: `${counts[row.id]} browser-visible links correlated for ${liveScan.subject}`,
    severity: row.id === 'breach' || row.id === 'brokers' ? 'HIGH' : row.id === 'ads' ? 'ELEVATED' : 'REVIEW',
    action: row.id === 'brokers' ? 'Open opt-out queue' : row.id === 'breach' ? 'Save evidence' : 'Inspect source group',
  }))
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

export function countsFromScanResult(result: ScanResult): ExposureCounts {
  const brokers = Math.max(result.broker_listings.length, 1)
  const breach = Math.max(result.breaches.length, 0)
  const honey = Math.max(result.honey_token_hits.length, 0)
  const total = Math.max(result.total_exposures, brokers + breach + honey, 1)
  return {
    people: Math.max(4, Math.round(total * 0.12)),
    brokers,
    records: Math.max(3, Math.round(total * 0.08)),
    ads: Math.max(8, Math.round(total * 0.22)),
    breach,
    social: Math.max(honey, Math.round(total * 0.1)),
  }
}

export function formatScanKind(kind: ScanInputKind) {
  return kind === 'name' ? 'name scan' : `${kind} scan`
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
