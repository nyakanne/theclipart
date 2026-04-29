import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useScanStore } from '@/store/scanStore'
import type { ScanRequest, ScanJob, ScanResult } from '@/types'

const POLL_INTERVAL = 2500

export function useCreateScan() {
  const { addRecentScan, setActiveScan } = useScanStore()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (req: ScanRequest) => api.scan.create(req),
    onSuccess: job => {
      addRecentScan(job)
      setActiveScan(job.scan_id)
      qc.invalidateQueries({ queryKey: ['scans'] })
    },
  })
}

export function useScanStatus(scanId: string | null) {
  const { updateScanStatus } = useScanStore()

  const query = useQuery<ScanJob>({
    queryKey: ['scan-status', scanId],
    queryFn: () => api.scan.status(scanId!),
    enabled: !!scanId,
    refetchInterval: q => {
      const status = q.state.data?.status
      if (!status || status === 'completed' || status === 'failed') return false
      return POLL_INTERVAL
    },
  })

  useEffect(() => {
    if (query.data) {
      updateScanStatus(query.data)
    }
  }, [query.data, updateScanStatus])

  return query
}

export function useScanResult(scanId: string | null) {
  const { setCurrentResult } = useScanStore()
  const { data: statusData } = useScanStatus(scanId)

  const query = useQuery<ScanResult>({
    queryKey: ['scan-result', scanId],
    queryFn: () => api.scan.result(scanId!),
    enabled: !!scanId && statusData?.status === 'completed',
  })

  useEffect(() => {
    if (query.data) {
      setCurrentResult(query.data)
    }
  }, [query.data, setCurrentResult])

  return query
}

export function usePollUntilComplete(scanId: string | null) {
  const [done, setDone] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qc = useQueryClient()

  useEffect(() => {
    if (!scanId || done) return

    intervalRef.current = setInterval(async () => {
      const job = await api.scan.status(scanId)
      qc.setQueryData(['scan-status', scanId], job)
      if (job.status === 'completed' || job.status === 'failed') {
        setDone(true)
        if (intervalRef.current) clearInterval(intervalRef.current)
        if (job.status === 'completed') {
          const result = await api.scan.result(scanId)
          qc.setQueryData(['scan-result', scanId], result)
        }
      }
    }, POLL_INTERVAL)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [scanId, done, qc])

  return done
}
