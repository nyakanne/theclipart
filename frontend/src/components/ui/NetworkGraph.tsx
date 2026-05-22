import { useEffect, useRef } from 'react'
import { Database, Users, FileText, Radio, ShieldAlert, Search } from 'lucide-react'

export const CATS = [
  { label: 'People Search', sub: 'Sites',    count: 23, Icon: Search,     deg: -108 },
  { label: 'Broker Sites',  sub: '',          count: 47, Icon: Database,   deg: -36  },
  { label: 'Public Records',sub: '',          count: 12, Icon: FileText,   deg:  36  },
  { label: 'Ad Networks',   sub: '',          count: 89, Icon: Radio,      deg: 108  },
  { label: 'Breach Data',   sub: '',          count:  6, Icon: ShieldAlert,deg: 180  },
  { label: 'Social Profiles',sub: '',         count: 19, Icon: Users,      deg: 252  },
]

interface Particle { x: number; y: number; vx: number; vy: number; r: number; a: number }

interface Props {
  size?: number
  animated?: boolean
  className?: string
  /** 'cards' renders DataGuard-style floating panel nodes */
  variant?: 'dots' | 'cards'
  /** Override counts from real scan data */
  counts?: Partial<Record<string, number>>
}

export function NetworkGraph({ size = 360, animated = true, className = '', variant = 'dots', counts }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const tRef = useRef(0)
  const psRef = useRef<Particle[]>([])

  const cx = size / 2
  const cy = size / 2
  const orbitR = size * 0.36
  const nodeR = Math.max(22, size * 0.082)

  const nodes = CATS.map(c => {
    const rad = c.deg * Math.PI / 180
    return { ...c, x: cx + Math.cos(rad) * orbitR, y: cy + Math.sin(rad) * orbitR, count: counts?.[c.label] ?? c.count }
  })

  useEffect(() => {
    const ps: Particle[] = []
    for (let i = 0; i < 140; i++) {
      const s = i * 137.508
      ps.push({ x: (s * 7.3) % size, y: (s * 13.7) % size, vx: ((s * 0.47) % 1 - 0.5) * 0.2, vy: ((s * 0.83) % 1 - 0.5) * 0.2, r: 0.5 + (s % 1.5), a: 0.07 + (s % 0.25) })
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

      // Radial bg glow
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.56)
      bg.addColorStop(0, 'rgba(120,0,0,0.13)')
      bg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size)

      // Particles
      const pp = psRef.current
      if (animated) pp.forEach(p => { p.x = ((p.x + p.vx) + size) % size; p.y = ((p.y + p.vy) + size) % size })
      for (let i = 0; i < pp.length; i++) {
        for (let j = i + 1; j < pp.length; j++) {
          const dx = pp[i].x - pp[j].x, dy = pp[i].y - pp[j].y, d = Math.hypot(dx, dy)
          if (d < 48) { ctx.beginPath(); ctx.moveTo(pp[i].x, pp[i].y); ctx.lineTo(pp[j].x, pp[j].y); ctx.strokeStyle = `rgba(160,30,30,${(1 - d / 48) * 0.18})`; ctx.lineWidth = 0.4; ctx.stroke() }
        }
      }
      pp.forEach((p, i) => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(210,70,60,${Math.max(0, p.a + Math.sin(t * 0.4 + i * 0.31) * 0.04)})`; ctx.fill()
      })

      // Concentric rings
      for (let ring = 3; ring >= 1; ring--) {
        const rr = size * 0.083 * ring * (1 + Math.sin(t * 1.1) * 0.03)
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(220,38,38,${0.36 - ring * 0.08})`; ctx.lineWidth = 1.5 - ring * 0.3
        ctx.shadowColor = 'rgba(220,38,38,0.6)'; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0
      }

      // Lines + animated dots center→nodes
      nodes.forEach((n, i) => {
        const grad = ctx.createLinearGradient(cx, cy, n.x, n.y)
        grad.addColorStop(0, 'rgba(220,38,38,0.75)'); grad.addColorStop(1, 'rgba(220,38,38,0.05)')
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(n.x, n.y)
        ctx.strokeStyle = grad; ctx.lineWidth = 0.9; ctx.stroke()
        if (animated) {
          const prog = ((t * 0.28 + i * 0.19) % 1 + 1) % 1
          const px = cx + (n.x - cx) * prog, py = cy + (n.y - cy) * prog
          ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,110,80,${0.95 - prog * 0.5})`
          ctx.shadowColor = 'rgba(255,70,40,0.9)'; ctx.shadowBlur = 7; ctx.fill(); ctx.shadowBlur = 0
        }
      })

      if (animated) { tRef.current += 0.018; rafRef.current = requestAnimationFrame(draw) }
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [size, animated])

  if (variant === 'cards') {
    // Full-width card variant — canvas is fixed 700×480, nodes are DOM card panels
    const W = 700, H = 460
    const ccx = W / 2, ccy = H / 2
    const cardOrbit = Math.min(W, H) * 0.36

    const cardNodes = CATS.map(c => {
      const rad = c.deg * Math.PI / 180
      return { ...c, x: ccx + Math.cos(rad) * cardOrbit, y: ccy + Math.sin(rad) * cardOrbit, count: counts?.[c.label] ?? c.count }
    })

    return (
      <div className={`relative w-full select-none ${className}`} style={{ height: H }}>
        {/* Canvas background */}
        <CardCanvas width={W} height={H} nodes={cardNodes} animated={animated} />

        {/* Center Shield */}
        <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
          <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
            <div className="absolute inset-0 rounded-full border border-red-700/25 animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-[10%] rounded-full border border-red-700/40" />
            <div className="absolute inset-[22%] rounded-full bg-gradient-to-br from-red-950/95 to-black border-2 border-red-600/80 flex items-center justify-center"
              style={{ boxShadow: '0 0 30px rgba(220,38,38,0.55), inset 0 0 15px rgba(220,38,38,0.12)' }}>
              <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8">
                <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"
                  fill="rgba(220,38,38,0.3)" stroke="rgba(220,38,38,1)" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card nodes */}
        {cardNodes.map(n => {
          const Icon = n.Icon
          // Determine alignment based on position
          const isLeft = n.x < ccx - 20
          const pct_x = (n.x / W) * 100
          const pct_y = (n.y / H) * 100
          return (
            <div key={n.label} className="absolute" style={{ left: `${pct_x}%`, top: `${pct_y}%`, transform: 'translate(-50%,-50%)' }}>
              <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border border-gray-800/80 backdrop-blur-sm
                hover:border-red-900/50 transition-colors cursor-default
                ${isLeft ? 'flex-row-reverse' : ''}`}
                style={{ background: 'rgba(14,14,18,0.92)', minWidth: 140, boxShadow: '0 4px 24px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)' }}>
                <div className="h-9 w-9 rounded-xl bg-red-950/40 border border-red-900/30 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-red-500" />
                </div>
                <div className={isLeft ? 'text-right' : ''}>
                  <div className="text-[11px] font-bold text-white leading-tight">{n.label}</div>
                  <div className="text-[10px] text-red-400 font-semibold">{n.count} Sources</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Default dot variant
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
              <div className="absolute inset-0 rounded-full bg-gray-950 border border-gray-800/80 flex items-center justify-center hover:border-red-900/50 transition-colors"
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
              {n.sub && <div className="text-[9px] text-gray-600">{n.sub}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Separate canvas for card variant
function CardCanvas({ width, height, nodes, animated }: { width: number; height: number; nodes: Array<{x:number;y:number}>; animated: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const tRef = useRef(0)
  const psRef = useRef<Particle[]>([])
  const cx = width / 2, cy = height / 2

  useEffect(() => {
    const ps: Particle[] = []
    for (let i = 0; i < 160; i++) {
      const s = i * 137.508
      ps.push({ x: (s * 7.3) % width, y: (s * 13.7) % height, vx: ((s * 0.47) % 1 - 0.5) * 0.2, vy: ((s * 0.83) % 1 - 0.5) * 0.2, r: 0.5 + (s % 1.5), a: 0.07 + (s % 0.22) })
    }
    psRef.current = ps
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const draw = () => {
      const t = tRef.current
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#040406'; ctx.fillRect(0, 0, width, height)
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * 0.6)
      bg.addColorStop(0, 'rgba(100,0,0,0.14)'); bg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height)

      const pp = psRef.current
      if (animated) pp.forEach(p => { p.x = ((p.x + p.vx) + width) % width; p.y = ((p.y + p.vy) + height) % height })
      for (let i = 0; i < pp.length; i++) for (let j = i + 1; j < pp.length; j++) {
        const d = Math.hypot(pp[i].x - pp[j].x, pp[i].y - pp[j].y)
        if (d < 50) { ctx.beginPath(); ctx.moveTo(pp[i].x, pp[i].y); ctx.lineTo(pp[j].x, pp[j].y); ctx.strokeStyle = `rgba(150,25,25,${(1-d/50)*0.16})`; ctx.lineWidth=0.4; ctx.stroke() }
      }
      pp.forEach((p,i) => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fillStyle=`rgba(210,65,55,${Math.max(0,p.a+Math.sin(t*0.4+i*0.3)*0.04)})`; ctx.fill() })

      ;[3,2,1].forEach(ring => {
        const rr = 42 * ring * (1 + Math.sin(t*1.1)*0.03)
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI*2)
        ctx.strokeStyle=`rgba(220,38,38,${0.35-ring*0.07})`; ctx.lineWidth=1.5-ring*0.3
        ctx.shadowColor='rgba(220,38,38,0.6)'; ctx.shadowBlur=8; ctx.stroke(); ctx.shadowBlur=0
      })

      ;(nodes as unknown as Array<{x:number;y:number}>).forEach((n, i) => {
        const grad = ctx.createLinearGradient(cx, cy, n.x, n.y)
        grad.addColorStop(0,'rgba(220,38,38,0.8)'); grad.addColorStop(1,'rgba(220,38,38,0.04)')
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(n.x,n.y); ctx.strokeStyle=grad; ctx.lineWidth=0.9; ctx.stroke()
        if (animated) {
          const prog = ((t*0.28+i*0.19)%1+1)%1
          const px=cx+(n.x-cx)*prog, py=cy+(n.y-cy)*prog
          ctx.beginPath(); ctx.arc(px,py,2.5,0,Math.PI*2)
          ctx.fillStyle=`rgba(255,110,80,${0.95-prog*0.5})`; ctx.shadowColor='rgba(255,70,40,0.9)'; ctx.shadowBlur=7; ctx.fill(); ctx.shadowBlur=0
        }
      })

      if (animated) { tRef.current += 0.018; rafRef.current = requestAnimationFrame(draw) }
    }
    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return <canvas ref={canvasRef} width={width} height={height} className="absolute inset-0 w-full h-full" style={{ objectFit: 'cover' }} />
}
