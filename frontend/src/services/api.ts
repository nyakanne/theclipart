import axios from 'axios'
import type {
  ScanRequest, ScanJob, ScanResult, DsarRequest, ReportPackage, CommandAction, CommandActionRequest
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
    const msg = err.response?.data?.detail ?? err.message ?? 'Unknown error'
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

    list: () =>
      http.get<ScanJob[]>('/scans').then(r => r.data),
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
      http.post<ReportPackage>(`/scans/${scanId}/report`, { format }).then(r => r.data),
  },

  optOut: {
    initiate: (scanId: string, brokerId: string) =>
      http.post(`/scans/${scanId}/opt-out/${brokerId}`, { confirmed: true }).then(r => r.data),

    initiateAll: (scanId: string) =>
      http.post<{ queued: number; skipped: number; status: string; message: string }>(`/scans/${scanId}/opt-out/all`, { confirmed: true }).then(r => r.data),
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
