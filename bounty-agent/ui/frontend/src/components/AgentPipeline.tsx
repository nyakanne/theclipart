import { Search, Radar, Crosshair, Filter, FileText, Check } from 'lucide-react'

interface Props {
  phases: string[]
  currentPhase: string
  completedPhases: string[]
  status: string
}

const phaseConfig: Record<string, { label: string; icon: React.ElementType; desc: string }> = {
  discovery: { label: 'DISCOVERY',  icon: Search,    desc: 'H1 program selection' },
  recon:     { label: 'RECON',      icon: Radar,     desc: 'Subdomain + surface map' },
  hunting:   { label: 'HUNTING',    icon: Crosshair, desc: 'Nuclei + Shannon exploit' },
  triage:    { label: 'TRIAGE',     icon: Filter,    desc: 'Validate + dedup' },
  reporting: { label: 'REPORTING',  icon: FileText,  desc: 'Write + submit H1 report' },
}

export function AgentPipeline({ phases, currentPhase, completedPhases, status }: Props) {
  return (
    <div className="flex items-center gap-0">
      {phases.map((phase, i) => {
        const cfg = phaseConfig[phase]
        const Icon = cfg?.icon ?? Search
        const isActive    = phase === currentPhase && status === 'running'
        const isCompleted = completedPhases.includes(phase) || (status === 'done')
        const isError     = phase === currentPhase && status === 'error'
        const isPending   = !isActive && !isCompleted && !isError

        return (
          <div key={phase} className="flex items-center flex-1">
            {/* Node */}
            <div className="flex flex-col items-center flex-1">
              <div className={`
                relative flex flex-col items-center gap-2 px-4 py-2 rounded-lg transition-all duration-500
                ${isActive    ? 'bg-cyber-green/10 border border-cyber-green/40' :
                  isCompleted ? 'bg-cyber-blue/5 border border-cyber-blue/20' :
                  isError     ? 'bg-cyber-red/10 border border-cyber-red/40' :
                               'border border-transparent'}
              `}>
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500
                  ${isActive    ? 'bg-cyber-green/20 shadow-[0_0_16px_rgba(0,255,136,0.4)]' :
                    isCompleted ? 'bg-cyber-blue/15' :
                    isError     ? 'bg-cyber-red/20' :
                                 'bg-slate-800/50'}
                `}>
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-cyber-blue" />
                  ) : (
                    <Icon className={`w-4 h-4 transition-colors ${
                      isActive  ? 'text-cyber-green' :
                      isError   ? 'text-cyber-red' : 'text-slate-600'
                    }`} />
                  )}
                  {isActive && (
                    <div className="absolute inset-0 rounded-lg animate-ping bg-cyber-green/20 pointer-events-none" />
                  )}
                </div>
                <div className="text-center">
                  <div className={`text-[10px] font-bold tracking-widest ${
                    isActive    ? 'text-cyber-green' :
                    isCompleted ? 'text-cyber-blue' :
                    isError     ? 'text-cyber-red' : 'text-slate-600'
                  }`}>
                    {cfg?.label ?? phase.toUpperCase()}
                  </div>
                  <div className="text-[9px] text-slate-600 mt-0.5 hidden sm:block">
                    {cfg?.desc}
                  </div>
                </div>
              </div>
            </div>

            {/* Connector */}
            {i < phases.length - 1 && (
              <div className={`h-px w-8 flex-shrink-0 transition-all duration-500 ${
                completedPhases.includes(phase) || status === 'done'
                  ? 'bg-cyber-blue/40'
                  : 'bg-cyber-border'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
