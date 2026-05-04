import { useState, useEffect, useRef, useCallback } from 'react'
import { HuntLauncher } from './components/HuntLauncher'
import { AgentPipeline } from './components/AgentPipeline'
import { LiveFeed } from './components/LiveFeed'
import { FindingsBoard } from './components/FindingsBoard'
import { StatsBar } from './components/StatsBar'
import { HuntHeader } from './components/HuntHeader'
import { startHunt, stopHunt as apiStop, openEventStream } from './api'

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface Finding {
  severity: Severity
  title: string
  url: string
}

export interface HuntState {
  huntId: string
  target: string
  status: 'queued' | 'running' | 'done' | 'error' | 'stopped'
  branch: string
  currentPhase: string
  completedPhases: string[]
  logs: string[]
  findings: Finding[]
  stats: { subdomains: number; live_hosts: number; cost_usd: number }
  startedAt: string
}

const PHASES = ['discovery', 'recon', 'hunting', 'triage', 'reporting']

export default function App() {
  const [hunt, setHunt] = useState<HuntState | null>(null)
  const [isLaunching, setIsLaunching] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  const applyEvent = useCallback((event: Record<string, unknown>) => {
    setHunt(prev => {
      if (!prev) return prev
      const next = { ...prev }
      const d = (event.data ?? {}) as Record<string, unknown>

      switch (event.type) {
        case 'init': {
          const h = (d.hunt ?? {}) as Record<string, unknown>
          next.status   = (h.status as HuntState['status']) ?? prev.status
          next.branch   = (h.branch as string) ?? prev.branch
          next.findings = (h.findings as Finding[]) ?? prev.findings
          next.stats    = (h.stats as HuntState['stats']) ?? prev.stats
          next.logs     = (d.logs as string[]) ?? prev.logs
          break
        }
        case 'phase':
          next.currentPhase    = (d.phase as string) ?? prev.currentPhase
          next.completedPhases = (d.completed as string[]) ?? prev.completedPhases
          break
        case 'log':
          next.logs = [...prev.logs.slice(-500), d.line as string]
          break
        case 'finding':
          next.findings = [...prev.findings, d as unknown as Finding]
          break
        case 'stat':
          next.stats = { ...prev.stats, [(d.key as string)]: d.value }
          break
        case 'complete':
          next.status = (d.status === 'stopped' ? 'stopped'
            : d.status === 'error' ? 'error' : 'done') as HuntState['status']
          break
        case 'error':
          next.status = 'error'
          next.logs   = [...prev.logs, `ERROR: ${d.message}`]
          break
      }
      return next
    })
  }, [])

  function connectSSE(huntId: string) {
    esRef.current?.close()
    esRef.current = openEventStream(huntId, applyEvent, () => {
      setHunt(prev => prev ? { ...prev, status: 'error' } : prev)
    })
  }

  // Reconnect SSE whenever hunt ID changes
  useEffect(() => {
    if (hunt?.huntId) connectSSE(hunt.huntId)
    return () => esRef.current?.close()
  }, [hunt?.huntId])   // eslint-disable-line react-hooks/exhaustive-deps

  async function launchHunt(target: string, mode: string, minBounty: number) {
    setIsLaunching(true)
    try {
      const data = await startHunt(target, mode, minBounty)
      setHunt({
        huntId:           data.hunt_id,
        target,
        status:           'queued',
        branch:           `hunt/h1-${target}-${new Date().toISOString().slice(0,10).replace(/-/g,'')}`,
        currentPhase:     '',
        completedPhases:  [],
        logs:             [],
        findings:         [],
        stats:            { subdomains: 0, live_hosts: 0, cost_usd: 0 },
        startedAt:        new Date().toISOString(),
      })
    } finally {
      setIsLaunching(false)
    }
  }

  async function stopHunt() {
    if (!hunt) return
    await apiStop(hunt.huntId)
    setHunt(prev => prev ? { ...prev, status: 'stopped' } : prev)
  }

  return (
    <div className="scanlines min-h-screen bg-cyber-bg text-slate-200 font-mono overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyber-green opacity-[0.03] rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyber-blue opacity-[0.03] rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyber-purple opacity-[0.02] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        <HuntHeader hunt={hunt} onStop={stopHunt} />

        {!hunt ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <HuntLauncher onLaunch={launchHunt} isLaunching={isLaunching} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-0 overflow-hidden">
            <div className="border-b border-cyber-border px-6 py-4 bg-cyber-card/50">
              <AgentPipeline
                phases={PHASES}
                currentPhase={hunt.currentPhase}
                completedPhases={hunt.completedPhases}
                status={hunt.status}
              />
            </div>
            <div className="border-b border-cyber-border px-6 py-2 bg-cyber-card/30">
              <StatsBar
                stats={hunt.stats}
                findingsCount={hunt.findings.length}
                branch={hunt.branch}
                status={hunt.status}
                startedAt={hunt.startedAt}
              />
            </div>
            <div className="flex-1 flex overflow-hidden">
              <LiveFeed logs={hunt.logs} />
              <FindingsBoard findings={hunt.findings} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
