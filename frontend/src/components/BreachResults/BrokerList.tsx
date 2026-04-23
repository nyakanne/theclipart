import { useState } from 'react'
import { Globe, ExternalLink, CheckCircle, Clock, XCircle, AlertTriangle, Send } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { api } from '@/services/api'
import type { BrokerListing } from '@/types'

const optOutStatusConfig = {
  not_started: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-yellow-400', label: 'Action needed' },
  in_progress:  { icon: <Clock className="h-4 w-4" />, color: 'text-blue-400', label: 'In progress' },
  submitted:    { icon: <Send className="h-4 w-4" />, color: 'text-brand-400', label: 'Submitted' },
  confirmed:    { icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-400', label: 'Confirmed' },
  failed:       { icon: <XCircle className="h-4 w-4" />, color: 'text-red-400', label: 'Failed' },
}

export function BrokerList({ listings, scanId, onUpdate }: {
  listings: BrokerListing[]
  scanId: string
  onUpdate?: () => void
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [submittingAll, setSubmittingAll] = useState(false)

  const handleOptOut = async (brokerId: string) => {
    setLoading(brokerId)
    try {
      await api.optOut.initiate(scanId, brokerId)
      onUpdate?.()
    } finally {
      setLoading(null)
    }
  }

  const handleOptOutAll = async () => {
    setSubmittingAll(true)
    try {
      await api.optOut.initiateAll(scanId)
      onUpdate?.()
    } finally {
      setSubmittingAll(false)
    }
  }

  const pendingCount = listings.filter(l => l.opt_out_status === 'not_started').length

  if (!listings.length) {
    return (
      <div className="py-12 text-center text-gray-500">
        <Globe className="mx-auto mb-3 h-10 w-10 opacity-30" />
        <p>No data broker listings found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-yellow-800/50 bg-yellow-900/20 px-4 py-3">
          <span className="text-sm text-yellow-300">
            {pendingCount} brokers haven't received a deletion request yet
          </span>
          <Button
            size="sm"
            variant="secondary"
            loading={submittingAll}
            onClick={handleOptOutAll}
          >
            Purge All
          </Button>
        </div>
      )}

      {listings.map(b => {
        const status = optOutStatusConfig[b.opt_out_status]
        return (
          <Card key={b.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <span className="font-semibold text-white">{b.broker_name}</span>
                    {b.dsar_eligible && (
                      <span className="rounded bg-brand-900/50 px-1.5 py-0.5 text-[10px] text-brand-400">
                        DSAR
                      </span>
                    )}
                  </div>
                  <a
                    href={b.broker_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
                  >
                    {b.broker_url} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <span className={`flex items-center gap-1.5 text-sm font-medium ${status.color}`}>
                  {status.icon} {status.label}
                </span>
              </div>
            </CardHeader>
            <CardBody className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {b.fields_exposed.map(f => (
                  <span key={f} className="rounded-md bg-gray-800 px-2 py-0.5 text-xs text-gray-300">{f}</span>
                ))}
              </div>
              {b.opt_out_status === 'not_started' && (
                <Button
                  size="sm"
                  variant="danger"
                  loading={loading === b.id}
                  onClick={() => handleOptOut(b.id)}
                  className="ml-3 shrink-0"
                >
                  Request Deletion
                </Button>
              )}
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}
