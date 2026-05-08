import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Search, Image, Trash2, FileText, UserX, Bell, Menu, X } from 'lucide-react'
import { ScanTab } from '@/components/tabs/ScanTab'
import { FindYourselfTab } from '@/components/tabs/FindYourselfTab'
import { ImageSearchTab } from '@/components/tabs/ImageSearchTab'
import { RemovalsTab } from '@/components/tabs/RemovalsTab'
import { ReportsTab } from '@/components/tabs/ReportsTab'
import { TrackHimTab } from '@/components/tabs/TrackHimTab'

const TABS = [
  { id: 'scan',    label: 'Dashboard',     icon: ShieldCheck, short: 'Scan' },
  { id: 'find',    label: 'Find Yourself', icon: Search,      short: 'Find' },
  { id: 'image',   label: 'Image Search',  icon: Image,       short: 'Image' },
  { id: 'removal', label: 'Opt-Out Queue', icon: Trash2,      short: 'Remove' },
  { id: 'reports', label: 'Reports',       icon: FileText,    short: 'Report' },
  { id: 'track',   label: 'Evidence',      icon: UserX,       short: 'Evidence' },
] as const

type TabId = typeof TABS[number]['id']

export function CommandCenter() {
  const [activeTab, setActiveTab] = useState<TabId>('scan')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-900 bg-black/95 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-red-500" />
            <span className="font-bold text-white text-sm tracking-wide">DATA GUARD</span>
            <span className="hidden sm:inline text-xs text-gray-600 ml-1">Command Center</span>
          </div>

          {/* Desktop tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-red-950/60 text-red-400 border border-red-900/50'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.short}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button className="relative p-1.5 rounded-lg bg-gray-900 border border-gray-800">
              <Bell className="h-4 w-4 text-gray-400" />
              <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
            <button
              className="md:hidden p-1.5 rounded-lg bg-gray-900 border border-gray-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-4 w-4 text-gray-400" /> : <Menu className="h-4 w-4 text-gray-400" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-900 bg-black px-4 py-3 grid grid-cols-3 gap-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false) }}
                className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-red-950/60 text-red-400 border border-red-900/50'
                    : 'text-gray-500 border border-gray-900'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.short}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'scan'    && <ScanTab onNavigate={(tab) => setActiveTab(tab as TabId)} />}
            {activeTab === 'find'    && <FindYourselfTab />}
            {activeTab === 'image'   && <ImageSearchTab />}
            {activeTab === 'removal' && <RemovalsTab />}
            {activeTab === 'reports' && <ReportsTab />}
            {activeTab === 'track'   && <TrackHimTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
