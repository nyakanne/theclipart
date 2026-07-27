import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Camera, Database, Globe, Search, Zap, ShieldAlert, Gavel, ArrowLeft, RefreshCw, ShieldOff, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useScanStatus, useScanResult, usePollUntilComplete } from '@/hooks/useScan'
import { ScanProgress } from '@/components/BreachSearch/ScanProgress'
import { BreachList } from '@/components/BreachResults/BreachList'
import { BrokerList } from '@/components/BreachResults/BrokerList'
import { HoneyTokenPanel } from '@/components/BreachResults/HoneyTokenPanel'
import { CompliancePanel } from '@/components/BreachResults/CompliancePanel'
import { RegulatorPack } from '@/components/Dashboard/RegulatorPack'
import { useQueryClient } from '@tanstack/react-query'
import { ExposureGraph } from '@/components/visuals/ExposureGraph'
import { ExposureLookupPanel } from '@/components/Investigation/ExposureLookupPanel'
import { ReverseImageSearchPanel } from '@/components/Investigation/ReverseImageSearchPanel'
import { EvidencePanel } from '@/components/Investigation/EvidencePanel'
import { ErrorState } from '@/components/ui/ErrorState'
import { totalSourcesFromScanResult } from './home/utils'
import { summarizeProviderCoverage } from '@/utils/providerCoverage'

const TABS = [
  { id: 'lookup', label: 'Find Yourself', icon: Search },
  { id: 'evidence', label: 'Evidence', icon: ShieldAlert },
  { id: 'breaches', label: 'Breaches',   icon: Database },
  { id: 'brokers',  label: 'Brokers',    icon: Globe },
  { id: 'images',   label: 'Images',     icon: Camera },
  { id: 'tokens',   label: 'Sentinel',   icon: Zap },
  { id: 'compliance', label: 'Compliance', icon: ShieldAlert },
  { id: 'regulator',  label: 'Regulator',  icon: Gavel },
] as const

type Tab = typeof TABS[number]['id']

