import { useEffect, useRef } from 'react'
import { Database, Users, FileText, Radio, ShieldAlert, Search } from 'lucide-react'

const CATS = [
  { label: 'People Search', sublabel: 'Sites', count: 23, Icon: Search,     deg: -108 },
  { label: 'Broker Sites',  sublabel: '',       count: 47, Icon: Database,   deg: -36  },
  { label: 'Public Records',sublabel: '',       count: 12, Icon: FileText,   deg:  36  },
  { label: 'Ad Networks',   sublabel: '',       count: 89, Icon: Radio,      deg: 108  },
  { label: 'Breach Data',   sublabel: '',       count:  6, Icon: ShieldAlert,deg: 180  },
  { label: 'Social Profiles',sublabel: '',      count: 19, Icon: Users,      deg: 252  },
]

interface Props {
  size?: number
  animated?: boolean
  className?: string
}

interface Particle { x: number; y: number; vx: number; vy: number; r: number; a: number }

export function NetworkGraph({ size = 360, animated = true, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const tRef = useRef(0)
  const psRef = useRef<Particle[]>([])

  const cx = size / 2
  const cy = size / 2
  const orbitR = size * 0.37
  const nodeR = Math.max(22, size * 0.085)

  const nodes = CATS.map(c => {
    const rad = c.deg * Math.PI / 180
    return { ...c, x: cx + Math.cos(rad) * orbitR, y: cy + Math.sin(rad) * orbitR }
  })

  useEffect(() => {
    const ps: Particle[] = []
    for (let i = 0; i < 130; i++) {
      const seed = i * 137.508
      ps.push({
        x: (seed * 7.3) % size,
        y: (seed * 13.7) % size,
        vx: ((seed * 0.47) % 1 - 0.5) * 0.22,
        vy: ((seed * 0.83) % 1 - 0.5) * 0.22,
        r: 0.5 + (seed % 1.4),
        a: 0.08 + (seed % 0.28),
      })
    }
    psRef.current = ps

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const draw = () => {
      const t = tRef.current
      ctx.clearRect(0, 0, size, size)
      ctx.fillStyle = '#040406'
      ctx.fillRect(0, 0, size, size)

      // Radial background glow
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.55)
      bg.addColorStop(0, 'rgba(140,0,0,0.10)')
      bg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, size, size)

      // Particles + constellation lines
      const pp = psRef.current
      if (animated) pp.forEach(p => { p.x = ((p.x + p.vx) + size) % size; p.y = ((p.y + p.vy) + size) % size })

      for (let i = 0; i < pp.length; i++) {
        for (let j = i + 1; j < pp.length; j++) {
          const dx = pp[i].x - pp[j].x, dy = pp[i].y - pp[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 50) {
            ctx.beginPath()
            ctx.moveTo(pp[i].x, pp[i].y)
            ctx.lineTo(pp[j].x, pp[j].y)
            ctx.strokeStyle = `rgba(160,30,30,${(1 - d / 50) * 0.18})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      pp.forEach((p, i) => {
        const a = p.a + Math.sin(t * 0.4 + i * 0.31) * 0.05
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(210,70,60,${Math.max(0, a)})`
        ctx.fill()
      })

      // Concentric rings
      for (let ring = 3; ring >= 1; ring--) {
        const rr = size * 0.085 * ring * (1 + Math.sin(t * 1.1) * 0.03)
        ctx.beginPath()
        ctx.arc(cx, cy, rr, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(220,38,38,${0.35 - ring * 0.07})`
        ctx.lineWidth = 1.5 - ring * 0.3
        ctx.shadowColor = 'rgba(220,38,38,0.6)'
        ctx.shadowBlur = 8
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Lines + animated dots
      nodes.forEach((n, i) => {
        const grad = ctx.createLinearGradient(cx, cy, n.x, n.y)
        grad.addColorStop(0, 'rgba(220,38,38,0.7)')
        grad.addColorStop(1, 'rgba(220,38,38,0.06)')
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(n.x, n.y)
        ctx.strokeStyle = grad
        ctx.lineWidth = 0.9
        ctx.stroke()

        if (animated) {
          const prog = ((t * 0.28 + i * 0.19) % 1 + 1) % 1
          const px = cx + (n.x - cx) * prog
          const py = cy + (n.y - cy) * prog
          ctx.beginPath()
          ctx.arc(px, py, 2.2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,110,80,${0.95 - prog * 0.55})`
          ctx.shadowColor = 'rgba(255,70,40,0.9)'
          ctx.shadowBlur = 7
          ctx.fill()
          ctx.shadowBlur = 0
        }
      })

      if (animated) {
        tRef.current += 0.018
        rafRef.current = requestAnimationFrame(draw)
      }
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [size, animated])

  return (
    <div className={`relative select-none flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      <canvas ref={canvasRef} width={size} height={size} className="absolute inset-0" />

      {/* Center shield */}
      <div className="absolute" style={{ left: cx, top: cy, transform: 'translate(-50%,-50%)' }}>
        <div className="relative" style={{ width: nodeR * 2.7, height: nodeR * 2.7 }}>
          <div className="absolute inset-0 rounded-full border border-red-700/20 animate-ping" style={{ animationDuration: '3.5s' }} />
          <div className="absolute inset-[12%] rounded-full border border-red-700/35" />
          <div className="absolute inset-[22%] rounded-full bg-gradient-to-br from-red-950/90 to-black border border-red-600/70 flex items-center justify-center"
            style={{ boxShadow: '0 0 24px rgba(220,38,38,0.5), inset 0 0 12px rgba(220,38,38,0.1)' }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-[45%] h-[45%]">
              <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"
                fill="rgba(220,38,38,0.25)" stroke="rgba(220,38,38,1)" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Category nodes */}
      {nodes.map(n => {
        const Icon = n.Icon
        return (
          <div key={n.label} className="absolute flex flex-col items-center"
            style={{ left: n.x, top: n.y, transform: 'translate(-50%,-50%)' }}>
            <div className="relative" style={{ width: nodeR * 2, height: nodeR * 2 }}>
              <div className="absolute inset-0 rounded-full bg-gray-950 border border-gray-800/80 flex items-center justify-center transition-colors hover:border-red-900/50"
                style={{ boxShadow: '0 0 14px rgba(0,0,0,0.9), 0 0 6px rgba(220,38,38,0.08)' }}>
                <Icon style={{ width: nodeR * 0.55, height: nodeR * 0.55 }} className="text-red-500/80" />
              </div>
              <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 rounded-full bg-red-600 border-2 border-black flex items-center justify-center px-1"
                style={{ boxShadow: '0 0 6px rgba(220,38,38,0.7)' }}>
                <span className="text-[9px] font-bold text-white leading-none">{n.count}</span>
              </div>
            </div>
            <div className="mt-1.5 text-center" style={{ width: nodeR * 2.6 }}>
              <div className="text-[10px] font-semibold text-gray-200 leading-tight whitespace-nowrap">{n.label}</div>
              {n.sublabel && <div className="text-[9px] text-gray-600">{n.sublabel}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
