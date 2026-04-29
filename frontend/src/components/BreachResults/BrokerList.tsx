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
  const [error, setError] = useState<string | null>(null)

  const handleOptOut = async (brokerId: string) => {
    const listing = listings.find(item => item.id === brokerId)
    const confirmed = window.confirm(
      `Send a real removal request to ${listing?.broker_name ?? 'this broker'}?\n\nThis will transmit the scan identifiers you provided, such as name, email, phone, or username, to the broker privacy contact so they can process deletion.`
    )
    if (!confirmed) return
    setLoading(brokerId)
    setError(null)
    try {
      await api.optOut.initiate(scanId, brokerId)
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opt-out request failed')
    } finally {
      setLoading(null)
    }
  }

  const handleOptOutAll = async () => {
    const confirmed = window.confirm(
      `Send real removal requests to ${pendingCount} broker contacts?\n\nThis will transmit the personal identifiers from this scan to broker privacy contacts. Use this only for yourself or someone who authorized you.`
    )
    if (!confirmed) return
    setSubmittingAll(true)
    setError(null)
    try {
      await api.optOut.initiateAll(scanId)
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'One-stop opt-out failed')
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
        <div className="flex items-center justify-between border border-orange-500/30 bg-orange-950/20 px-4 py-3">
          <span className="text-sm text-yellow-300">
            {pendingCount} brokers still need action. One-stop opt-out sends real deletion requests when backend email delivery is configured.
          </span>
          <Button
            size="sm"
            variant="secondary"
            loading={submittingAll}
            onClick={handleOptOutAll}
          >
            One-Stop Opt Out
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/35 bg-red-950/25 px-4 py-3 text-sm leading-6 text-red-100">
          {error}
        </div>
      )}

      {listings.map(b => {
        const status = optOutStatusConfig[b.opt_out_status]
        return (
          <Card key={b.id} className="rounded-none bg-[#10101a]">
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
              <div className="ml-3 flex shrink-0 flex-wrap justify-end gap-2">
                {b.opt_out_url && (
                  <a
                    href={b.opt_out_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-300 transition-colors hover:border-red-400 hover:text-white"
                  >
                    Open opt-out <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {b.opt_out_status === 'not_started' && (
                  <Button
                    size="sm"
                    variant="danger"
                    loading={loading === b.id}
                    onClick={() => handleOptOut(b.id)}
                  >
                    Request Deletion
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}
