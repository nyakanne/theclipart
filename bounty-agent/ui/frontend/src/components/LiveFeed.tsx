import { useEffect, useRef } from 'react'
import { Terminal } from 'lucide-react'

interface Props { logs: string[] }

function colorize(line: string): string {
  if (line.includes('[CRITICAL]') || line.includes('ERROR') || line.includes('❌'))
    return 'text-cyber-red'
  if (line.includes('[HIGH]') || line.includes('⚠'))
    return 'text-cyber-orange'
  if (line.includes('[MEDIUM]') || line.includes('warn'))
    return 'text-cyber-yellow'
  if (line.includes('✅') || line.includes('[ok]') || line.includes('→') || line.includes('hunt:'))
    return 'text-cyber-green'
  if (line.includes('recon:') || line.includes('subfinder') || line.includes('httpx') || line.includes('nuclei'))
    return 'text-cyber-blue'
  if (line.includes('[INFO]') || line.includes('ℹ'))
    return 'text-slate-400'
  return 'text-slate-500'
}

export function LiveFeed({ logs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const userScrolled = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el || userScrolled.current) return
    el.scrollTop = el.scrollHeight
  }, [logs])

  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    userScrolled.current = el.scrollHeight - el.scrollTop - el.clientHeight > 40
  }

  return (
    <div className="flex-1 flex flex-col border-r border-cyber-border min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-cyber-border bg-cyber-card/50">
        <Terminal className="w-3.5 h-3.5 text-slate-600" />
        <span className="text-xs text-slate-600 tracking-wider">LIVE FEED</span>
        <span className="ml-auto text-xs text-slate-700">{logs.length} lines</span>
      </div>

      {/* Log lines */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-0.5"
        style={{ fontFamily: 'JetBrains Mono, Fira Code, monospace', fontSize: '11px', lineHeight: '1.6' }}
      >
        {logs.length === 0 ? (
          <div className="flex items-center gap-2 text-slate-700 py-4">
            <div className="w-1.5 h-4 bg-cyber-green/60 animate-pulse rounded-sm" />
            <span>Waiting for agent output...</span>
          </div>
        ) : (
          logs.map((line, i) => (
            <div key={i} className={`${colorize(line)} whitespace-pre-wrap break-all leading-relaxed`}>
              <span className="text-slate-700 select-none mr-3">{String(i + 1).padStart(4, ' ')}</span>
              {line}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
