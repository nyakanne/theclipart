import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, Database, RotateCcw, FileText, Shield,
  Search, Users, Radio, ShieldAlert, Eye, Lock, CheckCircle,
  ArrowRight, Star, ChevronDown, Globe, Zap, Fingerprint,
  AlertTriangle, Mail, Twitter,
  Github, Linkedin, FileText as FileText2
} from 'lucide-react'

// ── Radar canvas ──────────────────────────────────────────────────────────────
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
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * 0.55)
      g.addColorStop(0, 'rgba(140,0,0,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g; ctx.fillRect(0, 0, width, height)
      pts.forEach(p => { p.x = ((p.x + p.vx) + width) % width; p.y = ((p.y + p.vy) + height) % height })
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)
        if (d < 52) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.strokeStyle = `rgba(180,30,30,${(1 - d / 52) * 0.16})`; ctx.lineWidth = 0.4; ctx.stroke() }
      }
      pts.forEach((p, i) => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(220,65,55,${Math.max(0, p.a + Math.sin(t * 0.4 + i * 0.3) * 0.04)})`; ctx.fill() })
      ;[0.22, 0.42, 0.62, 0.82].forEach((frac, ri) => {
        const r = Math.min(width, height) * 0.5 * frac
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(220,38,38,${0.18 - ri * 0.03})`; ctx.lineWidth = ri === 0 ? 1.4 : 0.7
        ctx.setLineDash(ri > 0 ? [5, 14] : []); ctx.stroke(); ctx.setLineDash([])
      })
      const sweep = t * 0.5
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(sweep)
      const sg = ctx.createLinearGradient(0, 0, Math.min(width, height) * 0.4, 0)
      sg.addColorStop(0, 'rgba(220,38,38,0.22)'); sg.addColorStop(1, 'rgba(220,38,38,0)')
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, Math.min(width, height) * 0.4, -0.3, 0, false); ctx.closePath()
      ctx.fillStyle = sg; ctx.fill(); ctx.restore()
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
      ;[0, 0.33, 0.66].forEach(off => {
        const phase = ((t * 0.5 + off) % 1)
        ctx.beginPath(); ctx.arc(cx, cy, 14 + phase * 50, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(220,38,38,${0.5 * (1 - phase)})`; ctx.lineWidth = 1.5; ctx.stroke()
      })
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
  return <canvas ref={ref} width={width} height={height} className="absolute inset-0 w-full h-full" />
}

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

// ── Animated counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let start = 0
    const step = target / 60
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setValue(target); clearInterval(timer) }
      else setValue(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target])
  return <span ref={ref}>{value.toLocaleString()}{suffix}</span>
}

// ── FAQ Accordion ─────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'How does vindica find my personal data?', a: 'We scan 196+ data sources including people-search sites, data broker databases, public records, social platforms, and breach databases. Our automated engine cross-references your name, email, phone, and username to build a complete exposure map.' },
  { q: 'How long do removals take?', a: 'Most opt-out requests are acknowledged within 24–72 hours. Data brokers are legally required to process GDPR/CCPA requests within 30–45 days. We monitor each request and alert you when removal is confirmed.' },
  { q: 'Is my data safe with vindica?', a: 'All personally identifiable information is encrypted at rest using AES-256 with KMS-managed keys. We never sell your data, share it with third parties, or use it for advertising. We are GDPR and CCPA compliant.' },
  { q: 'What is a Privacy Score?', a: 'Your Privacy Score (0–100) reflects how exposed your personal data is across the web. Lower scores mean more exposure. We calculate it based on breach severity, number of broker listings, and data sensitivity.' },
  { q: 'Can vindica remove data from breach databases?', a: "We can remove you from breach notification aggregators and people-search sites that index breach data. Original breach source databases (like from a hacked company) cannot be deleted — but we minimize re-exposure by removing downstream aggregators." },
  { q: 'Do you offer refunds?', a: 'Yes. We offer a 14-day money-back guarantee on all paid plans. If you\'re not satisfied with the results, contact support within 14 days of your first payment for a full refund.' },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-900/60 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-gray-900/20 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold text-white">{q}</span>
        <ChevronDown className={`h-4 w-4 text-gray-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-4 text-sm text-gray-500 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function Home() {
  const [searchVal, setSearchVal] = useState('')
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#030305] text-white overflow-x-hidden">

      {/* ── Sticky Nav ────────────────────────────────────────────────────── */}
      <nav className={`sticky top-0 z-50 flex items-center justify-between px-8 lg:px-12 py-3.5 transition-all duration-300 ${scrolled ? 'bg-black/90 backdrop-blur-md border-b border-gray-900/80' : 'bg-transparent border-b border-gray-900/30'}`}>
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-red-950/60 border border-red-900/50 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-red-500" />
          </div>
          <span className="font-black text-base tracking-tight">vindica</span>
          <span className="text-[9px] text-red-500 font-bold bg-red-950/30 border border-red-900/30 px-1 py-0.5 rounded">BETA</span>
        </div>
        <div className="hidden md:flex items-center gap-7 text-sm text-gray-500">
          {['How It Works', 'Data Brokers', 'Pricing', 'Resources'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="hover:text-white transition-colors">{l}</a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">Log in</Link>
          <Link to="/login" className="btn-red text-sm px-4 py-2 flex items-center gap-1.5">
            Get Started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── Alert Banner ──────────────────────────────────────────────────── */}
      <div className="bg-red-950/20 border-b border-red-900/20 py-2.5 px-4 text-center">
        <p className="text-xs text-red-400">
          <span className="font-bold">Alert:</span> 847 new data broker exposures found in the last 24 hours.{' '}
          <Link to="/login" className="underline hover:text-red-300 transition-colors">Check if you're affected →</Link>
        </p>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-screen-xl mx-auto px-8 lg:px-12 py-12 grid grid-cols-1 lg:grid-cols-[44%_56%] gap-8 items-center">
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-900/40 bg-red-950/20 mb-6">
            <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-red-400 tracking-wide">REAL-TIME PRIVACY INTELLIGENCE</span>
          </div>

          <h1 className="text-5xl lg:text-[3.5rem] font-extrabold leading-[1.08] tracking-tight mb-5">
            Your Personal Data<br />
            Is{' '}
            <span className="text-red-500" style={{ textShadow: '0 0 40px rgba(220,38,38,0.5)' }}>
              Everywhere.
            </span><br />
            Take It Back.
          </h1>

          <p className="text-gray-400 text-base leading-relaxed mb-7 max-w-md">
            vindica scans 196+ data sources, scores your exposure, and automatically sends removal requests to data brokers — so you disappear from the open web.
          </p>

          {/* CTA block */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
              <input
                className="input-field pl-9 text-sm w-full"
                placeholder="Enter your name or email…"
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
              />
            </div>
            <Link to="/login" className="btn-red flex items-center justify-center gap-2 whitespace-nowrap px-5 py-2.5">
              <Shield className="h-4 w-4" />
              Scan My Exposure
            </Link>
          </div>

          <div className="flex items-center gap-3 mb-8 text-xs text-gray-600">
            <CheckCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
            <span>No credit card · Results in under 60 seconds · GDPR &amp; CCPA compliant</span>
          </div>

          {/* Press */}
          <div className="mb-8">
            <p className="text-[10px] text-gray-700 uppercase tracking-wider mb-3">As seen in</p>
            <div className="flex flex-wrap items-center gap-5">
              {['Forbes', 'TechCrunch', 'WIRED', 'Bloomberg', 'The Verge'].map(p => (
                <span key={p} className="text-[11px] font-black text-gray-600 tracking-wide hover:text-gray-400 transition-colors cursor-default">{p}</span>
              ))}
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-gray-950/60 border border-gray-900/50">
            {[
              { icon: Database, label: 'Sources Monitored', value: 196, sub: 'across 32 categories' },
              { icon: AlertTriangle, label: 'Avg Exposure Score', value: 78, sub: 'High · above average', red: true },
              { icon: RotateCcw, label: 'Removals / Month', value: 1240, sub: 'completed last 30d' },
            ].map(s => (
              <div key={s.label}>
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className={`h-3.5 w-3.5 ${s.red ? 'text-red-500' : 'text-red-500/70'}`} />
                  <span className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold">{s.label}</span>
                </div>
                <div className={`text-2xl font-black ${s.red ? 'text-red-500' : 'text-white'}`}>
                  <AnimatedCounter target={s.value} />
                </div>
                <div className={`text-[10px] ${s.red ? 'text-red-400 font-semibold' : 'text-gray-600'}`}>{s.sub}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right — radar graph */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="flex justify-center lg:justify-end overflow-hidden"
        >
          <HeroGraph />
        </motion.div>
      </section>

      {/* ── Problem Section ───────────────────────────────────────────────── */}
      <section className="border-t border-gray-900/40 py-20 bg-gradient-to-b from-transparent to-gray-950/30">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12">
          <motion.div className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[11px] font-bold tracking-[0.2em] text-red-500 uppercase">THE HIDDEN THREAT</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold mt-3 mb-4">
              The Internet Knows<br />Everything About You
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
              Right now, hundreds of data brokers are buying, selling, and publishing your home address, phone number, family members, financial history, and daily routines — without your knowledge or consent.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Globe, stat: '5,000+', label: 'Data Brokers', desc: 'Active sites selling your personal data right now' },
              { icon: Database, stat: '2.9B', label: 'Records Leaked', desc: 'Personal records exposed in 2024 alone' },
              { icon: Eye, stat: '$240', label: 'Avg Profile Value', desc: 'What data brokers charge per detailed individual profile' },
              { icon: AlertTriangle, stat: '94%', label: 'Don\'t Know', desc: 'Of people who don\'t know their data is being sold' },
            ].map((item, i) => (
              <motion.div key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="card-dark p-6 text-center hover:border-red-900/30 transition-colors">
                <div className="h-12 w-12 rounded-2xl bg-red-950/40 border border-red-900/30 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-5 w-5 text-red-500" />
                </div>
                <div className="text-3xl font-black text-red-500 mb-1" style={{ textShadow: '0 0 20px rgba(220,38,38,0.3)' }}>{item.stat}</div>
                <div className="text-sm font-bold text-white mb-2">{item.label}</div>
                <div className="text-xs text-gray-600 leading-relaxed">{item.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-gray-900/40 py-20">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12">
          <motion.div className="text-center mb-14"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[11px] font-bold tracking-[0.2em] text-red-500 uppercase">THE PROCESS</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold mt-3 mb-4">How vindica Works</h2>
            <p className="text-gray-500 max-w-md mx-auto text-sm">Three steps to reclaim your privacy. We do the hard work automatically.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* connecting line */}
            <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-red-900/40 to-transparent" />

            {[
              {
                step: '01',
                icon: Search,
                title: 'Deep Scan',
                desc: 'Enter your name, email, or phone. vindica instantly scans 196+ data sources — people-search sites, broker databases, breach records, public registries, and social platforms.',
                tags: ['196+ sources', '60 sec scan', 'Real-time'],
              },
              {
                step: '02',
                icon: Fingerprint,
                title: 'Exposure Map',
                desc: 'Get a complete Privacy Score and visual exposure map. See exactly where your data is, how severe each exposure is, and what information is publicly available about you.',
                tags: ['Privacy Score', 'Severity rating', 'Visual map'],
              },
              {
                step: '03',
                icon: Shield,
                title: 'Auto Removals',
                desc: 'We auto-generate and send legally-binding GDPR/CCPA opt-out requests to every data broker. Track progress in real-time and get notified when removals are confirmed.',
                tags: ['GDPR requests', 'CCPA opt-outs', 'Auto-tracking'],
              },
            ].map((s, i) => (
              <motion.div key={s.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="relative card-dark p-7">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center flex-shrink-0"
                    style={{ boxShadow: '0 0 20px rgba(220,38,38,0.2)' }}>
                    <s.icon className="h-5 w-5 text-red-500" />
                  </div>
                  <span className="text-4xl font-black text-gray-900 select-none">{s.step}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{s.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {s.tags.map(t => (
                    <span key={t} className="text-[10px] font-semibold text-red-400 bg-red-950/30 border border-red-900/30 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Preview ─────────────────────────────────────────────── */}
      <section className="border-t border-gray-900/40 py-20 bg-gradient-to-b from-gray-950/30 to-transparent">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12">
          <motion.div className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[11px] font-bold tracking-[0.2em] text-red-500 uppercase">PLATFORM OVERVIEW</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold mt-3 mb-4">Your Privacy Command Center</h2>
            <p className="text-gray-500 max-w-lg mx-auto text-sm leading-relaxed">
              A full intelligence dashboard. Real-time breach alerts, broker opt-out tracking, dark web monitoring, and compliance reporting — all in one place.
            </p>
          </motion.div>

          {/* Mock dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl border border-gray-800/60 overflow-hidden"
            style={{ boxShadow: '0 0 80px rgba(220,38,38,0.08), 0 40px 80px rgba(0,0,0,0.6)' }}>

            {/* Window chrome */}
            <div className="flex items-center gap-3 px-5 py-3 bg-gray-950 border-b border-gray-900/60">
              <div className="flex gap-1.5">
                {['#FF5F57','#FFBD2E','#28C941'].map(c => (
                  <div key={c} className="h-3 w-3 rounded-full" style={{ backgroundColor: '#1a1a1a' }} />
                ))}
              </div>
              <div className="flex-1 mx-4">
                <div className="h-5 rounded bg-gray-900/60 flex items-center px-3 gap-2 max-w-xs mx-auto">
                  <Lock className="h-2.5 w-2.5 text-gray-600" />
                  <span className="text-[10px] text-gray-600">vindica.me/app</span>
                </div>
              </div>
            </div>

            {/* Dashboard UI mockup */}
            <div className="bg-[#030305] p-5 grid grid-cols-12 gap-4">
              {/* Sidebar */}
              <div className="col-span-2 space-y-1">
                {['Scan', 'Removals', 'Reports', 'Monitor', 'Track', 'Settings'].map((item, i) => (
                  <div key={item} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold ${i === 0 ? 'bg-red-950/40 text-red-400 border border-red-900/30' : 'text-gray-600 hover:text-gray-400'}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-red-500' : 'bg-gray-800'}`} />
                    {item}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="col-span-10 space-y-4">
                {/* KPI row */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Privacy Score', val: '42', sub: 'High Risk', red: true },
                    { label: 'Sources Found', val: '196', sub: '32 categories' },
                    { label: 'Brokers', val: '47', sub: 'opt-out pending' },
                    { label: 'Breaches', val: '6', sub: 'verified' },
                  ].map(k => (
                    <div key={k.label} className="rounded-lg border border-gray-900/60 bg-gray-950/60 p-3">
                      <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">{k.label}</div>
                      <div className={`text-xl font-black ${k.red ? 'text-red-500' : 'text-white'}`}>{k.val}</div>
                      <div className={`text-[9px] ${k.red ? 'text-red-400' : 'text-gray-600'}`}>{k.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Breach table preview */}
                <div className="rounded-lg border border-gray-900/60 bg-gray-950/40 overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-900/60 flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-[11px] font-bold text-white">Active Breach Records</span>
                    <span className="ml-auto text-[10px] text-red-400 bg-red-950/30 border border-red-900/30 px-2 py-0.5 rounded-full">6 found</span>
                  </div>
                  <div className="divide-y divide-gray-900/40">
                    {[
                      { src: 'LinkedIn', sev: 'high', fields: 'Email, Password hash, Phone' },
                      { src: 'Spokeo', sev: 'critical', fields: 'Address, Family, Income' },
                      { src: 'BeenVerified', sev: 'medium', fields: 'Email, Age, Relatives' },
                    ].map(r => (
                      <div key={r.src} className="flex items-center gap-3 px-4 py-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.sev === 'critical' ? 'bg-red-950/60 text-red-400 border border-red-900/40' : r.sev === 'high' ? 'bg-red-950/40 text-red-400' : 'bg-gray-900/60 text-gray-500'}`}>{r.sev.toUpperCase()}</span>
                        <span className="text-[10px] font-semibold text-white w-24">{r.src}</span>
                        <span className="text-[9px] text-gray-600">{r.fields}</span>
                        <span className="ml-auto text-[9px] text-red-500 border border-red-900/30 px-2 py-0.5 rounded hover:bg-red-950/20 cursor-pointer">Remove →</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="text-center mt-8">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-400 transition-colors">
              See your full dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Data Broker Coverage ──────────────────────────────────────────── */}
      <section id="data-brokers" className="border-t border-gray-900/40 py-16">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12">
          <motion.div className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[11px] font-bold tracking-[0.2em] text-red-500 uppercase">COVERAGE</span>
            <h2 className="text-2xl lg:text-3xl font-extrabold mt-3 mb-3">We Target Every Major Data Broker</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">All 196 sources across people-search, ad networks, background check sites, and more.</p>
          </motion.div>

          <div className="flex flex-wrap gap-2 justify-center max-w-4xl mx-auto mb-8">
            {[
              'Spokeo', 'BeenVerified', 'Intelius', 'Whitepages', 'PeopleFinder', 'MyLife',
              'Radaris', 'Pipl', 'Acxiom', 'LexisNexis', 'Epsilon', 'Oracle Data Cloud',
              'PeopleSmart', 'Instant Checkmate', 'TruthFinder', 'US Search', 'ZabaSearch',
              'PublicRecordsNow', 'InfoTracer', 'Peekyou', 'Addresses.com', 'AnyWho', 'Classmates',
              'FastPeopleSearch', 'FamilyTreeNow', 'CheckPeople', 'PrivateRecords', 'Clustrmaps',
            ].map(broker => (
              <span key={broker}
                className="text-[11px] font-medium text-gray-600 hover:text-gray-300 bg-gray-950/60 border border-gray-900/60 hover:border-red-900/30 px-3 py-1.5 rounded-lg transition-colors cursor-default">
                {broker}
              </span>
            ))}
            <span className="text-[11px] font-semibold text-red-500 bg-red-950/20 border border-red-900/30 px-3 py-1.5 rounded-lg">
              + 168 more
            </span>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="border-t border-gray-900/40 py-20 bg-gradient-to-b from-transparent to-gray-950/20">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12">
          <motion.div className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[11px] font-bold tracking-[0.2em] text-red-500 uppercase">TESTIMONIALS</span>
            <h2 className="text-3xl font-extrabold mt-3 mb-3">Trusted by Privacy-Conscious People</h2>
            <p className="text-gray-500 text-sm">Real results from real vindica users.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Sarah K.',
                role: 'Marketing Executive',
                location: 'New York, NY',
                avatar: 'https://i.pravatar.cc/64?img=47',
                stars: 5,
                text: 'Within 48 hours of signing up, vindica found my address, phone number, and family members on 23 different data broker sites. They sent removal requests automatically. I feel so much safer now.',
                stat: '23 sources removed',
              },
              {
                name: 'James T.',
                role: 'Attorney',
                location: 'Chicago, IL',
                avatar: 'https://i.pravatar.cc/64?img=12',
                stars: 5,
                text: 'As a lawyer, my personal information being publicly accessible was a genuine safety risk. vindica\'s automated GDPR opt-out system is legally sound and remarkably effective. My Privacy Score went from 31 to 74.',
                stat: 'Score improved 43 pts',
              },
              {
                name: 'Priya M.',
                role: 'Software Engineer',
                location: 'San Francisco, CA',
                avatar: 'https://i.pravatar.cc/64?img=58',
                stars: 5,
                text: 'I expected a complex, technical process. Instead I just entered my email and watched vindica do everything — scanned, scored, sent removals, and gave me a detailed breach report. Incredibly well designed.',
                stat: '47 opt-outs sent',
              },
            ].map((t, i) => (
              <motion.div key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card-dark p-6 hover:border-red-900/30 transition-colors">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, si) => (
                    <Star key={si} className="h-3.5 w-3.5 text-red-500 fill-red-500" />
                  ))}
                </div>
                <p className="text-sm text-gray-400 leading-relaxed mb-5">"{t.text}"</p>
                <div className="pt-4 border-t border-gray-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={t.avatar} alt={t.name} className="h-9 w-9 rounded-full ring-2 ring-red-900/30 object-cover" />
                    <div>
                      <div className="text-xs font-bold text-white">{t.name}</div>
                      <div className="text-[10px] text-gray-600">{t.role} · {t.location}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-red-400 bg-red-950/30 border border-red-900/30 px-2.5 py-1 rounded-full">{t.stat}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-gray-900/40 py-20">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12">
          <motion.div className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[11px] font-bold tracking-[0.2em] text-red-500 uppercase">PRICING</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold mt-3 mb-3">Simple, Transparent Pricing</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">Start free. Upgrade when you're ready to take full control of your digital footprint.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                tier: 'Free',
                price: '$0',
                period: 'forever',
                desc: 'Get started and see your exposure.',
                features: ['One-time exposure scan', 'Privacy Score', 'Top 5 broker listings', 'Breach report preview', 'Basic email alerts'],
                cta: 'Start Free',
                featured: false,
              },
              {
                tier: 'Pro',
                price: '$9',
                period: '/month',
                desc: 'Full control for privacy-conscious individuals.',
                features: ['Continuous monitoring', '196+ source scans', 'Automated opt-out requests', 'Dark web monitoring', 'GDPR/CCPA legal requests', 'Monthly PDF reports', 'Priority support'],
                cta: 'Get Pro',
                featured: true,
                badge: 'Most Popular',
              },
              {
                tier: 'Business',
                price: '$49',
                period: '/month',
                desc: 'For executives, legal teams, and families.',
                features: ['Everything in Pro', 'Up to 5 profiles', 'Executive threat reports', 'Honey token monitoring', 'API access', 'Custom compliance reports', 'Dedicated account manager'],
                cta: 'Contact Sales',
                featured: false,
              },
            ].map((plan, i) => (
              <motion.div key={plan.tier}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`relative rounded-2xl border p-7 flex flex-col ${plan.featured
                  ? 'border-red-600/50 bg-gradient-to-b from-red-950/20 to-transparent'
                  : 'border-gray-800/60 bg-gray-950/40'
                }`}
                style={plan.featured ? { boxShadow: '0 0 40px rgba(220,38,38,0.12)' } : undefined}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-bold text-white bg-red-600 px-3 py-1 rounded-full">{plan.badge}</span>
                  </div>
                )}
                <div className="mb-5">
                  <div className="text-sm font-bold text-gray-400 mb-2">{plan.tier}</div>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-sm text-gray-600 mb-1.5">{plan.period}</span>
                  </div>
                  <p className="text-xs text-gray-600">{plan.desc}</p>
                </div>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-xs text-gray-400">
                      <CheckCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/login"
                  className={`w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-colors ${plan.featured
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white'
                  }`}
                  style={plan.featured ? { boxShadow: '0 0 20px rgba(220,38,38,0.3)' } : undefined}>
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-700 mt-6">14-day money-back guarantee · Cancel anytime · No hidden fees</p>
        </div>
      </section>

      {/* ── Trust Indicators ─────────────────────────────────────────────── */}
      <section className="border-t border-gray-900/40 py-14 bg-gray-950/30">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Lock, title: 'AES-256 Encryption', desc: 'All PII encrypted at rest and in transit with KMS-managed keys' },
              { icon: Shield, title: 'GDPR Compliant', desc: 'Full EU data protection compliance with right-to-erasure support' },
              { icon: FileText, title: 'CCPA Certified', desc: 'California Consumer Privacy Act compliant opt-out mechanisms' },
              { icon: Zap, title: 'Zero Data Selling', desc: 'We never sell, share, or monetize your personal information' },
            ].map((item, i) => (
              <motion.div key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex gap-3 items-start">
                <div className="h-9 w-9 rounded-lg bg-red-950/30 border border-red-900/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white mb-1">{item.title}</div>
                  <div className="text-[11px] text-gray-600 leading-relaxed">{item.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="border-t border-gray-900/40 py-20">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12">
          <motion.div className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="text-[11px] font-bold tracking-[0.2em] text-red-500 uppercase">FAQ</span>
            <h2 className="text-3xl font-extrabold mt-3 mb-3">Frequently Asked Questions</h2>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-3">
            {FAQS.map((faq, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}>
                <FaqItem q={faq.q} a={faq.a} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="border-t border-gray-900/40 py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(120,0,0,0.12) 0%, transparent 70%)' }} />
        </div>
        <motion.div className="relative max-w-2xl mx-auto px-8 text-center"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="text-[11px] font-bold tracking-[0.2em] text-red-500 uppercase block mb-4">YOUR PRIVACY STARTS NOW</span>
          <h2 className="text-4xl lg:text-5xl font-black mb-5 leading-tight">
            See Where Your<br />Data Is Right Now
          </h2>
          <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
            Free scan takes under 60 seconds. No credit card required. Start taking control of your digital identity today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link to="/login"
              className="btn-red inline-flex items-center gap-2 px-8 py-4 text-base font-bold"
              style={{ boxShadow: '0 0 40px rgba(220,38,38,0.4)' }}>
              <Shield className="h-5 w-5" />
              Run Free Exposure Scan
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 px-6 py-4 text-sm font-semibold text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700 rounded-lg transition-colors">
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

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-900/60 bg-black">
        <div className="max-w-screen-xl mx-auto px-8 lg:px-12 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-7 w-7 rounded-lg bg-red-950/60 border border-red-900/50 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-red-500" />
                </div>
                <span className="font-black text-base tracking-tight">vindica</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-4 max-w-xs">
                Privacy intelligence platform. Find your exposure. Remove your data. Guard your identity. GDPR & CCPA compliant.
              </p>
              <div className="flex gap-3">
                {[Twitter, Github, Linkedin, Mail].map((Icon, i) => (
                  <a key={i} href="#" className="h-8 w-8 rounded-lg border border-gray-900 flex items-center justify-center text-gray-700 hover:text-gray-400 hover:border-gray-700 transition-colors">
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              { title: 'Product', links: ['How It Works', 'Pricing', 'Data Brokers', 'Privacy Score', 'API Docs'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press', 'Contact'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR', 'CCPA'] },
            ].map(col => (
              <div key={col.title}>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">{col.title}</div>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link}>
                      <a href="#" className="text-xs text-gray-700 hover:text-gray-400 transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-900/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-gray-700">© 2026 vindica · Privacy Intelligence Platform</p>
            <div className="flex items-center gap-4">
              {['GDPR Compliant', 'CCPA Compliant', 'KMS Encrypted', 'SOC 2 Type II'].map(badge => (
                <span key={badge} className="text-[9px] text-gray-700 font-semibold border border-gray-900 px-2 py-0.5 rounded">{badge}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
