import { Zap, AlertOctagon } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import type { HoneyTokenHit } from '@/types'

export function HoneyTokenPanel({ hits }: { hits: HoneyTokenHit[] }) {
  if (!hits.length) {
    return (
      <Card>
        <CardBody className="py-10 text-center text-gray-500">
          <Zap className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-sm">No honey-token hits detected</p>
          <p className="mt-1 text-xs text-gray-600">
            Sentinel aliases have been seeded. You'll be alerted if they surface anywhere.
          </p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3">
        <AlertOctagon className="h-5 w-5 text-red-400" />
        <span className="text-sm font-medium text-red-300">
          {hits.length} honey-token hit{hits.length !== 1 ? 's' : ''} detected — your aliases have been accessed without authorisation
        </span>
      </div>

      {hits.map(h => (
        <Card key={h.id} glow="red">
          <CardBody className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-red-300">{h.token_type} alias hit</span>
              <span className="text-xs text-gray-500">{new Date(h.hit_timestamp).toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-400">Source: <span className="text-gray-200">{h.hit_source}</span></p>
            {h.context_snippet && (
              <pre className="rounded bg-gray-900 p-2 text-xs text-gray-400 overflow-auto">
                {h.context_snippet}
              </pre>
            )}
          </CardBody>
        </Card>
      ))}
    </div>
  )
}
