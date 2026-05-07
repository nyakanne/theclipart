import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Database, RotateCcw, Bell, FileText, ShieldOff } from 'lucide-react'
import { NetworkGraph } from '@/components/ui/NetworkGraph'

const FEATURES = [
  { icon: <Database className="h-5 w-5 text-red-500" />, title: 'Comprehensive Scans', desc: 'We scan thousands of sources to find your data.' },
  { icon: <RotateCcw className="h-5 w-5 text-red-500" />, title: 'Automated Removals', desc: 'We submit opt-out requests and track the results.' },
  { icon: <Bell className="h-5 w-5 text-red-500" />, title: 'Continuous Monitoring', desc: 'We monitor new exposures and alert you instantly.' },
  { icon: <FileText className="h-5 w-5 text-red-500" />, title: 'Privacy Reports', desc: 'Understand your exposure and removal progress.' },
  { icon: <ShieldOff className="h-5 w-5 text-red-500" />, title: 'Your Privacy, Restored', desc: 'Take control and keep your data off the open web.' },
]

const STATS = [
  { value: '196', label: 'Sources Found', sub: 'Across 32 data categories' },
  { value: '78', label: 'Exposure Score', highlight: true },
  { value: '24', label: 'Active Removals' },
]

const PRESS = ['Forbes', 'TechCrunch', 'INSIDER', 'The New York Times']

export function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-900">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-red-500" />
          <span className="font-bold text-lg">Data Guard</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          {['How It Works', 'Data Brokers', 'People Search', 'Pricing', 'Resources'].map(l => (
            <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Log in</Link>
          <Link to="/login" className="btn-red">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-8 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
          <p className="text-xs font-semibold tracking-widest text-red-500 uppercase mb-4">Privacy, In Control</p>
          <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
            Protect Your<br />
            <span className="text-red-500 text-glow-red">Digital Footprint.</span>
          </h1>
          <p className="mt-6 text-gray-400 max-w-md leading-relaxed">
            Find and remove your personal information from data broker networks, people search sites, and the open web.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Link to="/login" className="btn-red">
              <ShieldCheck className="h-4 w-4" />
              Scan My Exposure
            </Link>
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">How It Works →</a>
          </div>
          <p className="mt-8 text-xs text-gray-600">Trusted by individuals, professionals, and families worldwide.</p>
          <div className="mt-3 flex items-center gap-6">
            {PRESS.map(p => <span key={p} className="text-xs font-semibold text-gray-600">{p}</span>)}
          </div>
          <div className="mt-10 flex items-center gap-8">
            {STATS.map(s => (
              <div key={s.label}>
                <div className={`text-2xl font-bold ${s.highlight ? 'text-red-500' : 'text-white'}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex justify-center"
        >
          <NetworkGraph size={420} animated />
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-8 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="card-dark p-4">
              <div className="mb-3">{f.icon}</div>
              <p className="text-sm font-semibold text-white">{f.title}</p>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
