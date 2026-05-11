import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ScanJob, ScanResult } from '@/types'

interface ScanStore {
  activeScanId: string | null
  recentScans: ScanJob[]
  currentResult: ScanResult | null
  setActiveScan: (id: string | null) => void
  addRecentScan: (job: ScanJob) => void
  setCurrentResult: (result: ScanResult | null) => void
  updateScanStatus: (job: ScanJob) => void
  clearHistory: () => void
}

export const useScanStore = create<ScanStore>()(
  persist(
    set => ({
      activeScanId: null,
      recentScans: [],
      currentResult: null,

      setActiveScan: id => set({ activeScanId: id }),

      addRecentScan: job =>
        set(s => ({
          recentScans: [job, ...s.recentScans.filter(r => r.scan_id !== job.scan_id)].slice(0, 20),
        })),

      setCurrentResult: result => set({ currentResult: result }),

      updateScanStatus: job =>
        set(s => ({
          recentScans: s.recentScans.map(r => r.scan_id === job.scan_id ? job : r),
        })),

      clearHistory: () => set({ recentScans: [], activeScanId: null, currentResult: null }),
    }),
    { name: 'vindica-scans' }
  )
)
