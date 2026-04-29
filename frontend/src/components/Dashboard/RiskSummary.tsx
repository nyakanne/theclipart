import { ShieldOff, ShieldCheck, Database, Globe, Zap } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import type { ScanResult } from '@/types'

export function RiskSummary({ result }: { result: ScanResult }) {
  const isClean = result.total_exposures === 0
  const riskColor = result.risk_score >= 75 ? 'text-red-400'
    : result.risk_score >= 40 ? 'text-yellow-400' : 'text-green-400'

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard
        icon={isClean
          ? <ShieldCheck className="h-6 w-6 text-green-400" />
          : <ShieldOff className="h-6 w-6 text-red-400" />}
        label="Risk Score"
        value={<span className={`text-2xl font-bold ${riskColor}`}>{result.risk_score}</span>}
        sub="/100"
      />
      <StatCard
        icon={<Database className="h-6 w-6 text-orange-400" />}
        label="Breach Records"
        value={<span className="text-2xl font-bold text-white">{result.breaches.length}</span>}
        sub={`${result.breaches.filter(b => b.severity === 'critical' || b.severity === 'high').length} high/critical`}
      />
      <StatCard
        icon={<Globe className="h-6 w-6 text-brand-400" />}
        label="Broker Listings"
        value={<span className="text-2xl font-bold text-white">{result.broker_listings.length}</span>}
        sub={`${result.broker_listings.filter(l => l.opt_out_status !== 'confirmed').length} pending removal`}
      />
      <StatCard
        icon={<Zap className="h-6 w-6 text-yellow-400" />}
        label="Token Hits"
        value={<span className="text-2xl font-bold text-white">{result.honey_token_hits.length}</span>}
        sub="honey-token alerts"
      />
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  sub: string
}

function StatCard({ icon, label, value, sub }: StatCardProps) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-2">
        {icon}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
          <div className="flex items-baseline gap-1">
            {value}
            <span className="text-xs text-gray-600">{sub}</span>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
