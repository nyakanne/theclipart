import { AlertTriangle, AlertOctagon, Info, Shield, Bug } from 'lucide-react'
import type { Finding, Severity } from '../App'

interface Props { findings: Finding[] }

const sevConfig: Record<Severity, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  critical: { label: 'CRIT',   color: 'text-red-400',    bg: 'bg-red-950/40',    border: 'border-red-800/50',    icon: AlertOctagon },
  high:     { label: 'HIGH',   color: 'text-orange-400', bg: 'bg-orange-950/40', border: 'border-orange-800/50', icon: AlertTriangle },
  medium:   { label: 'MED',    color: 'text-yellow-400', bg: 'bg-yellow-950/30', border: 'border-yellow-800/40', icon: AlertTriangle },
  low:      { label: 'LOW',    color: 'text-blue-400',   bg: 'bg-blue-950/30',   border: 'border-blue-800/40',   icon: Shield },
  info:     { label: 'INFO',   color: 'text-slate-400',  bg: 'bg-slate-900/40',  border: 'border-slate-700/40',  icon: Info },
}

function FindingCard({ finding, idx }: { finding: Finding; idx: number }) {
  const cfg = sevConfig[finding.severity] ?? sevConfig.info
  const Icon = cfg.icon

  return (
    <div className={`
      animate-slide-up rounded-lg border p-3 transition-all duration-200
      hover:brightness-110 ${cfg.bg} ${cfg.border}
    `}>
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest flex-shrink-0 ${cfg.color}`}>
          {cfg.label}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-200 font-medium leading-snug truncate">
            {finding.title || 'Vulnerability Found'}
          </p>
          {finding.url && (
            <p className="text-[10px] text-slate-600 mt-0.5 truncate" title={finding.url}>
              {finding.url}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

export function FindingsBoard({ findings }: Props) {
  const sorted = [...findings].sort(
    (a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity)
  )

  const counts = findings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="w-80 flex-shrink-0 flex flex-col border-l border-cyber-border">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-cyber-border bg-cyber-card/50">
        <Bug className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-xs text-slate-600 tracking-wider">FINDINGS</span>
        <div className="ml-auto flex gap-2">
          {ORDER.filter(s => counts[s]).map(s => (
            <span key={s} className={`text-[10px] font-bold ${sevConfig[s].color}`}>
              {counts[s]}{s[0].toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-slate-700 text-xs">
            <Bug className="w-8 h-8 mx-auto mb-3 opacity-20" />
            <p>No findings yet</p>
            <p className="mt-1 text-slate-800">Agents are hunting...</p>
          </div>
        ) : (
          sorted.map((f, i) => <FindingCard key={i} finding={f} idx={i} />)
        )}
      </div>

      {/* Summary bar */}
      {findings.length > 0 && (
        <div className="border-t border-cyber-border px-4 py-2 bg-cyber-card/50">
          <div className="flex gap-1 h-1 rounded-full overflow-hidden">
            {ORDER.map(s => counts[s] ? (
              <div
                key={s}
                className={`h-full transition-all duration-500 ${
                  s === 'critical' ? 'bg-red-500' :
                  s === 'high'     ? 'bg-orange-500' :
                  s === 'medium'   ? 'bg-yellow-500' :
                  s === 'low'      ? 'bg-blue-500' : 'bg-slate-600'
                }`}
                style={{ flex: counts[s] }}
              />
            ) : null)}
          </div>
          <p className="text-[10px] text-slate-600 mt-1.5 text-right">
            {findings.length} finding{findings.length !== 1 ? 's' : ''} total
          </p>
        </div>
      )}
    </div>
  )
}
