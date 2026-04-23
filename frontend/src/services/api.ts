import axios from 'axios'
import type {
  ScanRequest, ScanJob, ScanResult, DsarRequest, ReportPackage
} from '@/types'

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
      http.post<DsarRequest>(`/scans/${scanId}/dsar/${brokerId}/send`).then(r => r.data),

    sendAll: (scanId: string) =>
      http.post<DsarRequest[]>(`/scans/${scanId}/dsar/send-all`).then(r => r.data),
  },

  report: {
    generate: (scanId: string, format: 'pdf' | 'json' | 'csv' = 'pdf') =>
      http.post<ReportPackage>(`/scans/${scanId}/report`, { format }).then(r => r.data),
  },

  optOut: {
    initiate: (scanId: string, brokerId: string) =>
      http.post(`/scans/${scanId}/opt-out/${brokerId}`).then(r => r.data),

    initiateAll: (scanId: string) =>
      http.post(`/scans/${scanId}/opt-out/all`).then(r => r.data),
  },
}
