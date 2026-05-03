import { useState, useEffect, useRef, useCallback } from 'react'
import { HuntLauncher } from './components/HuntLauncher'
import { AgentPipeline } from './components/AgentPipeline'
import { LiveFeed } from './components/LiveFeed'
import { FindingsBoard } from './components/FindingsBoard'
import { StatsBar } from './components/StatsBar'
import { HuntHeader } from './components/HuntHeader'

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface Finding {
  severity: Severity
  title: string
  url: string
  id?: string
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

const emptyHunt = (): HuntState => ({
  huntId: '',
  target: '',
  status: 'queued',
  branch: '',
  currentPhase: '',
  completedPhases: [],
  logs: [],
  findings: [],
  stats: { subdomains: 0, live_hosts: 0, cost_usd: 0 },
  startedAt: new Date().toISOString(),
})

export default function App() {
  const [hunt, setHunt] = useState<HuntState | null>(null)
  const [isLaunching, setIsLaunching] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  const connectWs = useCallback((huntId: string) => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${window.location.host}/ws/${huntId}`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      const event = JSON.parse(e.data)
      setHunt(prev => {
        if (!prev) return prev
        const next = { ...prev }

        if (event.type === 'init' && event.data.hunt) {
          const h = event.data.hunt
          next.status = h.status
          next.branch = h.branch
          next.findings = h.findings || []
          next.stats = h.stats || next.stats
          next.logs = event.data.logs || []
        }
        else if (event.type === 'phase') {
          next.currentPhase = event.data.phase
          next.completedPhases = event.data.completed || prev.completedPhases
        }
        else if (event.type === 'log') {
          next.logs = [...prev.logs.slice(-500), event.data.line]
        }
        else if (event.type === 'finding') {
          next.findings = [...prev.findings, event.data as Finding]
        }
        else if (event.type === 'stat') {
          next.stats = { ...prev.stats, [event.data.key]: event.data.value }
        }
        else if (event.type === 'complete') {
          next.status = event.data.status === 'stopped' ? 'stopped'
            : event.data.status === 'error' ? 'error' : 'done'
        }
        else if (event.type === 'error') {
          next.status = 'error'
          next.logs = [...prev.logs, `ERROR: ${event.data.message}`]
        }

        return next
      })
    }

    ws.onerror = () => {
      setHunt(prev => prev ? { ...prev, status: 'error' } : prev)
    }
  }, [])

  async function launchHunt(target: string, mode: string, minBounty: number) {
    setIsLaunching(true)
    try {
      const res = await fetch('/api/hunts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, mode, min_bounty: minBounty }),
      })
      const data = await res.json()
      const newHunt: HuntState = {
        ...emptyHunt(),
        huntId: data.hunt_id,
        target,
        status: 'queued',
        branch: `hunt/h1-${target}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        startedAt: new Date().toISOString(),
      }
      setHunt(newHunt)
      connectWs(data.hunt_id)
    } finally {
      setIsLaunching(false)
    }
  }

  async function stopHunt() {
    if (!hunt) return
    await fetch(`/api/hunts/${hunt.huntId}`, { method: 'DELETE' })
    setHunt(prev => prev ? { ...prev, status: 'stopped' } : prev)
  }

  return (
    <div className="scanlines min-h-screen bg-cyber-bg text-slate-200 font-mono overflow-hidden">
      {/* Ambient glow blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyber-green opacity-[0.03] rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyber-blue opacity-[0.03] rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyber-purple opacity-[0.02] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        {/* Top bar */}
        <HuntHeader hunt={hunt} onStop={stopHunt} />

        {/* Main content */}
        {!hunt ? (
          /* Landing — launcher centered */
          <div className="flex-1 flex items-center justify-center p-8">
            <HuntLauncher onLaunch={launchHunt} isLaunching={isLaunching} />
          </div>
        ) : (
          /* Mission control layout */
          <div className="flex-1 flex flex-col gap-0 overflow-hidden">
            {/* Agent pipeline */}
            <div className="border-b border-cyber-border px-6 py-4 bg-cyber-card/50">
              <AgentPipeline
                phases={PHASES}
                currentPhase={hunt.currentPhase}
                completedPhases={hunt.completedPhases}
                status={hunt.status}
              />
            </div>

            {/* Stats row */}
            <div className="border-b border-cyber-border px-6 py-2 bg-cyber-card/30">
              <StatsBar
                stats={hunt.stats}
                findingsCount={hunt.findings.length}
                branch={hunt.branch}
                status={hunt.status}
                startedAt={hunt.startedAt}
              />
            </div>

            {/* Split: logs + findings */}
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
