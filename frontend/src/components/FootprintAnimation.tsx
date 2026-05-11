import { useEffect, useRef, useState } from 'react'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  label: string
  type: 'core' | 'broker' | 'data'
  radius: number
  opacity: number
  targetOpacity: number
  revealDelay: number
}

interface Edge {
  from: number
  to: number
  opacity: number
  targetOpacity: number
  revealDelay: number
}

const CORE_LABELS = ['YOU']
const DATA_LABELS = ['Name', 'Email', 'Phone', 'Address', 'DOB', 'IP', 'Photos', 'Family']
const BROKER_LABELS = ['Spokeo', 'WhitePages', 'BeenVerified', 'Intelius', 'PeopleFinder', 'Radaris', 'MyLife', 'ZabaSearch']

export function FootprintAnimation({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'scanning' | 'revealing' | 'done'>('scanning')
  const [progress, setProgress] = useState(0)
  const animRef = useRef<number>()
  const startTimeRef = useRef<number>(0)
  const nodesRef = useRef<Node[]>([])
  const edgesRef = useRef<Edge[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const cx = canvas.width / 2
    const cy = canvas.height / 2

    // Build nodes
    const nodes: Node[] = []

    // Core node
    nodes.push({ x: cx, y: cy, vx: 0, vy: 0, label: 'YOU', type: 'core', radius: 28, opacity: 0, targetOpacity: 1, revealDelay: 0.3 })

    // Data nodes in inner ring
    DATA_LABELS.forEach((label, i) => {
      const angle = (i / DATA_LABELS.length) * Math.PI * 2
      const r = 120
      nodes.push({
        x: cx + Math.cos(angle) * r + (Math.random() - 0.5) * 20,
        y: cy + Math.sin(angle) * r + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        label, type: 'data', radius: 14, opacity: 0, targetOpacity: 0.85,
        revealDelay: 0.5 + i * 0.08
      })
    })

    // Broker nodes in outer ring
    BROKER_LABELS.forEach((label, i) => {
      const angle = (i / BROKER_LABELS.length) * Math.PI * 2 + 0.3
      const r = 220 + Math.random() * 40
      nodes.push({
        x: cx + Math.cos(angle) * r + (Math.random() - 0.5) * 30,
        y: cy + Math.sin(angle) * r + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        label, type: 'broker', radius: 18, opacity: 0, targetOpacity: 0.7,
        revealDelay: 1.2 + i * 0.1
      })
    })

    // Build edges
    const edges: Edge[] = []
    // Core to data
    nodes.forEach((n, i) => {
      if (n.type === 'data') {
        edges.push({ from: 0, to: i, opacity: 0, targetOpacity: 0.4, revealDelay: n.revealDelay + 0.1 })
      }
    })
    // Data to brokers
    const dataNodes = nodes.filter((_, i) => nodes[i]?.type === 'data')
    nodes.forEach((n, i) => {
      if (n.type === 'broker') {
        const dataIdx = Math.floor(Math.random() * DATA_LABELS.length) + 1
        edges.push({ from: dataIdx, to: i, opacity: 0, targetOpacity: 0.25, revealDelay: n.revealDelay + 0.1 })
        if (Math.random() > 0.4) {
          const dataIdx2 = Math.floor(Math.random() * DATA_LABELS.length) + 1
          edges.push({ from: dataIdx2, to: i, opacity: 0, targetOpacity: 0.2, revealDelay: n.revealDelay + 0.2 })
        }
      }
    })

    nodesRef.current = nodes
    edgesRef.current = edges

    const TOTAL_DURATION = 4200

    const draw = (ts: number) => {
      if (!startTimeRef.current) startTimeRef.current = ts
      const elapsed = ts - startTimeRef.current
      const t = Math.min(elapsed / TOTAL_DURATION, 1)

      setProgress(Math.round(t * 100))

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Background
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Subtle radial glow at center
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 300)
      grad.addColorStop(0, 'rgba(180,0,0,0.08)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw edges
      edges.forEach(edge => {
        const targetOp = elapsed / 1000 > edge.revealDelay ? edge.targetOpacity : 0
        edge.opacity += (targetOp - edge.opacity) * 0.05

        if (edge.opacity < 0.01) return
        const from = nodes[edge.from]
        const to = nodes[edge.to]

        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.strokeStyle = `rgba(220,38,38,${edge.opacity})`
        ctx.lineWidth = 0.8
        ctx.stroke()

        // Animated pulse along edge
        if (edge.opacity > 0.1 && Math.random() < 0.02) {
          const px = from.x + (to.x - from.x) * ((ts * 0.0003) % 1)
          const py = from.y + (to.y - from.y) * ((ts * 0.0003) % 1)
          ctx.beginPath()
          ctx.arc(px, py, 2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,100,100,${edge.opacity * 2})`
          ctx.fill()
        }
      })

      // Update and draw nodes
      nodes.forEach(node => {
        // Gentle float
        node.x += node.vx
        node.y += node.vy
        if (node.type !== 'core') {
          node.vx += (Math.random() - 0.5) * 0.01
          node.vy += (Math.random() - 0.5) * 0.01
          node.vx *= 0.99
          node.vy *= 0.99
        }

        const targetOp = elapsed / 1000 > node.revealDelay ? node.targetOpacity : 0
        node.opacity += (targetOp - node.opacity) * 0.06

        if (node.opacity < 0.01) return

        const { x, y, radius, label, type } = node

        // Glow
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.5)
        if (type === 'core') {
          glow.addColorStop(0, `rgba(220,38,38,${node.opacity * 0.6})`)
          glow.addColorStop(1, 'rgba(0,0,0,0)')
        } else if (type === 'broker') {
          glow.addColorStop(0, `rgba(180,0,0,${node.opacity * 0.3})`)
          glow.addColorStop(1, 'rgba(0,0,0,0)')
        } else {
          glow.addColorStop(0, `rgba(239,68,68,${node.opacity * 0.25})`)
          glow.addColorStop(1, 'rgba(0,0,0,0)')
        }
        ctx.beginPath()
        ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // Node circle
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        if (type === 'core') {
          ctx.fillStyle = `rgba(30,0,0,${node.opacity})`
          ctx.fill()
          ctx.strokeStyle = `rgba(220,38,38,${node.opacity})`
          ctx.lineWidth = 2
          ctx.stroke()
        } else if (type === 'broker') {
          ctx.fillStyle = `rgba(15,0,0,${node.opacity * 0.8})`
          ctx.fill()
          ctx.strokeStyle = `rgba(180,0,0,${node.opacity * 0.7})`
          ctx.lineWidth = 1
          ctx.stroke()
        } else {
          ctx.fillStyle = `rgba(20,0,0,${node.opacity * 0.9})`
          ctx.fill()
          ctx.strokeStyle = `rgba(239,68,68,${node.opacity * 0.8})`
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // Label
        ctx.font = type === 'core' ? 'bold 11px Inter, sans-serif' : '9px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = type === 'core'
          ? `rgba(255,255,255,${node.opacity})`
          : type === 'broker'
            ? `rgba(220,80,80,${node.opacity})`
            : `rgba(255,180,180,${node.opacity})`
        ctx.fillText(label, x, y)
      })

      // Scanning text overlay
      if (t < 0.85) {
        const scanOpacity = t < 0.7 ? 1 : (0.85 - t) / 0.15
        ctx.font = '11px JetBrains Mono, monospace'
        ctx.textAlign = 'left'
        ctx.fillStyle = `rgba(220,38,38,${scanOpacity * 0.8})`
        const scanLines = [
          `> scanning digital footprint...`,
          `> ${Math.min(Math.round(t * 340), 312)} data broker records found`,
          `> mapping exposure network...`,
        ]
        scanLines.forEach((line, i) => {
          if (t > 0.1 + i * 0.15) {
            ctx.fillText(line, 32, canvas.height - 80 + i * 18)
          }
        })
      }

      if (t < 1) {
        animRef.current = requestAnimationFrame(draw)
      } else {
        setPhase('done')
        setTimeout(onComplete, 300)
      }
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-mono text-red-500 tracking-widest uppercase">Phantom</span>
        </div>
        <button
          onClick={onComplete}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors font-mono"
        >
          skip →
        </button>
      </div>

      {/* Center text */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center pointer-events-none">
        <p className="text-xs font-mono text-red-900 tracking-widest uppercase mt-64">
          {phase === 'done' ? 'footprint mapped' : 'mapping exposure'}
        </p>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 px-6 pb-6">
        <div className="h-px bg-gray-900 w-full">
          <div
            className="h-px bg-red-800 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
