import axios from 'axios'
import type {
  ScanRequest, ScanJob, ScanResult, DsarRequest, ReportJob, CommandAction, CommandActionRequest, IpLookupResult, EvidenceItem, ManualEvidenceRequest, ImageAnalysisResult, UsernamePlatformResult, PhoneLookupResult, DomainLookupResult, DomainIntelResult
} from '@/types'
import { getSupabaseAccessToken } from '@/services/supabase'

const http = axios.create({
  baseURL: '/api/v1',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.response.use(
  r => r,
  err => {
    const status = err.response?.status
    const detail = err.response?.data?.detail
    const msg = detail
      ?? (status === 500
        ? 'Vindica API is unavailable right now. The scan worker or backend service is not reachable.'
        : err.message)
      ?? 'Unknown error'
    return Promise.reject(new Error(msg))
  }
)

http.interceptors.request.use(async config => {
  const token = await getSupabaseAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const api = {
  scan: {
    create: (body: ScanRequest) =>
      http.post<ScanJob>('/scans', body).then(r => r.data),

    status: (id: string) =>
      http.get<ScanJob>(`/scans/${id}/status`).then(r => r.data),

    result: (id: string) =>
      http.get<ScanResult>(`/scans/${id}`).then(r => r.data),

    captureManualEvidence: (id: string, body: ManualEvidenceRequest) =>
      http.post<EvidenceItem>(`/scans/${id}/manual-evidence`, body).then(r => r.data),

    list: () =>
      http.get<ScanJob[]>('/scans').then(r => r.data),

    deleteAll: () =>
      http.delete<{ deleted: number; actions_deleted: number; status: string }>('/scans').then(r => r.data),
  },

  dsar: {
    list: (scanId: string) =>
      http.get<DsarRequest[]>(`/scans/${scanId}/dsar`).then(r => r.data),

    send: (scanId: string, brokerId: string) =>
      http.post<DsarRequest>(`/scans/${scanId}/dsar/${brokerId}/send`, { confirmed: true }).then(r => r.data),

    sendAll: (scanId: string) =>
      http.post<{ queued: number; skipped: number; status: string; message: string }>(`/scans/${scanId}/dsar/send-all`, { confirmed: true }).then(r => r.data),
  },

  report: {
    generate: (scanId: string, format: 'pdf' | 'json' | 'csv' = 'pdf') =>
      http.post<ReportJob>(`/scans/${scanId}/report`, { format }).then(r => r.data),

    status: (scanId: string, actionId: string) =>
      http.get<ReportJob>(`/scans/${scanId}/report/${actionId}`).then(r => r.data),
  },

  optOut: {
    readiness: (scanId: string) =>
      http.get<{ enabled: boolean; delivery_provider: string; from_address_configured: boolean; eligible_broker_ids: string[]; eligible_count: number; unavailable_count: number; message: string }>(`/scans/${scanId}/opt-out/readiness`).then(r => r.data),

    initiate: (scanId: string, brokerId: string) =>
      http.post(`/scans/${scanId}/opt-out/${brokerId}`, { confirmed: true }).then(r => r.data),

    initiateAll: (scanId: string) =>
      http.post<{ queued: number; skipped: number; status: string; message: string }>(`/scans/${scanId}/opt-out/all`, { confirmed: true }).then(r => r.data),
  },

  lookup: {
    username: (value: string) =>
      http.get<UsernamePlatformResult[]>(`/lookups/username/${encodeURIComponent(value)}`).then(r => r.data),

    ip: (value: string) =>
      http.get<IpLookupResult>(`/lookups/ip/${encodeURIComponent(value)}`).then(r => r.data),

    phone: (value: string) =>
      http.get<PhoneLookupResult>(`/lookups/phone/${encodeURIComponent(value)}`).then(r => r.data),

    domain: (value: string) =>
      http.get<DomainLookupResult>(`/lookups/domain/${encodeURIComponent(value)}`).then(r => r.data),

    domainIntel: (value: string) =>
      http.get<DomainIntelResult>(`/lookups/domain-intel/${encodeURIComponent(value)}`).then(r => r.data),

    imageUrl: (imageUrl: string) =>
      http.post<ImageAnalysisResult>('/lookups/image/url', { image_url: imageUrl }).then(r => r.data),

    imageUpload: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return http.post<ImageAnalysisResult>('/lookups/image/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data)
    },
  },

  command: {
    list: (feature?: string) =>
      http.get<CommandAction[]>('/command/actions', { params: feature ? { feature } : undefined }).then(r => r.data),

    create: (body: CommandActionRequest) =>
      http.post<CommandAction>('/command/actions', body).then(r => r.data),

    update: (id: string, body: Partial<Pick<CommandActionRequest, 'status' | 'payload'>>) =>
      http.patch<CommandAction>(`/command/actions/${id}`, body).then(r => r.data),
  },
}
