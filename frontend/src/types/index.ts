export type ScanStatus = 'idle' | 'queued' | 'scanning' | 'completed' | 'failed'

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface ScanRequest {
  email?: string
  phone?: string
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

export interface ScanResult {
  scan_id: string
  status: ScanStatus
  created_at: string
  completed_at?: string
  query: ScanRequest
  breaches: BreachRecord[]
  broker_listings: BrokerListing[]
  honey_token_hits: HoneyTokenHit[]
  compliance: ComplianceScore | null
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
