import { useEffect, useRef } from 'react'

interface Category {
  label: string
  count: number
  angle: number
}

const CATEGORIES: Omit<Category, 'angle'>[] = [
  { label: 'Broker Sites', count: 47 },
  { label: 'Public Records', count: 12 },
  { label: 'Ad Networks', count: 89 },
  { label: 'Breach Data', count: 6 },
  { label: 'Social Profiles', count: 19 },
  { label: 'People Search', count: 23 },
]

interface Props {
  size?: number
  animated?: boolean
  className?: string
}

export function NetworkGraph({ size = 340, animated = true, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)
  const t = useRef(0)

  const cx = size / 2
  const cy = size / 2
  const r = size * 0.36

  const cats: Category[] = CATEGORIES.map((c, i) => ({
    ...c,
    angle: (i / CATEGORIES.length) * Math.PI * 2 - Math.PI / 2,
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      ctx.clearRect(0, 0, size, size)

      // Draw lines from center to each node
      cats.forEach(cat => {
        const nx = cx + Math.cos(cat.angle) * r
        const ny = cy + Math.sin(cat.angle) * r

        // Faint connecting lines
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(nx, ny)
        ctx.strokeStyle = 'rgba(239,68,68,0.15)'
        ctx.lineWidth = 1
        ctx.stroke()

        // Animated pulse dot on line
        if (animated) {
          const progress = ((t.current * 0.4 + cat.angle) % (Math.PI * 2)) / (Math.PI * 2)
          const px = cx + Math.cos(cat.angle) * r * progress
          const py = cy + Math.sin(cat.angle) * r * progress
          ctx.beginPath()
          ctx.arc(px, py, 2, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(239,68,68,0.8)'
          ctx.fill()
        }

        // Node dot
        ctx.beginPath()
        ctx.arc(nx, ny, 5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(239,68,68,0.9)'
        ctx.shadowColor = 'rgba(239,68,68,0.8)'
        ctx.shadowBlur = 10
        ctx.fill()
        ctx.shadowBlur = 0

        // Scatter dots around each node
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          const dr = 12 + Math.sin(t.current * 0.5 + i) * 3
          ctx.beginPath()
          ctx.arc(nx + Math.cos(a) * dr, ny + Math.sin(a) * dr, 1, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(239,68,68,0.3)'
          ctx.fill()
        }
      })

      // Cross-connections between adjacent nodes
      cats.forEach((cat, i) => {
        const next = cats[(i + 1) % cats.length]
        const skip = cats[(i + 2) % cats.length]
        const nx1 = cx + Math.cos(cat.angle) * r
        const ny1 = cy + Math.sin(cat.angle) * r
        const nx2 = cx + Math.cos(next.angle) * r
        const ny2 = cy + Math.sin(next.angle) * r
        const nx3 = cx + Math.cos(skip.angle) * r
        const ny3 = cy + Math.sin(skip.angle) * r

        ctx.beginPath()
        ctx.moveTo(nx1, ny1)
        ctx.lineTo(nx2, ny2)
        ctx.strokeStyle = 'rgba(239,68,68,0.08)'
        ctx.lineWidth = 0.5
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(nx1, ny1)
        ctx.lineTo(nx3, ny3)
        ctx.strokeStyle = 'rgba(239,68,68,0.05)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      })

      // Center shield glow
      const pulse = animated ? 1 + Math.sin(t.current * 2) * 0.15 : 1
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30 * pulse)
      grad.addColorStop(0, 'rgba(239,68,68,0.4)')
      grad.addColorStop(0.5, 'rgba(239,68,68,0.1)')
      grad.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(cx, cy, 30 * pulse, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      // Center dot
      ctx.beginPath()
      ctx.arc(cx, cy, 8, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(239,68,68,1)'
      ctx.shadowColor = 'rgba(239,68,68,1)'
      ctx.shadowBlur = 20
      ctx.fill()
      ctx.shadowBlur = 0

      // Background scatter dots
      for (let i = 0; i < 40; i++) {
        const seed = i * 137.508
        const bx = (seed * 7.3) % size
        const by = (seed * 13.7) % size
        const alpha = animated ? 0.1 + Math.sin(t.current * 0.3 + i) * 0.05 : 0.08
        ctx.beginPath()
        ctx.arc(bx, by, 0.8, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(239,68,68,${alpha})`
        ctx.fill()
      }

      if (animated) {
        t.current += 0.02
        frameRef.current = requestAnimationFrame(draw)
      }
    }

    draw()
    return () => cancelAnimationFrame(frameRef.current)
  }, [size, animated])

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <canvas ref={canvasRef} width={size} height={size} />
      {/* Labels */}
      {cats.map(cat => {
        const nx = cx + Math.cos(cat.angle) * r * 1.32
        const ny = cy + Math.sin(cat.angle) * r * 1.32
        const isRight = nx > cx
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
            <div className={`flex flex-col ${isRight ? 'items-start' : 'items-end'} gap-0.5`}>
              <span className="text-[10px] font-semibold text-gray-300 whitespace-nowrap">{cat.label}</span>
              <span className="text-[10px] text-gray-500">{cat.count} sources</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
