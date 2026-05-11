import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Database, RotateCcw, Bell, FileText, Shield, Search, Users, Radio, ShieldAlert, FileText as FileText2 } from 'lucide-react'

// ── Network radar canvas behind the graph ─────────────────────────────────────
function RadarCanvas({ width, height }: { width: number; height: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)
  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const cx = width / 2, cy = height / 2
    let t = 0
    const pts = Array.from({ length: 220 }, (_, i) => {
      const s = i * 137.508
      return { x: (s * 7.3) % width, y: (s * 13.7) % height, vx: ((s * 0.47) % 1 - 0.5) * 0.22, vy: ((s * 0.83) % 1 - 0.5) * 0.22, r: 0.5 + (s % 1.8), a: 0.05 + (s % 0.3) }
    })
    function draw() {
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = '#030305'; ctx.fillRect(0, 0, width, height)
      // glow
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * 0.55)
      g.addColorStop(0, 'rgba(140,0,0,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, width, height)
      // particles
      pts.forEach(p => { p.x = ((p.x + p.vx) + width) % width; p.y = ((p.y + p.vy) + height) % height })
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)
        if (d < 52) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.strokeStyle = `rgba(180,30,30,${(1 - d / 52) * 0.16})`; ctx.lineWidth = 0.4; ctx.stroke() }
      }
      pts.forEach((p, i) => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(220,65,55,${Math.max(0, p.a + Math.sin(t * 0.4 + i * 0.3) * 0.04)})`; ctx.fill() })
      // orbit rings
      ;[0.22, 0.42, 0.62, 0.82].forEach((frac, ri) => {
        const r = Math.min(width, height) * 0.5 * frac
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(220,38,38,${0.18 - ri * 0.03})`; ctx.lineWidth = ri === 0 ? 1.4 : 0.7
        ctx.setLineDash(ri > 0 ? [5, 14] : []); ctx.stroke(); ctx.setLineDash([])
      })
      // sweep
      const sweep = t * 0.5
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(sweep)
      const sg = ctx.createLinearGradient(0, 0, Math.min(width, height) * 0.4, 0)
      sg.addColorStop(0, 'rgba(220,38,38,0.22)'); sg.addColorStop(1, 'rgba(220,38,38,0)')
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, Math.min(width, height) * 0.4, -0.3, 0, false); ctx.closePath()
      ctx.fillStyle = sg; ctx.fill(); ctx.restore()
      // spokes + dots
      const NODES = 6
      Array.from({ length: NODES }).forEach((_, i) => {
        const angle = (i / NODES) * Math.PI * 2 + t * 0.18
        const r = Math.min(width, height) * 0.36
        const nx = cx + Math.cos(angle) * r, ny = cy + Math.sin(angle) * r
        const grad = ctx.createLinearGradient(cx, cy, nx, ny)
        grad.addColorStop(0, 'rgba(220,38,38,0.8)'); grad.addColorStop(1, 'rgba(220,38,38,0.04)')
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.strokeStyle = grad; ctx.lineWidth = 0.9; ctx.stroke()
        const prog = ((t * 0.32 + i * 0.18) % 1)
        const px = cx + (nx - cx) * prog, py = cy + (ny - cy) * prog
        ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,110,80,${0.9 - prog * 0.5})`; ctx.shadowColor = 'rgba(255,70,40,0.9)'; ctx.shadowBlur = 6; ctx.fill(); ctx.shadowBlur = 0
        ctx.beginPath(); ctx.arc(nx, ny, 4.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,70,50,${0.6 + Math.sin(t * 1.3 + i) * 0.3})`; ctx.shadowColor = 'rgba(255,50,30,0.9)'; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0
      })
      // pulsing rings
      ;[0, 0.33, 0.66].forEach(off => {
        const phase = ((t * 0.5 + off) % 1)
        ctx.beginPath(); ctx.arc(cx, cy, 14 + phase * 50, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(220,38,38,${0.5 * (1 - phase)})`; ctx.lineWidth = 1.5; ctx.stroke()
      })
      // center
      ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2)
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16)
      cg.addColorStop(0, 'rgba(220,38,38,0.95)'); cg.addColorStop(1, 'rgba(100,0,0,0.6)')
      ctx.fillStyle = cg; ctx.shadowColor = 'rgba(220,38,38,0.9)'; ctx.shadowBlur = 24; ctx.fill(); ctx.shadowBlur = 0
      t += 0.016
      raf.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf.current)
  }, [width, height])
  return <canvas ref={ref} width={width} height={height} className="absolute inset-0 w-full h-full" style={{ objectFit: 'fill' }} />
}

// ── Category node cards overlaid on the radar ──────────────────────────────────
const CATS = [
  { label: 'People Search', count: 23, Icon: Users, deg: -60 },
  { label: 'Broker Sites',  count: 47, Icon: Database, deg: 0 },
  { label: 'Public Records',count: 12, Icon: FileText2, deg: 60 },
  { label: 'Ad Networks',   count: 89, Icon: Radio, deg: 120 },
  { label: 'Breach Data',   count:  6, Icon: ShieldAlert, deg: 180 },
  { label: 'Social Profiles',count: 19, Icon: Users, deg: 240 },
]

function HeroGraph() {
  const W = 680, H = 520
  const cx = W / 2, cy = H / 2
  const orbit = Math.min(W, H) * 0.36

  return (
    <div className="relative select-none" style={{ width: W, height: H }}>
      <RadarCanvas width={W} height={H} />
      {/* Center shield */}
      <div className="absolute" style={{ left: cx, top: cy, transform: 'translate(-50%,-50%)' }}>
        <div className="relative" style={{ width: 88, height: 88 }}>
          <div className="absolute inset-0 rounded-full border border-red-600/30 animate-ping" style={{ animationDuration: '2.8s' }} />
          <div className="absolute inset-[10%] rounded-full border border-red-700/40" />
          <div className="absolute inset-[18%] rounded-full bg-gradient-to-br from-red-950 to-black border-2 border-red-600/80 flex items-center justify-center"
            style={{ boxShadow: '0 0 32px rgba(220,38,38,0.6), inset 0 0 14px rgba(220,38,38,0.12)' }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9">
              <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"
                fill="rgba(220,38,38,0.35)" stroke="rgba(220,38,38,1)" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      {/* Category cards */}
      {CATS.map(cat => {
        const rad = cat.deg * Math.PI / 180
        const nx = cx + Math.cos(rad) * orbit
        const ny = cy + Math.sin(rad) * orbit
        const isLeft = nx < cx - 20
        return (
          <div key={cat.label} className="absolute" style={{ left: nx, top: ny, transform: 'translate(-50%,-50%)' }}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-800/80 backdrop-blur-sm
              hover:border-red-900/50 transition-colors ${isLeft ? 'flex-row-reverse' : ''}`}
              style={{ background: 'rgba(12,12,16,0.94)', minWidth: 148, boxShadow: '0 4px 20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)' }}>
              <div className="h-8 w-8 rounded-lg bg-red-950/40 border border-red-900/30 flex items-center justify-center flex-shrink-0">
                <cat.Icon className="h-3.5 w-3.5 text-red-500" />
              </div>
              <div className={isLeft ? 'text-right' : ''}>
                <div className="text-[11px] font-bold text-white leading-tight">{cat.label}</div>
                <div className="text-[10px] text-red-400 font-semibold">{cat.count} sources</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const FEATURES = [
  { icon: Database,  title: 'Comprehensive Scans',    desc: 'We scan thousands of sources to find your data.' },
  { icon: RotateCcw, title: 'Automated Removals',     desc: 'We submit opt-out requests and track results.' },
  { icon: Bell,      title: 'Continuous Monitoring',  desc: 'We monitor new exposures and alert you instantly.' },
  { icon: FileText,  title: 'Privacy Reports',        desc: 'Full exposure breakdown and removal progress.' },
  { icon: Shield,    title: 'Your Privacy, Restored', desc: 'Take control and keep your data off the open web.' },
]

export function Home() {
  return (
    <div className="min-h-screen bg-[#030305] text-white overflow-x-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 lg:px-12 py-4 border-b border-gray-900/60">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-red-950/60 border border-red-900/50 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-red-500" />
          </div>
          <span className="font-black text-base tracking-tight">vindica</span>
          <span className="text-[9px] text-red-500 font-bold bg-red-950/30 border border-red-900/30 px-1 py-0.5 rounded">BETA</span>
        </div>
        <div className="hidden md:flex items-center gap-7 text-sm text-gray-500">
          {['How It Works', 'Data Brokers', 'People Search', 'Pricing', 'Resources'].map(l => (
            <a key={l} href="#features" className="hover:text-white transition-colors">{l}</a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Log in</Link>
          <Link to="/login" className="btn-red text-sm px-4 py-2">Get Started →</Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-screen-xl mx-auto px-8 lg:px-12 py-14 grid grid-cols-1 lg:grid-cols-[42%_58%] gap-8 items-center">

        {/* Left */}
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center gap-2 mb-5">
            <span className="h-px w-6 bg-red-600" />
            <span className="text-[11px] font-bold tracking-[0.18em] text-red-500 uppercase">Privacy. In Control.</span>
          </div>

          <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-5">
            Protect Your<br />
            <span className="text-red-500" style={{ textShadow: '0 0 40px rgba(220,38,38,0.45)' }}>
              Digital Footprint.
            </span>
          </h1>

          <p className="text-gray-400 leading-relaxed mb-7 max-w-md">
            Find and remove your personal information from data broker networks, people search sites, and the open web.
          </p>

          {/* Search / CTA */}
          <div className="flex items-center gap-3 mb-8">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
              <input className="input-field pl-9 text-sm" placeholder="Enter your name, email, or phone" />
            </div>
            <Link to="/login" className="btn-red flex items-center gap-2 whitespace-nowrap">
              <Shield className="h-4 w-4" />
              Scan My Exposure
            </Link>
          </div>

          <p className="text-xs text-gray-600 mb-3">Trusted by individuals, professionals, and families worldwide.</p>
          <div className="flex items-center gap-6 mb-10">
            {['Forbes', 'TechCrunch', 'WIRED', 'The New York Times', 'Bloomberg'].map(p => (
              <span key={p} className="text-xs font-bold text-gray-700 tracking-wide">{p}</span>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-gray-950/60 border border-gray-900/50">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Database className="h-4 w-4 text-red-500/70" />
                <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Sources Found</span>
              </div>
              <div className="text-2xl font-black text-white">196</div>
              <div className="text-[10px] text-gray-600">Across 32 data categories</div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-4 w-4 rounded-full border-2 border-red-500 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                </div>
                <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Exposure Score</span>
              </div>
              <div className="text-2xl font-black text-red-500">78</div>
              <div className="text-[10px] text-red-400 font-semibold">High · Exposure above average</div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <RotateCcw className="h-4 w-4 text-red-500/70" />
                <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Active Removals</span>
              </div>
              <div className="text-2xl font-black text-white">24</div>
              <div className="text-[10px] text-gray-600">In progress</div>
            </div>
          </div>
        </motion.div>

        {/* Right — network graph */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="flex justify-center lg:justify-end overflow-hidden"
        >
          <HeroGraph />
        </motion.div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="border-t border-gray-900/60 bg-gray-950/30">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12 py-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="card-dark p-4 hover:border-red-900/30 transition-colors">
                <div className="h-9 w-9 rounded-xl bg-red-950/40 border border-red-900/30 flex items-center justify-center mb-3">
                  <f.icon className="h-4 w-4 text-red-500" />
                </div>
                <p className="text-sm font-bold text-white mb-1">{f.title}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-8 py-20 text-center">
        <p className="text-[11px] font-bold tracking-[0.2em] text-red-500 uppercase mb-3">Ready to see where your data is exposed?</p>
        <h2 className="text-3xl font-black mb-4">Join millions who've already reclaimed their privacy.</h2>
        <Link to="/login"
          className="btn-red inline-flex items-center gap-2 px-8 py-3.5 text-base mt-2">
          <Shield className="h-5 w-5" />
          Scan My Exposure
        </Link>
        <p className="text-xs text-gray-600 mt-3">No credit card required</p>
      </section>

      <footer className="border-t border-gray-900/60 py-6 text-center">
        <p className="text-xs text-gray-700">© 2026 vindica · Privacy Intelligence Platform · GDPR &amp; CCPA Compliant</p>
      </footer>
    </div>
  )
}
