import { GitBranch, Globe, Network, DollarSign, Clock, Bug } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Props {
  stats: { subdomains: number; live_hosts: number; cost_usd: number }
  findingsCount: number
  branch: string
  status: string
  startedAt: string
}

function useElapsed(startedAt: string, running: boolean) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [running, startedAt])
  return elapsed
}

function fmt(secs: number) {
  const m = Math.floor(secs / 60), s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const Stat = ({ icon: Icon, label, value, color = 'text-slate-300' }: {
  icon: React.ElementType; label: string; value: string | number; color?: string
}) => (
  <div className="flex items-center gap-2">
    <Icon className="w-3.5 h-3.5 text-slate-600" />
    <span className="text-xs text-slate-600">{label}</span>
    <span className={`text-xs font-bold ${color}`}>{value}</span>
  </div>
)

export function StatsBar({ stats, findingsCount, branch, status, startedAt }: Props) {
  const elapsed = useElapsed(startedAt, status === 'running')

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <Stat icon={Network}   label="subdomains" value={stats.subdomains} />
      <Stat icon={Globe}     label="live hosts"  value={stats.live_hosts} />
      <Stat icon={Bug}       label="findings"    value={findingsCount}
            color={findingsCount > 0 ? 'text-cyber-orange' : 'text-slate-300'} />
      <Stat icon={DollarSign} label="cost"       value={`$${stats.cost_usd.toFixed(2)}`} />
      {status === 'running' && (
        <Stat icon={Clock} label="elapsed" value={fmt(elapsed)} color="text-cyber-green" />
      )}
      {branch && (
        <div className="ml-auto flex items-center gap-1.5 text-xs text-cyber-blue/50 truncate max-w-[260px]">
          <GitBranch className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{branch}</span>
        </div>
      )}
    </div>
  )
}
