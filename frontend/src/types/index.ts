export type ScanStatus = 'idle' | 'queued' | 'scanning' | 'completed' | 'failed'

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface ScanRequest {
  email?: string
  phone?: string
  ip_address?: string
  username?: string
  full_name?: string
  notify_email?: string
}

export interface BreachRecord {
  id: string
  source: string
  source_type: 'breach_db' | 'data_broker' | 'dark_web' | 'paste_site'
  breach_date?: string
  discovered_date: string
  severity: SeverityLevel
  exposed_fields: string[]
  record_count?: number
  description: string
  verified: boolean
  sample_data?: Record<string, string>
}

export interface BrokerListing {
  id: string
  broker_name: string
  broker_url: string
  listing_url?: string
  fields_exposed: string[]
  opt_out_url?: string
  opt_out_status: 'not_started' | 'in_progress' | 'submitted' | 'confirmed' | 'failed'
  opt_out_deadline_days?: number
  dsar_eligible: boolean
  last_seen: string
}

export interface HoneyTokenHit {
  id: string
  token_id: string
  token_type: 'email' | 'phone' | 'name' | 'address' | 'username'
  hit_source: string
  hit_timestamp: string
  context_snippet?: string
}

export interface ComplianceScore {
  overall: number
  gdpr_score: number
  ccpa_score: number
  risk_level: SeverityLevel
  violations: ComplianceViolation[]
  recommendations: string[]
}

export interface ComplianceViolation {
  regulation: 'GDPR' | 'CCPA' | 'PIPEDA' | 'LGPD' | 'FTC' | 'NCII' | 'CYBERSTALKING' | string
  article?: string
  description: string
  severity: SeverityLevel
  broker_name?: string
}

export interface EvidenceItem {
  id: string
  kind: 'breach' | 'broker_listing' | 'honey_token' | 'ip_enrichment' | 'search_result' | 'manual_capture'
  title: string
  source_name: string
  source_category: string
  source_url: string
  detail: string
  risk_level: SeverityLevel
  confidence: string
  captured_at: string
  exposed_fields: string[]
  action_label: string
}

export interface ProviderStatus {
  provider: string
  label: string
  status: 'completed' | 'failed' | 'no_match' | 'unavailable' | 'skipped'
  message: string
  fallback_available: boolean
  item_count: number
}

export interface ManualEvidenceRequest {
  title: string
  source_name: string
  source_url: string
  detail: string
  risk_level?: SeverityLevel
  source_category?: string
  confidence?: string
  captured_at?: string
  exposed_fields?: string[]
  action_label?: string
}

export interface ScanResult {
  scan_id: string
  status: ScanStatus
  created_at: string
  completed_at?: string
  query: ScanRequest
  vault_saved: boolean
  breaches: BreachRecord[]
  broker_listings: BrokerListing[]
  honey_token_hits: HoneyTokenHit[]
  compliance: ComplianceScore | null
  evidence_items: EvidenceItem[]
  provider_status: ProviderStatus[]
  report_url?: string
  total_exposures: number
  risk_score: number
}

export interface ScanJob {
  scan_id: string
  status: ScanStatus
  progress: number
  current_stage: string
  estimated_seconds?: number
  created_at: string
  vault_saved: boolean
  subject?: string | null
  subject_kind?: string | null
  total_exposures: number
  risk_score: number
}

export interface DsarRequest {
  id: string
  scan_id: string
  broker_listing_id: string
  broker_name: string
  status: 'draft' | 'queued' | 'sent' | 'acknowledged' | 'fulfilled' | 'denied' | 'overdue' | 'failed'
  sent_at?: string
  deadline_at?: string
  response?: string
}

export interface ReportPackage {
  scan_id: string
  generated_at: string
  download_url: string
  format: 'pdf' | 'json' | 'csv'
  includes_dsar: boolean
  includes_compliance: boolean
  expires_at: string
}

export interface ReportJob {
  action_id: string
  scan_id: string
  status: 'queued' | 'running' | 'completed' | 'failed' | string
  format: 'pdf' | 'json' | 'csv' | string
  generated_at?: string
  download_url?: string
  includes_dsar?: boolean
  includes_compliance?: boolean
  expires_at?: string
  error?: string
}

