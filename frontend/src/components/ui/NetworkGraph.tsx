import { useEffect, useRef } from 'react'
import { Database, Users, FileText, Radio, ShieldAlert, Search } from 'lucide-react'

const CATEGORIES = [
  { label: 'People Search', count: 23, icon: Search },
  { label: 'Broker Sites',  count: 47, icon: Database },
  { label: 'Public Records',count: 12, icon: FileText },
  { label: 'Ad Networks',   count: 89, icon: Radio },
  { label: 'Breach Data',   count: 6,  icon: ShieldAlert },
  { label: 'Social Profiles',count: 19, icon: Users },
]

interface Props {
  size?: number
  animated?: boolean
  className?: string
}

export function NetworkGraph({ size = 340, animated = true, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)
  const tRef = useRef(0)

  // Particle positions (stable, seeded)
  const particles = useRef<Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }>>([])

  useEffect(() => {
    // Init particles
    const ps: typeof particles.current = []
    for (let i = 0; i < 60; i++) {
      const seed = i * 137.508
      ps.push({
        x: (seed * 7.3) % size,
        y: (seed * 13.7) % size,
        vx: ((seed * 0.3) % 1 - 0.5) * 0.3,
        vy: ((seed * 0.7) % 1 - 0.5) * 0.3,
        size: 0.5 + (seed % 1.5),
        alpha: 0.08 + (seed % 0.15),
      })
    }
    particles.current = ps

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cx = size / 2
    const cy = size / 2
    const orbitR = size * 0.33

    const nodeAngles = CATEGORIES.map((_, i) => (i / CATEGORIES.length) * Math.PI * 2 - Math.PI / 2)

    const draw = () => {
      const t = tRef.current
      ctx.clearRect(0, 0, size, size)

      // Dark background
      ctx.fillStyle = '#060608'
      ctx.fillRect(0, 0, size, size)

      // Subtle radial glow at center
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.55)
      bgGrad.addColorStop(0, 'rgba(150,0,0,0.07)')
      bgGrad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, size, size)

      // Animated particles
      particles.current.forEach(p => {
        if (animated) {
          p.x = (p.x + p.vx + size) % size
          p.y = (p.y + p.vy + size) % size
        }
        const blink = animated ? p.alpha + Math.sin(t * 0.5 + p.x) * 0.04 : p.alpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(220,38,38,${Math.max(0, blink)})`
        ctx.fill()
      })

      // Lines from center to nodes + animated pulse
      nodeAngles.forEach((angle, i) => {
        const nx = cx + Math.cos(angle) * orbitR
        const ny = cy + Math.sin(angle) * orbitR

        // Connecting line with gradient
        const lineGrad = ctx.createLinearGradient(cx, cy, nx, ny)
        lineGrad.addColorStop(0, 'rgba(220,38,38,0.5)')
        lineGrad.addColorStop(1, 'rgba(220,38,38,0.08)')
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(nx, ny)
        ctx.strokeStyle = lineGrad
        ctx.lineWidth = 0.8
        ctx.stroke()

        // Pulse dot travelling along line
        if (animated) {
          const prog = ((t * 0.35 + i * 0.18) % 1 + 1) % 1
          const px = cx + (nx - cx) * prog
          const py = cy + (ny - cy) * prog
          ctx.beginPath()
          ctx.arc(px, py, 1.8, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,100,80,${0.9 - prog * 0.6})`
          ctx.shadowColor = 'rgba(255,80,60,0.8)'
          ctx.shadowBlur = 4
          ctx.fill()
          ctx.shadowBlur = 0
        }
      })

      // Center shield glow rings
      const pulse = animated ? 1 + Math.sin(t * 1.8) * 0.12 : 1
      for (let ring = 2; ring >= 0; ring--) {
        const ringR = (22 + ring * 10) * pulse
        const ringGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ringR)
        ringGrad.addColorStop(0, `rgba(220,38,38,${0.18 - ring * 0.04})`)
        ringGrad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.beginPath()
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
        ctx.fillStyle = ringGrad
        ctx.fill()
      }

      // Center circle
      ctx.beginPath()
      ctx.arc(cx, cy, 20 * pulse, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(20,2,2,0.95)'
      ctx.fill()
      ctx.strokeStyle = `rgba(220,38,38,0.8)`
      ctx.lineWidth = 1.5
      ctx.stroke()

      if (animated) {
        tRef.current += 0.022
        frameRef.current = requestAnimationFrame(draw)
      }
    }

    draw()
    return () => cancelAnimationFrame(frameRef.current)
  }, [size, animated])

  const cx = size / 2
  const cy = size / 2
  const orbitR = size * 0.33
  const nodeAngles = CATEGORIES.map((_, i) => (i / CATEGORIES.length) * Math.PI * 2 - Math.PI / 2)

  return (
    <div className={`relative select-none ${className}`} style={{ width: size, height: size }}>
      <canvas ref={canvasRef} width={size} height={size} className="absolute inset-0" />

      {/* Center shield icon overlay */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: cx - 14,
          top: cy - 14,
          width: 28,
          height: 28,
          pointerEvents: 'none',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
          <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z" fill="rgba(220,38,38,0.25)" stroke="rgba(220,38,38,0.9)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Category label cards */}
      {CATEGORIES.map((cat, i) => {
        const angle = nodeAngles[i]
        const nx = cx + Math.cos(angle) * orbitR
        const ny = cy + Math.sin(angle) * orbitR
        const Icon = cat.icon
        return (
          <div
            key={cat.label}
            className="absolute pointer-events-none"
            style={{
              left: nx,
              top: ny,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="flex items-center gap-1.5 bg-gray-950/90 border border-red-950/60 rounded-lg px-2.5 py-1.5 backdrop-blur-sm shadow-lg shadow-black/60">
              <Icon className="h-3 w-3 text-red-500 flex-shrink-0" />
              <div className="flex flex-col leading-none">
                <span className="text-[9px] font-semibold text-gray-200 whitespace-nowrap">{cat.label}</span>
                <span className="text-[9px] text-red-500 font-bold">{cat.count}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