export function ScanPage() {
  const { scanId } = useParams<{ scanId: string }>()
  const [tab, setTab] = useState<Tab>('lookup')
  const qc = useQueryClient()

  usePollUntilComplete(scanId ?? null)
  const { data: statusData } = useScanStatus(scanId ?? null)
  const { data: result } = useScanResult(scanId ?? null)

  const isScanning = statusData && statusData.status !== 'completed' && statusData.status !== 'failed'
  const totalSources = result ? totalSourcesFromScanResult(result) : 0
  const providerCoverage = summarizeProviderCoverage(result?.provider_status ?? [])

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['scan-result', scanId] })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="premium-panel rounded-[28px] p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="rounded-xl border border-white/10 p-2 text-gray-500 transition-colors hover:border-red-400 hover:text-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-400">Exposure command file</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white">Your Personal Data Exposure Overview</h1>
            <p className="mt-1 font-mono text-xs text-gray-500">{scanId}</p>
          </div>
        </div>
      </div>

      {isScanning && statusData && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <ScanProgress job={statusData} />
        </motion.div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <DashboardCard
              label="Privacy Score"
              value={`${Math.max(0, Math.round(100 - result.risk_score))}`}
              sub="/100"
              tone="red"
              icon={<ShieldOff className="h-8 w-8" />}
              footer={result.risk_score >= 75 ? 'High Risk' : result.risk_score >= 40 ? 'Moderate Risk' : 'Low Risk'}
            />
            <DashboardCard
              label="Confirmed Sources"
              value={`${totalSources}`}
              sub={`Across ${result.evidence_items.length + result.breaches.length + result.broker_listings.length + result.honey_token_hits.length} evidence points`}
              tone="white"
              icon={<Database className="h-8 w-8" />}
              footer={`${providerCoverage.successful}/${providerCoverage.attempted} providers returned definitive responses`}
            />
          </div>

          <Link
            to="/#scan"
            className="red-button-glow flex items-center justify-between rounded-2xl border border-red-500/45 bg-red-950/45 px-6 py-4 text-lg font-bold text-white transition-colors hover:bg-red-700"
          >
            <span className="inline-flex items-center gap-3"><RefreshCw className="h-6 w-6" /> Rescan Exposure</span>
            <ChevronRight className="h-6 w-6" />
          </Link>

          <div className="premium-panel overflow-hidden rounded-[28px]">
            <ExposureGraph focused totalSources={totalSources} className="min-h-[620px]" />
          </div>

          <div className="premium-panel rounded-[28px] p-5">
            <div className="flex items-center gap-4">
              <div className="rounded-[20px] border border-red-500/40 bg-red-950/25 p-4 text-red-400">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-xl font-black text-ivory">
                  {totalSources > 0 ? 'Confirmed exposure evidence found' : 'No confirmed exposure evidence returned'}
                </h2>
                <p className="mt-1 text-gray-400">
                  {totalSources > 0
                    ? `Personal information was confirmed across ${totalSources} sources. Use the evidence and broker queues below to review and act.`
                    : providerCoverage.limited
                      ? 'Some providers were unavailable or failed, so this limited scan cannot prove that no exposure exists.'
                      : 'Every attempted provider returned a definitive response, but no linked exposure evidence was confirmed.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/8 bg-black/70 px-2 py-1">
            {TABS.map(t => {
              const Icon = t.icon
              const count = t.id === 'breaches' ? result.breaches.length
                : t.id === 'evidence' ? result.evidence_items.length
                : t.id === 'brokers' ? result.broker_listings.length
                : t.id === 'tokens' ? result.honey_token_hits.length
                : null
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${
                    tab === t.id
                      ? 'border-gold-500 text-ivory'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                  {count !== null && count > 0 && (
                    <span className="ml-1 bg-gray-800 px-1.5 py-0.5 text-xs">{count}</span>
                  )}
                </button>
              )
            })}
          </div>

          <div>
            {tab === 'breaches'   && <BreachList breaches={result.breaches} />}
            {tab === 'evidence'   && (
              <EvidencePanel
                items={result.evidence_items}
                scanId={result.scan_id}
                providerStatus={result.provider_status}
              />
            )}
            {tab === 'brokers'    && <BrokerList listings={result.broker_listings} scanId={result.scan_id} onUpdate={refresh} />}
            {tab === 'lookup'     && <ExposureLookupPanel compact scanResult={result} scanJob={statusData} />}
            {tab === 'images'     && <ReverseImageSearchPanel />}
            {tab === 'tokens'     && <HoneyTokenPanel hits={result.honey_token_hits} />}
            {tab === 'compliance' && result.compliance && <CompliancePanel compliance={result.compliance} />}
            {tab === 'regulator'  && <RegulatorPack scanId={result.scan_id} scanStatus={result.status} />}
          </div>
        </motion.div>
      )}

      {statusData?.status === 'failed' && (
        <ErrorState
          title="Scan failed"
          description="Please try again or contact support."
          onRetry={refresh}
        />
      )}
    </div>
  )
}

function DashboardCard({
  label,
  value,
  sub,
  tone,
  icon,
  footer,
}: {
  label: string
  value: string
  sub: string
  tone: 'red' | 'white'
  icon: JSX.Element
  footer: string
}) {
  return (
    <div className="premium-panel rounded-[28px] p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">{label}</div>
          <div className="mt-4 flex items-end gap-2">
            <span className={tone === 'red' ? 'text-6xl font-black text-red-500' : 'text-6xl font-black text-white'}>{value}</span>
            <span className="mb-2 text-xl text-gray-500">{sub.startsWith('/') ? sub : ''}</span>
          </div>
          {!sub.startsWith('/') && <p className="mt-2 text-gray-400">{sub}</p>}
          <p className="mt-3 text-sm font-semibold text-red-300">{footer}</p>
        </div>
        <div className="rounded-full border border-red-500/30 bg-red-950/25 p-4 text-red-400">
          {icon}
        </div>
      </div>
    </div>
  )
}
