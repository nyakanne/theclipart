import { motion } from 'framer-motion'
import { Shield, Database, Globe, Mail, FileCheck } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import type { ScanJob } from '@/types'

const STAGES = [
  { key: 'breach_db',   label: 'Breach databases',   icon: Database },
  { key: 'dark_web',    label: 'Dark web sources',    icon: Globe },
  { key: 'data_broker', label: 'Data broker sites',   icon: Shield },
  { key: 'honey_token', label: 'Honey token seeding', icon: Mail },
  { key: 'compliance',  label: 'Compliance scoring',  icon: FileCheck },
]

export function ScanProgress({ job }: { job: ScanJob }) {
  const stageIdx = STAGES.findIndex(s => job.current_stage.includes(s.key))
  const progress = job.progress ?? 0

  return (
    <Card glow="red">
      <CardBody className="space-y-6">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="mx-auto mb-4 inline-block"
          >
            <Shield className="h-12 w-12 text-red-400" />
          </motion.div>
          <h3 className="text-lg font-semibold text-white">Scanning in progress</h3>
          <p className="text-sm text-gray-400 mt-1">{job.current_stage}</p>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon
            const done = stageIdx > i
            const active = stageIdx === i
            return (
              <div key={stage.key} className="flex flex-col items-center gap-1.5">
                <div className={`
                  flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors
                  ${done   ? 'border-gold-500 bg-ink-800 text-gold-400' : ''}
                  ${active ? 'border-red-400 bg-red-900/80 text-red-300 animate-pulse' : ''}
                  ${!done && !active ? 'border-gray-700 bg-gray-800/50 text-gray-600' : ''}
                `}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-center text-[10px] leading-tight text-gray-500">{stage.label}</span>
              </div>
            )
          })}
        </div>

        {job.estimated_seconds && (
          <p className="text-center text-xs text-gray-500">
            Est. {job.estimated_seconds}s remaining
          </p>
        )}
      </CardBody>
    </Card>
  )
}
