import { useRef, useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, Database, RotateCcw, FileText, Shield,
  Search, Users, Radio, ShieldAlert, Eye, Lock, CheckCircle,
  ArrowRight, Star, ChevronDown, Globe, Zap, Fingerprint,
  AlertTriangle, Mail, Twitter, Github, Linkedin, FileText as FileText2
} from 'lucide-react'

// ── 3D tilt hook ──────────────────────────────────────────────────────────────
function useTilt(strength = 12) {
  const ref = useRef<HTMLDivElement>(null)
  const raf = useRef(0)
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      el.style.transform = `perspective(900px) rotateY(${x * strength}deg) rotateX(${-y * strength}deg) scale3d(1.025,1.025,1.025)`
    })
  }, [strength])
  const onLeave = useCallback(() => {
    const el = ref.current; if (!el) return
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      el.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)'
    })
  }, [])
  return { ref, onMouseMove: onMove, onLeave }
}

// ── Glass card ────────────────────────────────────────────────────────────────
function GlassCard({ children, className = '', strength = 10, style, glow = false }: {
  children: React.ReactNode; className?: string; strength?: number
  style?: React.CSSProperties; glow?: boolean
}) {
  const tilt = useTilt(strength)
  return (
    <div ref={tilt.ref} onMouseMove={tilt.onMouseMove} onMouseLeave={tilt.onLeave}
      className={className}
      style={{
        transition: 'transform 0.18s cubic-bezier(0.23,1,0.32,1)',
        transformStyle: 'preserve-3d',
        background: 'rgba(8, 2, 4, 0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${glow ? 'rgba(220,38,38,0.35)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: glow
          ? '0 0 0 1px rgba(220,38,38,0.15), 0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(220,38,38,0.08), inset 0 1px 0 rgba(255,255,255,0.08)'
          : '0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)',
        ...style,
      }}>
      {/* Glossy top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }} />
      {children}
    </div>
  )
}

// ── Animated background orbs ──────────────────────────────────────────────────
function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Large deep-red orb top-right */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 700, height: 700, top: -200, right: -150, background: 'radial-gradient(circle, rgba(180,0,0,0.18) 0%, transparent 70%)', filter: 'blur(60px)' }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Mid orb center-left */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 500, height: 500, top: '30%', left: -100, background: 'radial-gradient(circle, rgba(140,0,0,0.12) 0%, transparent 70%)', filter: 'blur(80px)' }}
        animate={{ x: [0, -30, 0], y: [0, 50, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      {/* Small orb bottom */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 400, height: 400, bottom: '10%', right: '20%', background: 'radial-gradient(circle, rgba(200,20,20,0.1) 0%, transparent 70%)', filter: 'blur(60px)' }}
        animate={{ x: [0, 20, 0], y: [0, -40, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
      />
      {/* Subtle grid overlay */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />
    </div>
  )
}

// ── Radar canvas ──────────────────────────────────────────────────────────────
function RadarCanvas({ width, height }: { width: number; height: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const raf = useRef(0)
  useEffect(() => {
    const canvas = ref.current!; const ctx = canvas.getContext('2d')!
    const cx = width / 2, cy = height / 2; let t = 0
    const pts = Array.from({ length: 220 }, (_, i) => {
      const s = i * 137.508
      return { x: (s * 7.3) % width, y: (s * 13.7) % height, vx: ((s * 0.47) % 1 - 0.5) * 0.22, vy: ((s * 0.83) % 1 - 0.5) * 0.22, r: 0.5 + (s % 1.8), a: 0.05 + (s % 0.3) }
    })
    function draw() {
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = 'rgba(3,3,5,0)'; ctx.fillRect(0, 0, width, height)
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * 0.55)
      g.addColorStop(0, 'rgba(160,0,0,0.3)'); g.addColorStop(0.5, 'rgba(80,0,0,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, width, height)
      pts.forEach(p => { p.x = ((p.x + p.vx) + width) % width; p.y = ((p.y + p.vy) + height) % height })
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)
        if (d < 52) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.strokeStyle = `rgba(200,40,40,${(1 - d / 52) * 0.2})`; ctx.lineWidth = 0.5; ctx.stroke() }
      }
      pts.forEach((p, i) => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(220,65,55,${Math.max(0, p.a + Math.sin(t * 0.4 + i * 0.3) * 0.04)})`; ctx.fill() })
      ;[0.22, 0.42, 0.62, 0.82].forEach((frac, ri) => {
        const r = Math.min(width, height) * 0.5 * frac
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(220,38,38,${0.25 - ri * 0.04})`; ctx.lineWidth = ri === 0 ? 1.6 : 0.8
        ctx.setLineDash(ri > 0 ? [5, 14] : []); ctx.stroke(); ctx.setLineDash([])
      })
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.5)
      const sg = ctx.createLinearGradient(0, 0, Math.min(width, height) * 0.42, 0)
      sg.addColorStop(0, 'rgba(220,38,38,0.3)'); sg.addColorStop(1, 'rgba(220,38,38,0)')
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, Math.min(width, height) * 0.42, -0.32, 0, false); ctx.closePath()
      ctx.fillStyle = sg; ctx.fill(); ctx.restore()
      const NODES = 6
      Array.from({ length: NODES }).forEach((_, i) => {
        const angle = (i / NODES) * Math.PI * 2 + t * 0.18
        const r = Math.min(width, height) * 0.36
        const nx = cx + Math.cos(angle) * r, ny = cy + Math.sin(angle) * r
        const grad = ctx.createLinearGradient(cx, cy, nx, ny)
        grad.addColorStop(0, 'rgba(220,38,38,0.9)'); grad.addColorStop(1, 'rgba(220,38,38,0.04)')
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.strokeStyle = grad; ctx.lineWidth = 1; ctx.stroke()
        const prog = ((t * 0.32 + i * 0.18) % 1)
        const px = cx + (nx - cx) * prog, py = cy + (ny - cy) * prog
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,110,80,${0.9 - prog * 0.5})`; ctx.shadowColor = 'rgba(255,70,40,0.9)'; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0
        ctx.beginPath(); ctx.arc(nx, ny, 5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,70,50,${0.6 + Math.sin(t * 1.3 + i) * 0.3})`; ctx.shadowColor = 'rgba(255,50,30,0.95)'; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0
      })
      ;[0, 0.33, 0.66].forEach(off => {
        const phase = ((t * 0.5 + off) % 1)
        ctx.beginPath(); ctx.arc(cx, cy, 14 + phase * 55, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(220,38,38,${0.6 * (1 - phase)})`; ctx.lineWidth = 1.8; ctx.stroke()
      })
      ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2)
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18)
      cg.addColorStop(0, 'rgba(255,80,80,1)'); cg.addColorStop(0.5, 'rgba(220,38,38,0.95)'); cg.addColorStop(1, 'rgba(100,0,0,0.5)')
      ctx.fillStyle = cg; ctx.shadowColor = 'rgba(220,38,38,1)'; ctx.shadowBlur = 36; ctx.fill(); ctx.shadowBlur = 0
      t += 0.016; raf.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf.current)
  }, [width, height])
  return <canvas ref={ref} width={width} height={height} className="absolute inset-0 w-full h-full" />
}

const CATS = [
  { label: 'People Search', count: 23, Icon: Users, deg: -60 },
  { label: 'Broker Sites', count: 47, Icon: Database, deg: 0 },
  { label: 'Public Records', count: 12, Icon: FileText2, deg: 60 },
  { label: 'Ad Networks', count: 89, Icon: Radio, deg: 120 },
  { label: 'Breach Data', count: 6, Icon: ShieldAlert, deg: 180 },
  { label: 'Social Profiles', count: 19, Icon: Users, deg: 240 },
]

function HeroGraph() {
  const W = 680, H = 520, cx = W / 2, cy = H / 2, orbit = Math.min(W, H) * 0.36
  return (
    <div className="relative select-none" style={{ width: W, height: H }}>
      <RadarCanvas width={W} height={H} />
      <div className="absolute" style={{ left: cx, top: cy, transform: 'translate(-50%,-50%)' }}>
        <div className="relative" style={{ width: 96, height: 96 }}>
          <div className="absolute inset-0 rounded-full border border-red-600/40 animate-ping" style={{ animationDuration: '2.8s' }} />
          <div className="absolute inset-[8%] rounded-full border border-red-700/30" />
          <div className="absolute inset-[18%] rounded-full flex items-center justify-center"
            style={{ background: 'rgba(60,0,0,0.7)', backdropFilter: 'blur(12px)', border: '2px solid rgba(220,38,38,0.8)', boxShadow: '0 0 48px rgba(220,38,38,0.8), 0 0 100px rgba(220,38,38,0.2), inset 0 1px 0 rgba(255,100,100,0.3)' }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9">
              <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"
                fill="rgba(220,38,38,0.35)" stroke="rgba(255,90,90,1)" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      {CATS.map(cat => {
        const rad = cat.deg * Math.PI / 180
        const nx = cx + Math.cos(rad) * orbit, ny = cy + Math.sin(rad) * orbit
        const isLeft = nx < cx - 20
        return (
          <div key={cat.label} className="absolute" style={{ left: nx, top: ny, transform: 'translate(-50%,-50%)' }}>
            <GlassCard strength={8}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl hover:border-red-700/40 transition-colors cursor-default ${isLeft ? 'flex-row-reverse' : ''}`}
              style={{ minWidth: 148 }}>
              <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', boxShadow: '0 0 12px rgba(220,38,38,0.15)' }}>
                <cat.Icon className="h-3.5 w-3.5 text-red-400" />
              </div>
              <div className={isLeft ? 'text-right' : ''}>
                <div className="text-[11px] font-bold text-white leading-tight">{cat.label}</div>
                <div className="text-[10px] text-red-400 font-semibold">{cat.count} sources</div>
              </div>
            </GlassCard>
          </div>
        )
      })}
    </div>
  )
}

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ target }: { target: number }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let s = 0; const step = target / 60
    const t = setInterval(() => { s += step; if (s >= target) { setV(target); clearInterval(t) } else setV(Math.floor(s)) }, 16)
    return () => clearInterval(t)
  }, [target])
  return <>{v.toLocaleString()}</>
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'How does vindica find my personal data?', a: 'We scan 196+ data sources including people-search sites, data broker databases, public records, social platforms, and breach databases. Our automated engine cross-references your name, email, phone, and username to build a complete exposure map.' },
  { q: 'How long do removals take?', a: 'Most opt-out requests are acknowledged within 24–72 hours. Data brokers are legally required to process GDPR/CCPA requests within 30–45 days. We monitor each request and alert you when removal is confirmed.' },
  { q: 'Is my data safe with vindica?', a: 'All PII is encrypted at rest using AES-256 with KMS-managed keys. We never sell or share your data. We are GDPR and CCPA compliant.' },
  { q: 'What is a Privacy Score?', a: 'Your Privacy Score (0–100) reflects how exposed your personal data is. Lower = more exposed. We calculate it based on breach severity, broker listings, and data sensitivity.' },
  { q: 'Can vindica remove data from breach databases?', a: 'We remove you from breach aggregators and people-search sites. Original breach source databases cannot be deleted, but we minimize re-exposure by targeting downstream aggregators.' },
  { q: 'Do you offer refunds?', a: '14-day money-back guarantee on all paid plans. Contact support within 14 days of payment.' },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <GlassCard className="rounded-xl overflow-hidden cursor-pointer" glow={open}>
      <button className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left" onClick={() => setOpen(!open)}>
        <span className="text-sm font-semibold text-white">{q}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-red-500' : 'text-gray-600'}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <p className="px-6 pb-4 text-sm text-gray-400 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}

