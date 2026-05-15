import type { ExposureCategoryId, ExposureGraphMode } from '@/components/visuals/ExposureGraph'

export const DEFAULT_REMOVAL_PROFILE = {
  fullName: '',
  email: '',
  phone: '',
  cityState: '',
  addressHistory: '',
  profileUrls: '',
  extraNotes: '',
}

export type RemovalProfile = typeof DEFAULT_REMOVAL_PROFILE

export const DEFAULT_INCIDENT = {
  incidentType: 'Doxxing / stalking / non-consensual intimate image threat',
  platforms: '',
  accounts: '',
  urls: '',
  timeline: '',
  evidence: '',
  impact: '',
}

export type IncidentDraft = typeof DEFAULT_INCIDENT

export const DEFAULT_ACTOR_TRACKER = {
  actorLabel: '',
  knownAccounts: '',
  knownEmails: '',
  knownPhones: '',
  incidentUrls: '',
  timeline: '',
  evidenceNotes: '',
  reportNumbers: '',
}

export type ActorTrackerDraft = typeof DEFAULT_ACTOR_TRACKER

export const DEFAULT_SCAN_FIELDS = {
  full_name: '',
  email: '',
  phone: '',
  username: '',
  notify_email: '',
}

export type ScanFields = typeof DEFAULT_SCAN_FIELDS

export type HomeSection =
  | 'overview'
  | 'scanSelf'
  | 'lookup'
  | 'osint'
  | 'track'
  | 'removal'
  | 'brokers'
  | 'image'
  | 'fingerprint'
  | 'platform'
  | 'email'
  | 'reports'
  | 'support'

export type ScanInputKind = 'name' | 'email' | 'phone' | 'username'

export type ExposureCounts = Record<ExposureCategoryId, number>

export type LiveScanPreview = {
  subject: string
  kind: ScanInputKind
  mode: Extract<ExposureGraphMode, 'scanning' | 'resolved'>
  counts: ExposureCounts
  startedAt: string
  scanId?: string
  saveStatus?: string
}

export const DEFAULT_EXPOSURE_COUNTS: ExposureCounts = {
  people: 23,
  brokers: 47,
  records: 12,
  ads: 89,
  breach: 6,
  social: 19,
}
