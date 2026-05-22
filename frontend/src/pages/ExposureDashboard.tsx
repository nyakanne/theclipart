import { motion } from 'framer-motion'
import { Bell, RotateCcw } from 'lucide-react'
import { NetworkGraph } from '@/components/ui/NetworkGraph'
import { PrivacyScore } from '@/components/ui/PrivacyScore'
import { Link } from 'react-router-dom'

export function ExposureDashboard() {
  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-900">
        <h1 className="text-xl font-bold">Exposure Dashboard</h1>
        <button className="relative p-2 rounded-full bg-gray-900 border border-gray-800">
          <Bell className="h-5 w-5 text-gray-400" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <p className="text-sm text-gray-500">Your personal data exposure overview</p>

        {/* Score + sources row */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="card-dark p-5"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Privacy Score</p>
            <PrivacyScore score={27} size={72} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="card-dark p-5"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Total Sources Found</p>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-4xl font-bold text-white">273</div>
                <div className="text-xs text-gray-500 mt-1">Across 6 Categories</div>
              </div>
              <div className="text-red-500 opacity-60">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <ellipse cx="12" cy="12" rx="10" ry="4" />
                  <path d="M2 12c0 5.523 4.477 10 10 10s10-4.477 10-10" />
                  <path d="M12 2v20" />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Rescan button */}
        <button className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-red-950/30 border border-red-900/40 hover:bg-red-950/50 transition-colors">
          <div className="flex items-center gap-3">
            <RotateCcw className="h-5 w-5 text-red-500" />
            <span className="font-semibold text-white">Rescan Exposure</span>
          </div>
          <span className="text-gray-500">›</span>
        </button>

        {/* Network graph */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="card-dark p-4 flex justify-center"
        >
          <NetworkGraph size={320} animated />
        </motion.div>

        {/* Alert banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="card-dark p-4 flex items-center gap-4 cursor-pointer hover:border-red-900/40 transition-colors"
        >
          <div className="h-10 w-10 rounded-full bg-red-950/50 border border-red-900/40 flex items-center justify-center flex-shrink-0">
            <div className="h-5 w-5 rounded-full border-2 border-red-500 flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Your data is widely exposed</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Your personal information was found across 273 sources. Take action to remove your data.
            </p>
          </div>
          <span className="text-gray-500">›</span>
        </motion.div>
      </div>

      {/* Bottom nav */}
      <BottomNav active="dashboard" />
    </div>
  )
}

function BottomNav({ active }: { active: string }) {
  const items = [
    { id: 'dashboard', label: 'Dashboard', href: '/exposure', icon: ShieldIcon },
    { id: 'sources', label: 'Sources', href: '/sources', icon: DbIcon },
    { id: 'removals', label: 'Removals', href: '/removals', icon: LockIcon },
    { id: 'monitoring', label: 'Monitoring', href: '/monitoring', icon: RadarIcon },
    { id: 'settings', label: 'Settings', href: '/settings', icon: GearIcon },
  ]
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-gray-900 bg-black">
      <div className="max-w-2xl mx-auto flex items-center justify-around px-4 py-3">
        {items.map(item => (
          <Link key={item.id} to={item.href} className={`flex flex-col items-center gap-1 ${active === item.id ? 'text-red-500' : 'text-gray-600 hover:text-gray-400'}`}>
            <item.icon active={active === item.id} />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function ShieldIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
}
function DbIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
}
function LockIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
}
function RadarIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>
}
function GearIcon({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}
