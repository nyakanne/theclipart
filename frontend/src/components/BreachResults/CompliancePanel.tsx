import { ShieldAlert, ShieldCheck, AlertTriangle, ChevronRight } from 'lucide-react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { SeverityBadge } from '@/components/ui/Badge'
import { ProgressRing } from '@/components/ui/ProgressRing'
import type { ComplianceScore } from '@/types'

const scoreColor = (s: number) => s >= 70 ? '#22c55e' : s >= 40 ? '#f59e0b' : '#ef4444'

export function CompliancePanel({ compliance }: { compliance: ComplianceScore }) {
  const color = scoreColor(compliance.overall)

  return (
    <div className="space-y-4">
      <Card glow={compliance.risk_level === 'critical' || compliance.risk_level === 'high' ? 'red' : 'none'}>
        <CardBody>
          <div className="flex items-center gap-6">
            <ProgressRing
              value={compliance.overall}
              size={88}
              color={color}
              label={`${compliance.overall}`}
            />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Compliance Score</h3>
              <p className="text-sm text-gray-400 mt-0.5">
                {compliance.overall >= 70 ? 'Relatively low risk' :
                 compliance.overall >= 40 ? 'Moderate risk — action recommended' :
                 'High risk — immediate action required'}
              </p>
              <div className="mt-3 flex gap-4">
                <Metric label="GDPR" value={compliance.gdpr_score} />
                <Metric label="CCPA" value={compliance.ccpa_score} />
              </div>
            </div>
            <SeverityBadge severity={compliance.risk_level} label={compliance.risk_level.toUpperCase()} />
          </div>
        </CardBody>
      </Card>

      {compliance.violations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-400" />
              <span className="font-semibold text-white">Violations ({compliance.violations.length})</span>
            </div>
          </CardHeader>
          <CardBody className="divide-y divide-gray-800">
            {compliance.violations.map((v, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-gray-400">{v.regulation}</span>
                    {v.article && <span className="text-xs text-gray-600">{v.article}</span>}
                    {v.broker_name && <span className="text-xs text-gray-500">· {v.broker_name}</span>}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-300">{v.description}</p>
                </div>
                <SeverityBadge severity={v.severity} label={v.severity} />
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {compliance.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-400" />
              <span className="font-semibold text-white">Recommendations</span>
            </div>
          </CardHeader>
          <CardBody className="space-y-2">
            {compliance.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                <p className="text-sm text-gray-300">{r}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  const color = scoreColor(value)
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="font-semibold" style={{ color }}>{value}</span>
    </div>
  )
}
