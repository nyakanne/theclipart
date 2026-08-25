import { useState, useRef } from 'react'
import { Target, Zap, ChevronDown } from 'lucide-react'

interface Props {
  onLaunch: (target: string, mode: string, minBounty: number) => void
  isLaunching: boolean
}

export function HuntLauncher({ onLaunch, isLaunching }: Props) {
  const [target, setTarget] = useState('')
  const [mode, setMode] = useState('auto')
  const [minBounty, setMinBounty] = useState(100)
  const [showOptions, setShowOptions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!target.trim() || isLaunching) return
    onLaunch(target.trim(), mode, minBounty)
  }

  return (
    <div className="w-full max-w-2xl animate-fade-in">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-cyber-green/10 border border-cyber-green/30 flex items-center justify-center">
            <Target className="w-5 h-5 text-cyber-green" />
          </div>
          <span className="text-2xl font-bold tracking-[0.2em] text-cyber-green animate-glow">
            BOUNTY AGENT
          </span>
        </div>
        <p className="text-slate-500 text-sm tracking-wider">
          AUTONOMOUS BUG BOUNTY HUNTER · HACKERONE
        </p>
      </div>

      {/* Main launcher card */}
      <div className="bg-cyber-card border border-cyber-border rounded-xl p-8 glow-border">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target input */}
          <div>
            <label className="block text-xs text-slate-500 mb-2 tracking-widest uppercase">
              Target
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyber-green text-lg select-none">
                $
              </span>
              <input
                ref={inputRef}
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder="shopify  or  hackerone.com/shopify  or  https://target.com"
                className="w-full bg-black/40 border border-cyber-border rounded-lg pl-10 pr-4 py-4
                           text-slate-100 placeholder-slate-600 text-sm
                           focus:outline-none focus:border-cyber-green/60 focus:bg-black/60
                           transition-all duration-200"
                autoFocus
                disabled={isLaunching}
              />
            </div>
          </div>

          {/* Options toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ChevronDown
                className={`w-3 h-3 transition-transform ${showOptions ? 'rotate-180' : ''}`}
              />
              Options
            </button>

            {showOptions && (
              <div className="mt-4 grid grid-cols-2 gap-4 animate-slide-up">
                <div>
                  <label className="block text-xs text-slate-500 mb-2 tracking-widest uppercase">
                    Mode
                  </label>
                  <select
                    value={mode}
                    onChange={e => setMode(e.target.value)}
                    className="w-full bg-black/40 border border-cyber-border rounded-lg px-3 py-2.5
                               text-slate-300 text-sm focus:outline-none focus:border-cyber-green/40"
                  >
                    <option value="auto">Full auto</option>
                    <option value="dry_run">Dry run (no submit)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-2 tracking-widest uppercase">
                    Min bounty ($)
                  </label>
                  <input
                    type="number"
                    value={minBounty}
                    onChange={e => setMinBounty(Number(e.target.value))}
                    className="w-full bg-black/40 border border-cyber-border rounded-lg px-3 py-2.5
                               text-slate-300 text-sm focus:outline-none focus:border-cyber-green/40"
                    min={0}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Launch button */}
          <button
            type="submit"
            disabled={!target.trim() || isLaunching}
            className={`
              w-full py-4 rounded-lg font-bold tracking-[0.2em] text-sm uppercase
              flex items-center justify-center gap-3
              transition-all duration-300
              ${!target.trim() || isLaunching
                ? 'bg-cyber-green/10 text-cyber-green/30 border border-cyber-green/10 cursor-not-allowed'
                : 'bg-cyber-green/15 text-cyber-green border border-cyber-green/40 hover:bg-cyber-green/25 hover:border-cyber-green/70 hover:shadow-[0_0_30px_rgba(0,255,136,0.2)] active:scale-[0.99]'
              }
            `}
          >
            {isLaunching ? (
              <>
                <div className="w-4 h-4 border-2 border-cyber-green/30 border-t-cyber-green rounded-full animate-spin" />
                INITIALISING
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                LAUNCH HUNT
              </>
            )}
          </button>
        </form>
      </div>

      {/* Example targets */}
      <div className="mt-6 text-center space-y-2">
        <p className="text-xs text-slate-600">Quick targets</p>
        <div className="flex gap-2 justify-center flex-wrap">
          {['shopify', 'github', 'hackerone', 'twitter', 'coinbase'].map(t => (
            <button
              key={t}
              onClick={() => setTarget(t)}
              className="text-xs px-3 py-1 rounded-full border border-cyber-border text-slate-500
                         hover:border-cyber-green/30 hover:text-cyber-green/70 transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