// ── Glossy button ─────────────────────────────────────────────────────────────
function GlossyButton({ children, to, className = '' }: { children: React.ReactNode; to: string; className?: string }) {
  return (
    <Link to={to} className={`relative inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white overflow-hidden transition-all ${className}`}
      style={{ background: 'linear-gradient(180deg, rgba(240,50,50,1) 0%, rgba(180,20,20,1) 100%)', boxShadow: '0 0 32px rgba(220,38,38,0.55), 0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,150,150,0.35)' }}>
      {/* Gloss sheen */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-xl"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)' }} />
      {children}
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function Home() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div className="relative min-h-screen bg-[#030305] text-white overflow-x-hidden">
      <BackgroundOrbs />

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 lg:px-12 py-3.5 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(4,2,3,0.75)' : 'rgba(3,3,5,0)',
          backdropFilter: scrolled ? 'blur(24px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.03)',
          boxShadow: scrolled ? '0 1px 0 rgba(220,38,38,0.06), 0 8px 32px rgba(0,0,0,0.5)' : 'none',
        }}>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(40,0,0,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(220,38,38,0.4)', boxShadow: '0 0 16px rgba(220,38,38,0.3), inset 0 1px 0 rgba(255,100,100,0.2)' }}>
            <ShieldCheck className="h-4 w-4 text-red-400" />
          </div>
          <span className="font-black text-base tracking-tight">vindica</span>
          <span className="text-[9px] text-red-400 font-bold px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)' }}>BETA</span>
        </div>
        <div className="hidden md:flex items-center gap-7 text-sm text-gray-500">
          {['How It Works', 'Data Brokers', 'Pricing', 'Resources'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="hover:text-white transition-colors">{l}</a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">Log in</Link>
          <GlossyButton to="/login">Get Started <ArrowRight className="h-3.5 w-3.5" /></GlossyButton>
        </div>
      </nav>

      {/* ── Alert Banner ─────────────────────────────────────────────── */}
      <div className="relative z-10 py-2.5 px-4 text-center"
        style={{ background: 'rgba(120,0,0,0.15)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(220,38,38,0.15)' }}>
        <p className="text-xs text-red-400">
          <span className="font-bold">Alert:</span> 847 new data broker exposures found in the last 24 hours.{' '}
          <Link to="/login" className="underline hover:text-red-300 transition-colors">Check if you're affected →</Link>
        </p>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-screen-xl mx-auto px-8 lg:px-12 py-14 grid grid-cols-1 lg:grid-cols-[44%_56%] gap-8 items-center">
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(220,38,38,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(220,38,38,0.2)', boxShadow: '0 0 20px rgba(220,38,38,0.08)' }}>
            <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-red-400 tracking-wide">REAL-TIME PRIVACY INTELLIGENCE</span>
          </div>

          <h1 className="text-5xl lg:text-[3.4rem] font-extrabold leading-[1.08] tracking-tight mb-5">
            Your Personal Data<br />Is{' '}
            <span className="text-red-500" style={{ textShadow: '0 0 60px rgba(220,38,38,0.7), 0 0 120px rgba(220,38,38,0.25)' }}>
              Everywhere.
            </span><br />Take It Back.
          </h1>

          <p className="text-gray-400 text-base leading-relaxed mb-7 max-w-md">
            vindica scans 196+ data sources, scores your exposure, and automatically sends removal requests — so you disappear from the open web.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
              <input className="w-full pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 rounded-xl outline-none focus:border-red-800/50"
                placeholder="Enter your name or email…"
                style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }} />
            </div>
            <GlossyButton to="/login" className="px-5 py-2.5 whitespace-nowrap">
              <Shield className="h-4 w-4" /> Scan My Exposure
            </GlossyButton>
          </div>

          <div className="flex items-center gap-2.5 mb-8 text-xs text-gray-600">
            <CheckCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
            <span>No credit card · Results in 60 seconds · GDPR &amp; CCPA compliant</span>
          </div>

          <div className="mb-8">
            <p className="text-[10px] text-gray-700 uppercase tracking-wider mb-2.5">As seen in</p>
            <div className="flex flex-wrap items-center gap-5">
              {['Forbes', 'TechCrunch', 'WIRED', 'Bloomberg', 'The Verge'].map(p => (
                <span key={p} className="text-[11px] font-black text-gray-700 tracking-wide hover:text-gray-400 transition-colors cursor-default">{p}</span>
              ))}
            </div>
          </div>

          {/* Glass stat strip */}
          <GlassCard className="grid grid-cols-3 gap-0 p-4 rounded-2xl overflow-hidden divide-x divide-white/5">
            {[
              { icon: Database, label: 'Sources Monitored', value: 196, sub: 'across 32 categories' },
              { icon: AlertTriangle, label: 'Avg Exposure Score', value: 78, sub: 'High · above average', red: true },
              { icon: RotateCcw, label: 'Removals / Month', value: 1240, sub: 'completed last 30d' },
            ].map((s, i) => (
              <div key={s.label} className={`${i > 0 ? 'pl-4' : ''} ${i < 2 ? 'pr-4' : ''}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className="h-3.5 w-3.5 text-red-500/70" />
                  <span className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold">{s.label}</span>
                </div>
                <div className={`text-2xl font-black ${s.red ? 'text-red-500' : 'text-white'}`}
                  style={s.red ? { textShadow: '0 0 20px rgba(220,38,38,0.5)' } : undefined}>
                  <AnimatedCounter target={s.value} />
                </div>
                <div className={`text-[10px] ${s.red ? 'text-red-400 font-semibold' : 'text-gray-600'}`}>{s.sub}</div>
              </div>
            ))}
          </GlassCard>
        </motion.div>

        {/* Right — 3D radar */}
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }}
          className="flex justify-center lg:justify-end overflow-hidden" style={{ perspective: '1200px' }}>
          <motion.div
            animate={{ rotateY: [0, 4, 0, -4, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformStyle: 'preserve-3d' }}>
            <HeroGraph />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Problem ──────────────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-white/[0.04] py-20">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12">
          <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[11px] font-bold tracking-[0.2em] text-red-500 uppercase">THE HIDDEN THREAT</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold mt-3 mb-4">The Internet Knows<br />Everything About You</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">Hundreds of data brokers are buying, selling, and publishing your home address, phone number, and financial history — without your consent.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Globe, stat: '5,000+', label: 'Data Brokers', desc: 'Active sites selling your personal data right now' },
              { icon: Database, stat: '2.9B', label: 'Records Leaked', desc: 'Personal records exposed in 2024 alone' },
              { icon: Eye, stat: '$240', label: 'Avg Profile Value', desc: 'What data brokers charge per individual profile' },
              { icon: AlertTriangle, stat: '94%', label: "Don't Know", desc: "Of people who don't know their data is being sold" },
            ].map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <GlassCard className="h-full p-6 text-center rounded-2xl">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', boxShadow: '0 8px 24px rgba(220,38,38,0.12), inset 0 1px 0 rgba(255,100,100,0.1)' }}>
                    <item.icon className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="text-3xl font-black text-red-500 mb-1" style={{ textShadow: '0 0 24px rgba(220,38,38,0.5)' }}>{item.stat}</div>
                  <div className="text-sm font-bold text-white mb-2">{item.label}</div>
                  <div className="text-xs text-gray-600 leading-relaxed">{item.desc}</div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative z-10 border-t border-white/[0.04] py-20">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12">
          <motion.div className="text-center mb-14" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[11px] font-bold tracking-[0.2em] text-red-500 uppercase">THE PROCESS</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold mt-3 mb-4">How vindica Works</h2>
            <p className="text-gray-500 max-w-md mx-auto text-sm">Three steps to reclaim your privacy. We do the hard work automatically.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(220,38,38,0.3), transparent)' }} />
            {[
              { step: '01', icon: Search, title: 'Deep Scan', desc: 'Enter your name, email, or phone. vindica instantly scans 196+ data sources — people-search sites, broker databases, breach records, and social platforms.', tags: ['196+ sources', '60 sec scan', 'Real-time'] },
              { step: '02', icon: Fingerprint, title: 'Exposure Map', desc: 'Get a complete Privacy Score and visual exposure map. See exactly where your data is and what is publicly available about you.', tags: ['Privacy Score', 'Severity rating', 'Visual map'] },
              { step: '03', icon: Shield, title: 'Auto Removals', desc: 'We auto-generate and send GDPR/CCPA opt-out requests to every data broker. Track progress in real-time.', tags: ['GDPR requests', 'CCPA opt-outs', 'Auto-tracking'] },
            ].map((s, i) => (
              <motion.div key={s.step} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}>
                <GlassCard className="relative h-full p-7 rounded-2xl">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', boxShadow: '0 0 20px rgba(220,38,38,0.15), inset 0 1px 0 rgba(255,100,100,0.1)' }}>
                      <s.icon className="h-5 w-5 text-red-400" />
                    </div>
                    <span className="text-5xl font-black select-none" style={{ color: 'rgba(220,38,38,0.12)' }}>{s.step}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">{s.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.tags.map(t => (
                      <span key={t} className="text-[10px] font-semibold text-red-400 px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)' }}>{t}</span>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Preview ─────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-white/[0.04] py-20 overflow-hidden">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12">
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[11px] font-bold tracking-[0.2em] text-red-500 uppercase">PLATFORM OVERVIEW</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold mt-3 mb-4">Your Privacy Command Center</h2>
            <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">Real-time breach alerts, broker opt-out tracking, dark web monitoring, and compliance reporting — all in one place.</p>
          </motion.div>
          {/* 3D angled glass mockup */}
          <motion.div initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ perspective: '1400px' }}>
            <motion.div initial={{ rotateX: 22 }} whileInView={{ rotateX: 5 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.2 }} style={{ transformStyle: 'preserve-3d', transformOrigin: 'center bottom' }}>
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(6,2,4,0.7)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 0 0 1px rgba(220,38,38,0.08), 0 40px 100px rgba(0,0,0,0.8), 0 0 80px rgba(220,38,38,0.06), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                {/* Window chrome */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.05]"
                  style={{ background: 'rgba(10,4,6,0.8)' }}>
                  <div className="flex gap-1.5">
                    {['#3a3a3a', '#3a3a3a', '#3a3a3a'].map((c, i) => <div key={i} className="h-3 w-3 rounded-full" style={{ backgroundColor: c }} />)}
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="h-5 rounded-lg max-w-xs mx-auto flex items-center px-3 gap-2"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <Lock className="h-2.5 w-2.5 text-green-500/60" />
                      <span className="text-[10px] text-gray-600">vindica.me/app</span>
                    </div>
                  </div>
                </div>
                <div className="p-5 grid grid-cols-12 gap-4">
                  {/* Sidebar */}
                  <div className="col-span-2 space-y-0.5">
                    {['Scan', 'Removals', 'Reports', 'Monitor', 'Track', 'Settings'].map((item, i) => (
                      <div key={item} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${i === 0 ? 'text-red-400' : 'text-gray-700'}`}
                        style={i === 0 ? { background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.2)', boxShadow: '0 0 12px rgba(220,38,38,0.08)' } : undefined}>
                        <div className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-red-500' : 'bg-gray-800'}`} />
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="col-span-10 space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: 'Privacy Score', val: '42', sub: 'High Risk', red: true },
                        { label: 'Sources Found', val: '196', sub: '32 categories' },
                        { label: 'Brokers', val: '47', sub: 'opt-out pending' },
                        { label: 'Breaches', val: '6', sub: 'verified' },
                      ].map(k => (
                        <div key={k.label} className="rounded-xl p-3"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                          <div className="text-[9px] text-gray-700 uppercase tracking-wider mb-1">{k.label}</div>
                          <div className={`text-xl font-black ${k.red ? 'text-red-500' : 'text-white'}`}
                            style={k.red ? { textShadow: '0 0 14px rgba(220,38,38,0.6)' } : undefined}>{k.val}</div>
                          <div className={`text-[9px] ${k.red ? 'text-red-400' : 'text-gray-700'}`}>{k.sub}</div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="px-4 py-2.5 flex items-center gap-2 border-b border-white/[0.04]"
                        style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-[11px] font-bold text-white">Active Breach Records</span>
                        <span className="ml-auto text-[10px] text-red-400 px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.2)' }}>6 found</span>
                      </div>
                      {[
                        { src: 'LinkedIn', sev: 'high', fields: 'Email, Password hash, Phone' },
                        { src: 'Spokeo', sev: 'critical', fields: 'Address, Family, Income' },
                        { src: 'BeenVerified', sev: 'medium', fields: 'Email, Age, Relatives' },
                      ].map(r => (
                        <div key={r.src} className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.sev === 'critical' ? 'text-red-400' : r.sev === 'high' ? 'text-red-400' : 'text-gray-500'}`}
                            style={{ background: r.sev === 'medium' ? 'rgba(100,100,100,0.15)' : 'rgba(220,38,38,0.12)', border: `1px solid ${r.sev === 'medium' ? 'rgba(100,100,100,0.2)' : 'rgba(220,38,38,0.25)'}` }}>
                            {r.sev.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-semibold text-white w-24">{r.src}</span>
                          <span className="text-[9px] text-gray-600">{r.fields}</span>
                          <span className="ml-auto text-[9px] text-red-500 cursor-pointer px-2 py-0.5 rounded hover:bg-red-950/20 transition-colors"
                            style={{ border: '1px solid rgba(220,38,38,0.2)' }}>Remove →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
          {/* Glow beneath mockup */}
          <div className="h-20 -mt-4" style={{ background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(220,38,38,0.06), transparent)' }} />
          <div className="text-center -mt-8">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-400 transition-colors">
              See your full dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Broker Coverage ───────────────────────────────────────────── */}
      <section id="data-brokers" className="relative z-10 border-t border-white/[0.04] py-16">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12">
          <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[11px] font-bold tracking-[0.2em] text-red-500 uppercase">COVERAGE</span>
            <h2 className="text-2xl lg:text-3xl font-extrabold mt-3 mb-3">We Target Every Major Data Broker</h2>
          </motion.div>
          <div className="flex flex-wrap gap-2 justify-center max-w-4xl mx-auto mb-8">
            {['Spokeo','BeenVerified','Intelius','Whitepages','PeopleFinder','MyLife','Radaris','Pipl','Acxiom','LexisNexis','Epsilon','Oracle Data Cloud','PeopleSmart','Instant Checkmate','TruthFinder','US Search','ZabaSearch','PublicRecordsNow','InfoTracer','Peekyou','Addresses.com','AnyWho','FastPeopleSearch','FamilyTreeNow','CheckPeople','PrivateRecords','Clustrmaps'].map(b => (
              <GlassCard key={b} strength={6}
                className="text-[11px] font-medium text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-lg transition-all cursor-default">
                {b}
              </GlassCard>
            ))}
            <span className="text-[11px] font-semibold text-red-400 px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', boxShadow: '0 0 16px rgba(220,38,38,0.1)' }}>
              + 168 more
            </span>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-white/[0.04] py-20">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12">
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[11px] font-bold tracking-[0.2em] text-red-500 uppercase">TESTIMONIALS</span>
            <h2 className="text-3xl font-extrabold mt-3 mb-3">Trusted by Privacy-Conscious People</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Sarah K.', role: 'Marketing Executive', loc: 'New York, NY', avatar: 'https://i.pravatar.cc/64?img=47', text: 'Within 48 hours, vindica found my address, phone number, and family members on 23 broker sites and sent removal requests automatically.', stat: '23 sources removed' },
              { name: 'James T.', role: 'Attorney', loc: 'Chicago, IL', avatar: 'https://i.pravatar.cc/64?img=12', text: "vindica's automated GDPR opt-out system is legally sound and remarkably effective. My Privacy Score went from 31 to 74 in weeks.", stat: 'Score +43 pts' },
              { name: 'Priya M.', role: 'Software Engineer', loc: 'San Francisco, CA', avatar: 'https://i.pravatar.cc/64?img=58', text: "I just entered my email and watched vindica do everything — scanned, scored, sent removals, and gave me a detailed breach report.", stat: '47 opt-outs sent' },
            ].map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <GlassCard className="h-full p-6 rounded-2xl flex flex-col">
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, si) => <Star key={si} className="h-3.5 w-3.5 text-red-500 fill-red-500" />)}
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed mb-5 flex-1">"{t.text}"</p>
                  <div className="pt-4 border-t border-white/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={t.avatar} alt={t.name} className="h-9 w-9 rounded-full object-cover"
                        style={{ boxShadow: '0 0 0 2px rgba(220,38,38,0.3), 0 4px 12px rgba(0,0,0,0.4)' }} />
                      <div>
                        <div className="text-xs font-bold text-white">{t.name}</div>
                        <div className="text-[10px] text-gray-600">{t.role} · {t.loc}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-red-400 px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)' }}>{t.stat}</span>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section id="pricing" className="relative z-10 border-t border-white/[0.04] py-20">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12">
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[11px] font-bold tracking-[0.2em] text-red-500 uppercase">PRICING</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold mt-3 mb-3">Simple, Transparent Pricing</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">Start free. Upgrade when you're ready for full control.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { tier: 'Free', price: '$0', period: 'forever', desc: 'See your exposure.', features: ['One-time exposure scan', 'Privacy Score', 'Top 5 broker listings', 'Breach report preview', 'Basic email alerts'], cta: 'Start Free', glow: false },
              { tier: 'Pro', price: '$9', period: '/month', desc: 'Full privacy control.', features: ['Continuous monitoring', '196+ source scans', 'Automated opt-out requests', 'Dark web monitoring', 'GDPR/CCPA legal requests', 'Monthly PDF reports', 'Priority support'], cta: 'Get Pro', glow: true, badge: 'Most Popular' },
              { tier: 'Business', price: '$49', period: '/month', desc: 'For executives and families.', features: ['Everything in Pro', 'Up to 5 profiles', 'Executive threat reports', 'Honey token monitoring', 'API access', 'Custom compliance reports', 'Dedicated account manager'], cta: 'Contact Sales', glow: false },
            ].map((plan, i) => (
              <motion.div key={plan.tier} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <GlassCard glow={plan.glow} className="relative h-full rounded-2xl p-7 flex flex-col">
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="text-[10px] font-bold text-white px-3 py-1 rounded-full"
                        style={{ background: 'linear-gradient(180deg, rgba(240,50,50,1) 0%, rgba(180,20,20,1) 100%)', boxShadow: '0 4px 16px rgba(220,38,38,0.5), inset 0 1px 0 rgba(255,150,150,0.3)' }}>
                        {plan.badge}
                      </span>
                    </div>
                  )}
                  <div className="mb-5">
                    <div className="text-sm font-bold text-gray-500 mb-2">{plan.tier}</div>
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-4xl font-black text-white"
                        style={plan.glow ? { textShadow: '0 0 24px rgba(220,38,38,0.3)' } : undefined}>{plan.price}</span>
                      <span className="text-sm text-gray-600 mb-1.5">{plan.period}</span>
                    </div>
                    <p className="text-xs text-gray-600">{plan.desc}</p>
                  </div>
                  <ul className="space-y-2.5 mb-7 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-xs text-gray-400">
                        <CheckCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />{f}
                      </li>
                    ))}
                  </ul>
                  {plan.glow
                    ? <GlossyButton to="/login" className="w-full">{plan.cta}</GlossyButton>
                    : <Link to="/login" className="w-full text-center py-2.5 rounded-xl text-sm font-semibold text-gray-300 hover:text-white transition-all"
                        style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                        {plan.cta}
                      </Link>
                  }
                </GlassCard>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-700 mt-6">14-day money-back guarantee · Cancel anytime · No hidden fees</p>
        </div>
      </section>

      {/* ── Trust ────────────────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-white/[0.04] py-14">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Lock, title: 'AES-256 Encryption', desc: 'All PII encrypted at rest and in transit with KMS-managed keys' },
              { icon: Shield, title: 'GDPR Compliant', desc: 'Full EU data protection compliance with right-to-erasure support' },
              { icon: FileText, title: 'CCPA Certified', desc: 'California Consumer Privacy Act compliant opt-out mechanisms' },
              { icon: Zap, title: 'Zero Data Selling', desc: 'We never sell, share, or monetize your personal information' },
            ].map((item, i) => (
              <motion.div key={item.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                <GlassCard className="flex gap-3 items-start p-4 rounded-xl" strength={6}>
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)', boxShadow: '0 0 12px rgba(220,38,38,0.08)' }}>
                    <item.icon className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white mb-1">{item.title}</div>
                    <div className="text-[11px] text-gray-600 leading-relaxed">{item.desc}</div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-white/[0.04] py-20">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12">
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[11px] font-bold tracking-[0.2em] text-red-500 uppercase">FAQ</span>
            <h2 className="text-3xl font-extrabold mt-3">Frequently Asked Questions</h2>
          </motion.div>
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQS.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                <FaqItem q={faq.q} a={faq.a} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-white/[0.04] py-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(140,0,0,0.18) 0%, transparent 70%)' }} />
        <motion.div className="relative max-w-2xl mx-auto px-8 text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="text-[11px] font-bold tracking-[0.2em] text-red-500 uppercase block mb-4">YOUR PRIVACY STARTS NOW</span>
          <h2 className="text-4xl lg:text-5xl font-black mb-5 leading-tight">See Where Your<br />Data Is Right Now</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed">Free scan takes under 60 seconds. No credit card required.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <GlossyButton to="/login" className="px-8 py-4 text-base">
              <Shield className="h-5 w-5" /> Run Free Exposure Scan
            </GlossyButton>
            <Link to="/login" className="inline-flex items-center gap-2 px-6 py-4 text-sm font-semibold text-gray-400 hover:text-white rounded-xl transition-all"
              style={{ backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              Try Demo First →
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8">
            {['GDPR', 'CCPA', 'SOC 2', 'AES-256'].map(badge => (
              <div key={badge} className="flex items-center gap-1.5">
                <CheckCircle className="h-3 w-3 text-red-500" />
                <span className="text-[10px] text-gray-600 font-semibold">{badge}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.04]"
        style={{ background: 'rgba(4,2,3,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-7 w-7 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(40,0,0,0.7)', border: '1px solid rgba(220,38,38,0.35)', boxShadow: '0 0 12px rgba(220,38,38,0.25)' }}>
                  <ShieldCheck className="h-4 w-4 text-red-400" />
                </div>
                <span className="font-black text-base tracking-tight">vindica</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-4 max-w-xs">Privacy intelligence platform. Find your exposure. Remove your data. Guard your identity.</p>
              <div className="flex gap-3">
                {[Twitter, Github, Linkedin, Mail].map((Icon, i) => (
                  <a key={i} href="#" className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-700 hover:text-gray-400 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </div>
            {[
              { title: 'Product', links: ['How It Works', 'Pricing', 'Data Brokers', 'Privacy Score', 'API Docs'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press', 'Contact'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR', 'CCPA'] },
            ].map(col => (
              <div key={col.title}>
                <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-3">{col.title}</div>
                <ul className="space-y-2">
                  {col.links.map(link => <li key={link}><a href="#" className="text-xs text-gray-700 hover:text-gray-400 transition-colors">{link}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.04] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-gray-700">© 2026 vindica · Privacy Intelligence Platform</p>
            <div className="flex items-center gap-4">
              {['GDPR Compliant', 'CCPA Compliant', 'KMS Encrypted', 'SOC 2 Type II'].map(badge => (
                <span key={badge} className="text-[9px] text-gray-700 font-semibold px-2 py-0.5 rounded"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}>{badge}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
