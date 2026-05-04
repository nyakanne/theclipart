import { useQuery } from '@tanstack/react-query'
import {
  Activity, AlertTriangle, CheckCircle, Database, ExternalLink,
  Loader, RefreshCw, Server, XCircle, Info, Zap
} from 'lucide-react'
import { clsx } from 'clsx'
import { api } from '@/services/api'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import type { DDMonitor, DDEvent, MonitorStatus } from '@/types'

// ── status helpers ────────────────────────────────────────────────────────────

const monitorStatusStyle: Record<string, string> = {
  Alert:    'text-red-400 bg-red-900/30 border-red-800',
  Warn:     'text-yellow-400 bg-yellow-900/30 border-yellow-800',
  'No Data':'text-gray-400 bg-gray-800/60 border-gray-700',
  OK:       'text-green-400 bg-green-900/30 border-green-800',
  Unknown:  'text-gray-500 bg-gray-800/40 border-gray-700',
}

const eventAlertStyle: Record<string, string> = {
  error:   'text-red-400',
  warning: 'text-yellow-400',
  success: 'text-green-400',
  info:    'text-brand-400',
}

function MonitorStatusBadge({ status }: { status: MonitorStatus }) {
  const style = monitorStatusStyle[status] ?? monitorStatusStyle.Unknown
  return (
    <span className={clsx('px-2 py-0.5 rounded text-xs font-medium border', style)}>
      {status}
    </span>
  )
}

function MonitorStatusIcon({ status }: { status: MonitorStatus }) {
  if (status === 'Alert')    return <XCircle className="h-4 w-4 text-red-400 shrink-0" />
  if (status === 'Warn')     return <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
  if (status === 'OK')       return <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
  return <Activity className="h-4 w-4 text-gray-500 shrink-0" />
}

function EventAlertIcon({ type }: { type: string }) {
  if (type === 'error')   return <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
  if (type === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
  if (type === 'success') return <CheckCircle className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
  return <Info className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
}

// ── sub-components ────────────────────────────────────────────────────────────

function HealthSection() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'health'],
    queryFn: () => api.admin.health(),
    refetchInterval: 15_000,
  })

  const tiles = data
    ? [
        { label: 'Database',  value: data.database === 'ok' ? 'Healthy' : 'Error', ok: data.database === 'ok',  icon: <Database className="h-5 w-5" /> },
        { label: 'DD Configured', value: data.datadog_configured ? 'Yes' : 'Not set', ok: data.datadog_configured, icon: <Zap className="h-5 w-5" /> },
        { label: 'Total Scans',   value: String(data.total_scans), ok: true, icon: <Server className="h-5 w-5" /> },
        { label: 'Active Scans',  value: String(data.scan_counts.queued + data.scan_counts.scanning), ok: true, icon: <Activity className="h-5 w-5" /> },
      ]
    : []

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">System Health</h2>
        <button
          onClick={() => refetch()}
          className="text-gray-500 hover:text-gray-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={clsx('h-4 w-4', isRefetching && 'animate-spin')} />
        </button>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
          <Loader className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map(t => (
            <Card key={t.label} glow={t.ok ? 'none' : 'red'}>
              <CardBody className="flex flex-col gap-2 py-4">
                <div className={t.ok ? 'text-brand-400' : 'text-red-400'}>{t.icon}</div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{t.label}</p>
                  <p className={clsx('text-lg font-bold', t.ok ? 'text-white' : 'text-red-400')}>{t.value}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {data && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {(['queued', 'scanning', 'completed', 'failed'] as const).map(s => (
            <div key={s} className="rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-center">
              <p className="text-xs text-gray-500 capitalize">{s}</p>
              <p className={clsx('text-base font-bold', {
                'text-yellow-400': s === 'queued',
                'text-brand-400':  s === 'scanning',
                'text-green-400':  s === 'completed',
                'text-red-400':    s === 'failed',
              })}>
                {data.scan_counts[s]}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MonitorsSection() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'monitors'],
    queryFn: () => api.admin.monitors(),
    refetchInterval: 30_000,
  })

  const monitors = data?.monitors ?? []
  const alertCount = monitors.filter(m => m.status === 'Alert').length
  const warnCount  = monitors.filter(m => m.status === 'Warn').length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-400" />
            <span className="font-semibold text-white">Datadog Monitors</span>
            {data && (
              <span className="text-xs text-gray-500">({data.total} total)</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {alertCount > 0 && (
              <span className="text-xs font-medium text-red-400">{alertCount} alert{alertCount > 1 ? 's' : ''}</span>
            )}
            {warnCount > 0 && (
              <span className="text-xs font-medium text-yellow-400">{warnCount} warn{warnCount > 1 ? 's' : ''}</span>
            )}
            <button onClick={() => refetch()} className="text-gray-500 hover:text-gray-300 transition-colors">
              <RefreshCw className={clsx('h-4 w-4', isRefetching && 'animate-spin')} />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardBody className="p-0 max-h-80 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm px-6 py-8">
            <Loader className="h-4 w-4 animate-spin" /> Loading monitors…
          </div>
        )}
        {!isLoading && monitors.length === 0 && (
          <p className="text-sm text-gray-500 px-6 py-8">
            No monitors found. Configure DD_API_KEY and DD_APP_KEY to see monitor data.
          </p>
        )}
        {monitors.map((m: DDMonitor) => (
          <div
            key={m.id}
            className="flex items-center gap-3 px-6 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition-colors"
          >
            <MonitorStatusIcon status={m.status} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 truncate">{m.name}</p>
              {m.tags.length > 0 && (
                <p className="text-xs text-gray-600 truncate mt-0.5">{m.tags.slice(0, 3).join(' · ')}</p>
              )}
            </div>
            <MonitorStatusBadge status={m.status} />
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

function EventsSection() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: () => api.admin.events(),
    refetchInterval: 60_000,
  })

  const events = data?.events ?? []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            <span className="font-semibold text-white">Recent Events</span>
            <span className="text-xs text-gray-500">(last 24 h)</span>
          </div>
          <button onClick={() => refetch()} className="text-gray-500 hover:text-gray-300 transition-colors">
            <RefreshCw className={clsx('h-4 w-4', isRefetching && 'animate-spin')} />
          </button>
        </div>
      </CardHeader>
      <CardBody className="p-0 max-h-80 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm px-6 py-8">
            <Loader className="h-4 w-4 animate-spin" /> Loading events…
          </div>
        )}
        {!isLoading && events.length === 0 && (
          <p className="text-sm text-gray-500 px-6 py-8">No events in the last 24 hours.</p>
        )}
        {events.map((e: DDEvent) => (
          <div
            key={e.id}
            className="flex items-start gap-3 px-6 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition-colors"
          >
            <EventAlertIcon type={e.alert_type} />
            <div className="flex-1 min-w-0">
              <p className={clsx('text-sm font-medium truncate', eventAlertStyle[e.alert_type] ?? 'text-gray-300')}>
                {e.title}
              </p>
              {e.text && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{e.text}</p>
              )}
              <p className="text-xs text-gray-600 mt-1">
                {new Date(e.date_happened * 1000).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export function CommandCenter() {
  const ddSite = import.meta.env.VITE_DD_SITE ?? 'datadoghq.com'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="mt-1 text-sm text-gray-500">System health and Datadog observability</p>
        </div>
        <a
          href={`https://app.${ddSite}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          Open Datadog
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <HealthSection />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MonitorsSection />
        <EventsSection />
      </div>
    </div>
  )
}
