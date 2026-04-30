import axios from 'axios'
import type { ScanRequest, ScanJob, ScanResult, DsarRequest, ReportPackage } from '@/types'
import type { AuthUser } from '@/store/authStore'

const BASE = import.meta.env.VITE_API_URL ?? ''

const http = axios.create({
  baseURL: `${BASE}/api/v1`,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT from localStorage on every request
http.interceptors.request.use(config => {
  try {
    const raw = localStorage.getItem('dataguard-auth')
    const token = raw ? JSON.parse(raw)?.state?.token : null
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})

http.interceptors.response.use(
  r => r,
  err => {
    const msg = err.response?.data?.detail ?? err.message ?? 'Unknown error'
    if (err.response?.status === 401) {
      localStorage.removeItem('dataguard-auth')
      window.location.href = '/login'
    }
    return Promise.reject(new Error(msg))
  }
)

export const api = {
  auth: {
    /** Redirects browser to GitHub consent via Netlify Function */
    loginUrl: () => `${BASE}/api/v1/auth/github`,
    me: (): Promise<AuthUser> =>
      http.get<AuthUser>('/auth/me').then(r => r.data),
  },

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
