import { Link } from 'react-router-dom'
import { Clock, CheckCircle, XCircle, Loader, Plus, ShieldAlert, Bell, Hash } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { ScanJob } from '@/types'

const statusIcon = {
  idle:      <Clock className="h-4 w-4 text-gray-500" />,
  queued:    <Clock className="h-4 w-4 text-red-200" />,
  scanning:  <Loader className="h-4 w-4 text-brand-400 animate-spin" />,
  completed: <CheckCircle className="h-4 w-4 text-gray-200" />,
  failed:    <XCircle className="h-4 w-4 text-red-400" />,
}

export function Dashboard() {
  const { data: scans = [], isLoading } = useQuery({
    queryKey: ['scans'],
    queryFn: () => api.scan.list(),
    refetchInterval: 5000,
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="premium-panel rounded-[28px] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f5d7a1]">Command vault</p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Saved scans and live defenses</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300">
              Review active investigations, reopen saved exposure maps, and keep your removals, alerts, and evidence trails in one retained operating surface.
            </p>
          </div>
          <Link to="/">
            <Button icon={<Plus className="h-4 w-4" />}>New Scan</Button>
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { icon: ShieldAlert, label: 'Active scans', value: `${scans.filter(scan => scan.status === 'scanning' || scan.status === 'queued').length}`, detail: 'Investigations still resolving' },
            { icon: Bell, label: 'Completed vault items', value: `${scans.filter(scan => scan.status === 'completed').length}`, detail: 'Resolved reports ready to reopen' },
            { icon: Hash, label: 'Failed or interrupted', value: `${scans.filter(scan => scan.status === 'failed').length}`, detail: 'Needs rerun or review' },
          ].map(({ icon: Icon, label, value, detail }) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-black/35 p-4">
              <Icon className="h-5 w-5 text-[#f5d7a1]" />
              <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">{label}</div>
              <div className="mt-1 text-3xl font-black text-white">{value}</div>
              <div className="mt-1 text-xs text-gray-500">{detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-[#fff7e8]">Recent scans</h2>
        <Link to="/">
          <Button icon={<Plus className="h-4 w-4" />}>New Scan</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <span className="font-semibold text-white">Vault timeline</span>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading && (
            <div className="py-12 text-center text-gray-500">
              <Loader className="mx-auto h-6 w-6 animate-spin" />
            </div>
          )}
          {!isLoading && !scans.length && (
            <div className="py-12 text-center text-gray-500">
              <p className="text-sm">No scans stored yet.</p>
              <Link to="/" className="mt-2 inline-block text-sm text-red-300 hover:text-white">
                Start your first scan →
              </Link>
            </div>
          )}
          {scans.map((scan: ScanJob) => (
            <Link
              key={scan.scan_id}
              to={`/scan/${scan.scan_id}`}
              className="flex items-center gap-3 border-b border-gray-800 px-6 py-4 last:border-0 transition-colors hover:bg-red-950/12"
            >
              {statusIcon[scan.status]}
              <div className="flex-1 min-w-0">
                <p className="truncate font-mono text-sm text-gray-200">{scan.scan_id}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(scan.created_at).toLocaleString()} · {scan.current_stage}
                </p>
              </div>
              {scan.status === 'scanning' && (
                <div className="w-24">
                  <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500 transition-all"
                      style={{ width: `${scan.progress}%` }}
                    />
                  </div>
                </div>
              )}
              <span className={`text-xs capitalize ${
                scan.status === 'completed' ? 'text-gray-200' :
                scan.status === 'failed'    ? 'text-red-400' :
                scan.status === 'scanning'  ? 'text-[#f5d7a1]' : 'text-gray-500'
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
