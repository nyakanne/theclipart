import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Database, Globe, Zap, ShieldAlert, Gavel, ArrowLeft } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useScanStatus, useScanResult, usePollUntilComplete } from '@/hooks/useScan'
import { ScanProgress } from '@/components/BreachSearch/ScanProgress'
import { RiskSummary } from '@/components/Dashboard/RiskSummary'
import { BreachList } from '@/components/BreachResults/BreachList'
import { BrokerList } from '@/components/BreachResults/BrokerList'
import { HoneyTokenPanel } from '@/components/BreachResults/HoneyTokenPanel'
import { CompliancePanel } from '@/components/BreachResults/CompliancePanel'
import { RegulatorPack } from '@/components/Dashboard/RegulatorPack'
import type { ScanJob, ScanResult } from '@/types'

const TABS = [
  { id: 'breaches',    label: 'Breaches',    icon: Database },
  { id: 'brokers',     label: 'Brokers',     icon: Globe },
  { id: 'tokens',      label: 'Sentinel',    icon: Zap },
  { id: 'compliance',  label: 'Compliance',  icon: ShieldAlert },
  { id: 'regulator',   label: 'Regulator',   icon: Gavel },
] as const

type Tab = typeof TABS[number]['id']

export function ScanPage() {
  const { scanId } = useParams<{ scanId: string }>()
  const [tab, setTab] = useState<Tab>('breaches')
  const qc = useQueryClient()

  usePollUntilComplete(scanId ?? null)
  const { data: statusData } = useScanStatus(scanId ?? null)
  const { data: result } = useScanResult(scanId ?? null)

  const job = statusData as ScanJob | undefined
  const scanResult = result as ScanResult | undefined

  const isScanning = job && job.status !== 'completed' && job.status !== 'failed'

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['scan-result', scanId] })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="text-gray-500 hover:text-gray-300 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Scan Results</h1>
          <p className="text-xs text-gray-500 font-mono">{scanId}</p>
        </div>
      </div>

      {isScanning && job && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <ScanProgress job={job} />
        </motion.div>
      )}

      {scanResult && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <RiskSummary result={scanResult} />

          <div className="flex gap-1 border-b border-gray-800 overflow-x-auto">
            {TABS.map(t => {
              const Icon = t.icon
              const count =
                t.id === 'breaches' ? scanResult.breaches.length :
                t.id === 'brokers'  ? scanResult.broker_listings.length :
                t.id === 'tokens'   ? scanResult.honey_token_hits.length : null
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    tab === t.id
                      ? 'border-brand-500 text-brand-300'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                  {count !== null && count > 0 && (
                    <span className="ml-1 rounded-full bg-gray-800 px-1.5 py-0.5 text-xs">{count}</span>
                  )}
                </button>
              )
            })}
          </div>

          <div>
            {tab === 'breaches'   && <BreachList breaches={scanResult.breaches} />}
            {tab === 'brokers'    && <BrokerList listings={scanResult.broker_listings} scanId={scanResult.scan_id} onUpdate={refresh} />}
            {tab === 'tokens'     && <HoneyTokenPanel hits={scanResult.honey_token_hits} />}
            {tab === 'compliance' && scanResult.compliance && <CompliancePanel compliance={scanResult.compliance} />}
            {tab === 'regulator'  && <RegulatorPack scanId={scanResult.scan_id} />}
          </div>
        </motion.div>
      )}

      {job?.status === 'failed' && (
        <div className="rounded-xl border border-red-800 bg-red-900/20 p-6 text-center">
          <p className="text-red-300 font-medium">Scan failed</p>
          <p className="mt-1 text-sm text-gray-400">Please try again or contact support.</p>
        </div>
      )}
    </div>
  )
}
