import { Target, Square, GitBranch } from 'lucide-react'
import type { HuntState } from '../App'

interface Props {
  hunt: HuntState | null
  onStop: () => void
}

const statusColor: Record<string, string> = {
  queued:  'text-slate-400',
  running: 'text-cyber-green',
  done:    'text-cyber-blue',
  error:   'text-cyber-red',
  stopped: 'text-slate-500',
}

const statusLabel: Record<string, string> = {
  queued:  'QUEUED',
  running: 'HUNTING',
  done:    'COMPLETE',
  error:   'ERROR',
  stopped: 'STOPPED',
}

export function HuntHeader({ hunt, onStop }: Props) {
  const status = hunt?.status ?? 'idle'

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-cyber-border bg-cyber-card/80 backdrop-blur-sm">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-cyber-green/10 border border-cyber-green/30 flex items-center justify-center">
          <Target className="w-3.5 h-3.5 text-cyber-green" />
        </div>
        <span className="text-sm font-bold tracking-[0.25em] text-cyber-green">BOUNTY AGENT</span>
      </div>

      {/* Center — target + branch */}
      {hunt && (
        <div className="flex items-center gap-6 text-xs text-slate-500">
          <span className="text-slate-300">{hunt.target}</span>
          {hunt.branch && (
            <span className="flex items-center gap-1.5 text-cyber-blue/70">
              <GitBranch className="w-3 h-3" />
              {hunt.branch}
            </span>
          )}
        </div>
      )}

      {/* Right — status + stop */}
      <div className="flex items-center gap-4">
        {hunt && (
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${
              status === 'running' ? 'bg-cyber-green animate-pulse-green' :
              status === 'done'    ? 'bg-cyber-blue' :
              status === 'error'   ? 'bg-cyber-red' : 'bg-slate-600'
            }`} />
            <span className={`text-xs font-bold tracking-widest ${statusColor[status] ?? 'text-slate-400'}`}>
              {statusLabel[status] ?? status.toUpperCase()}
            </span>
          </div>
        )}

        {hunt && hunt.status === 'running' && (
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md
                       border border-cyber-red/30 text-cyber-red/70
                       hover:border-cyber-red/60 hover:text-cyber-red hover:bg-cyber-red/10
                       transition-all"
          >
            <Square className="w-3 h-3" />
            STOP
          </button>
        )}
      </div>
    </div>
  )
}