export interface IpLookupResult {
  ip: string
  network?: string | null
  asn?: string | null
  as_name?: string | null
  as_domain?: string | null
  country_code?: string | null
  country?: string | null
  continent_code?: string | null
  continent?: string | null
  is_anycast: boolean
  is_bogon: boolean
  source_name: string
  source_url: string
}

export interface UsernamePlatformResult {
  name: string
  category: string
  url: string
  status: 'found' | 'not_found' | 'protected' | 'error'
}

export interface PhoneLookupResult {
  input: string
  e164: string
  international: string
  national: string
  country_code: number
  region_code?: string | null
  country: string
  carrier: string
  line_type: string
  timezones: string[]
  valid: boolean
  possible: boolean
}

export interface DomainLookupResult {
  domain: string
  registrar?: string | null
  created?: string | null
  expires?: string | null
  nameservers: string[]
  status: string[]
  error?: string | null
}

export interface DomainIntelVirusTotalResult {
  malicious: number
  suspicious: number
  harmless: number
  undetected: number
  reputation: number
  categories: Record<string, string>
  total_votes: Record<string, number>
  registrar: string
  creation_date?: number | null
  last_analysis_date?: number | null
  tags: string[]
}

export interface DomainIntelUrlscanResult {
  url: string
  title: string
  ip: string
  country: string
  screenshot: string
  scan_date: string
  malicious: boolean
  score: number
  tags: string[]
}

export interface DomainIntelShodanService {
  port?: number | null
  product: string
  version: string
  banner: string
}

export interface DomainIntelShodanResult {
  ip: string
  org: string
  isp: string
  country: string
  os?: string | null
  ports: number[]
  hostnames: string[]
  vulns: string[]
  services: DomainIntelShodanService[]
}

export interface DomainIntelResult {
  domain: string
  virustotal?: DomainIntelVirusTotalResult | null
  urlscan: DomainIntelUrlscanResult[]
  shodan?: DomainIntelShodanResult | null
  available: {
    virustotal: boolean
    shodan: boolean
  }
}

export interface ImageAnalysisTag {
  name: string
  confidence: number
}

export interface ImageAnalysisCategory {
  name: string
  score: number
}

export interface ImageAnalysisObjectBox {
  x: number
  y: number
  w: number
  h: number
}

export interface ImageAnalysisObject {
  name: string
  confidence: number
  box: ImageAnalysisObjectBox
}

export type ImageAnalysisProviderName =
  | 'azure_computer_vision'
  | 'google_cloud_vision'
  | 'huggingface_inference'

export interface ImageAnalysisProviderResult {
  provider: ImageAnalysisProviderName
  status: 'completed' | 'failed' | 'unavailable' | 'no_match'
  summary: string
  required_settings: string[]
  caption?: string | null
  confidence?: number | null
  tags: ImageAnalysisTag[]
  categories: ImageAnalysisCategory[]
  objects: ImageAnalysisObject[]
  adult_score?: number | null
  racy_score?: number | null
  provider_url?: string | null
  width?: number | null
  height?: number | null
  format?: string | null
}

export interface ImageAnalysisResult {
  provider: 'multi_provider'
  status: 'completed' | 'failed' | 'unavailable' | 'no_match'
  summary: string
  required_settings: string[]
  caption?: string | null
  confidence?: number | null
  tags: ImageAnalysisTag[]
  categories: ImageAnalysisCategory[]
  objects: ImageAnalysisObject[]
  adult_score?: number | null
  racy_score?: number | null
  provider_url?: string | null
  width?: number | null
  height?: number | null
  format?: string | null
  provider_results: ImageAnalysisProviderResult[]
  attempted_providers: ImageAnalysisProviderName[]
  completed_providers: ImageAnalysisProviderName[]
}

export interface CommandAction {
  id: string
  user_id?: string | null
  feature: string
  title: string
  status: string
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CommandActionRequest {
  feature: string
  title: string
  status?: string
  payload?: Record<string, unknown>
}
