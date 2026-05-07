import { motion } from 'framer-motion'
import { Bell, AlertTriangle, Info, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

function DonutChart({ completed, total }: { completed: number; total: number }) {
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (completed / total) * circ
  const cx = 48
  const cy = 48

  return (
    <div className="relative" style={{ width: 96, height: 96 }}>
      <svg width="96" height="96">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1f2937" strokeWidth={8} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#ef4444"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.6))' }}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{completed}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#6b7280" fontSize="9">Completed</text>
      </svg>
    </div>
  )
}

export function RemovalsPage() {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-900">
        <div />
        <button className="relative p-2 rounded-full bg-gray-900 border border-gray-800">
          <Bell className="h-5 w-5 text-gray-400" />
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-600 text-[9px] font-bold flex items-center justify-center">3</span>
        </button>
      </div>

      {/* Hero banner */}
      <div className="relative overflow-hidden px-6 pt-8 pb-10 border-b border-gray-900">
        <div className="absolute right-6 top-6 opacity-20">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 rounded-full border border-red-500/30" />
            <div className="absolute inset-4 rounded-full border border-red-500/20" />
            <div className="absolute inset-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-red-600/50" />
            </div>
          </div>
        </div>
        <p className="text-xs font-semibold tracking-widest text-red-500 uppercase mb-2">Removals Control Center</p>
        <h1 className="text-3xl font-extrabold leading-tight">
          You're in Control<br />
          <span className="text-red-500">We Remove.</span>
        </h1>
        <p className="mt-3 text-sm text-gray-400 max-w-xs">
          We find and remove your personal data from data brokers, people search sites, and the open web.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Queued Removals */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="card-dark p-5"
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-white">Queued Removals</h2>
            <span className="text-xs text-red-500 font-semibold">78 in progress ›</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">Removals in progress across the web.</p>
          <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden mb-4">
            <div className="h-full w-3/4 rounded-full bg-red-600" style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.5))' }} />
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              ['2–7 days', 'Est. Completion'],
              ['23', 'Brokers'],
              ['78', 'Profiles'],
              ['1,126', 'Data Points'],
            ].map(([v, l]) => (
              <div key={l}>
                <div className="text-sm font-bold text-white">{v}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Brokers + Pending row */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="card-dark p-5"
          >
            <h2 className="font-semibold text-white text-sm mb-0.5">Brokers Completed</h2>
            <p className="text-[10px] text-gray-500 mb-3">Last 30 days</p>
            <div className="flex items-center gap-3">
              <DonutChart completed={36} total={48} />
              <div>
                <div className="text-sm font-bold text-red-500">36</div>
                <div className="text-[10px] text-gray-500">Completed</div>
                <div className="text-sm font-bold text-white mt-2">12</div>
                <div className="text-[10px] text-gray-500">In Progress</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="card-dark p-5"
          >
            <h2 className="font-semibold text-white text-sm mb-0.5">Pending Actions</h2>
            <p className="text-[10px] text-gray-500 mb-3">Requires your review</p>
            <div className="space-y-3">
              {[
                { label: 'ID Verification', sub: '2 documents', count: 2 },
                { label: 'Confirm Removals', sub: '5 brokers', count: 5 },
              ].map(a => (
                <div key={a.label} className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-gray-800 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-sm border border-gray-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-white">{a.label}</div>
                    <div className="text-[10px] text-gray-500">{a.sub}</div>
                  </div>
                  <div className="h-5 w-5 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-bold">{a.count}</div>
                  <ChevronRight className="h-3 w-3 text-gray-600" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Dark Web Monitoring */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="card-dark p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-white mb-0.5">Dark Web Monitoring</h2>
              <p className="text-xs text-gray-500">Continuous monitoring for your exposed data.</p>
              <div className="flex items-center gap-2 mt-3">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-500 font-semibold">Monitoring Active</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">No new exposures</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500">Last Scan</p>
              <p className="text-xs text-red-500 font-semibold">2 hrs ago</p>
              <div className="mt-2 opacity-40">
                <DotMap />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="card-dark p-5"
        >
          <h2 className="font-semibold text-white mb-0.5">Alerts</h2>
          <p className="text-xs text-gray-500 mb-4">Important updates and notifications.</p>
          <div className="space-y-3">
            {[
              { icon: <AlertTriangle className="h-4 w-4 text-red-400" />, title: 'New Exposure Found', sub: '1 new record on a broker site', time: '1h ago' },
              { icon: <Info className="h-4 w-4 text-blue-400" />, title: 'Removal Completed', sub: 'Your profile was removed from 3 sites', time: '5h ago' },
            ].map(a => (
              <div key={a.title} className="flex items-center gap-3 cursor-pointer hover:bg-gray-900/50 -mx-2 px-2 py-1 rounded-lg transition-colors">
                {a.icon}
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">{a.title}</div>
                  <div className="text-xs text-gray-500">{a.sub}</div>
                </div>
                <span className="text-[10px] text-gray-600">{a.time}</span>
                <ChevronRight className="h-3 w-3 text-gray-600" />
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-900 bg-black">
        <div className="max-w-2xl mx-auto flex items-center justify-around px-4 py-3">
          {[
            { href: '/exposure', label: 'Dashboard' },
            { href: '/removals', label: 'Removals', active: true },
            { href: '/monitoring', label: 'Monitoring' },
            { href: '/brokers', label: 'Brokers' },
            { href: '/account', label: 'Account' },
          ].map(item => (
            <Link key={item.href} to={item.href} className={`flex flex-col items-center gap-1 text-[10px] ${item.active ? 'text-red-500' : 'text-gray-600'}`}>
              <div className="h-5 w-5 rounded bg-current opacity-60" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function DotMap() {
  const dots = Array.from({ length: 60 }, (_, i) => ({
    x: (i * 47) % 100,
    y: (i * 31 + 10) % 60,
    r: Math.random() > 0.8 ? 2 : 1,
  }))
  return (
    <svg width="80" height="40" viewBox="0 0 100 60">
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#ef4444" />
      ))}
    </svg>
  )
}
