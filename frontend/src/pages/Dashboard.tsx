import { Link } from 'react-router-dom'
import { Clock, CheckCircle, XCircle, Loader, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { ScanJob } from '@/types'

const statusIcon = {
  idle:      <Clock className="h-4 w-4 text-gray-500" />,
  queued:    <Clock className="h-4 w-4 text-yellow-400" />,
  scanning:  <Loader className="h-4 w-4 text-brand-400 animate-spin" />,
  completed: <CheckCircle className="h-4 w-4 text-green-400" />,
  failed:    <XCircle className="h-4 w-4 text-red-400" />,
}

export function Dashboard() {
  const { data: scans = [], isLoading } = useQuery({
    queryKey: ['scans'],
    queryFn: () => api.scan.list(),
    refetchInterval: 5000,
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <Link to="/">
          <Button icon={<Plus className="h-4 w-4" />}>New Scan</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <span className="font-semibold text-white">Recent Scans</span>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading && (
            <div className="py-12 text-center text-gray-500">
              <Loader className="mx-auto h-6 w-6 animate-spin" />
            </div>
          )}
          {!isLoading && !scans.length && (
            <div className="py-12 text-center text-gray-500">
              <p className="text-sm">No scans yet.</p>
              <Link to="/" className="mt-2 inline-block text-sm text-brand-400 hover:text-brand-300">
                Start your first scan →
              </Link>
            </div>
          )}
          {scans.map((scan: ScanJob) => (
            <Link
              key={scan.scan_id}
              to={`/scan/${scan.scan_id}`}
              className="flex items-center gap-3 px-6 py-3.5 border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition-colors"
            >
              {statusIcon[scan.status]}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-gray-200 truncate">{scan.scan_id}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(scan.created_at).toLocaleString()} · {scan.current_stage}
                </p>
              </div>
              {scan.status === 'scanning' && (
                <div className="w-24">
                  <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${scan.progress}%` }}
                    />
                  </div>
                </div>
              )}
              <span className={`text-xs capitalize ${
                scan.status === 'completed' ? 'text-green-400' :
                scan.status === 'failed'    ? 'text-red-400' :
                scan.status === 'scanning'  ? 'text-brand-400' : 'text-gray-500'
              }`}>
                {scan.status}
              </span>
            </Link>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}
