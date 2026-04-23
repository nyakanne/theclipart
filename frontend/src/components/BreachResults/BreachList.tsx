import { AlertTriangle, Database, Globe, Eye, Calendar } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { SeverityBadge } from '@/components/ui/Badge'
import type { BreachRecord } from '@/types'

const sourceIcon = {
  breach_db:   <Database className="h-4 w-4" />,
  data_broker: <Globe className="h-4 w-4" />,
  dark_web:    <AlertTriangle className="h-4 w-4" />,
  paste_site:  <Eye className="h-4 w-4" />,
}

export function BreachList({ breaches }: { breaches: BreachRecord[] }) {
  if (!breaches.length) {
    return (
      <div className="py-12 text-center text-gray-500">
        <Database className="mx-auto mb-3 h-10 w-10 opacity-30" />
        <p>No breach database records found</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {breaches.map(b => (
        <Card key={b.id} glow={b.severity === 'critical' ? 'red' : 'none'}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-gray-500">{sourceIcon[b.source_type]}</span>
                <span className="font-semibold text-white">{b.source}</span>
                {!b.verified && (
                  <span className="rounded bg-yellow-900/40 px-1.5 py-0.5 text-[10px] text-yellow-400">
                    UNVERIFIED
                  </span>
                )}
              </div>
              <SeverityBadge severity={b.severity} label={b.severity.toUpperCase()} />
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-gray-400">{b.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {b.exposed_fields.map(f => (
                <span key={f} className="rounded-md bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
                  {f}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {b.breach_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Breached {b.breach_date}
                </span>
              )}
              {b.record_count && (
                <span>{b.record_count.toLocaleString()} records</span>
              )}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  )
}
