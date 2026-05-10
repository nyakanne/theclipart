import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, Search, Image, Trash2, FileText, UserX, Bell, Menu, X, LogOut, Mail, Fingerprint, Send, ScanSearch, ClipboardList, Crosshair } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ScanTab } from '@/components/tabs/ScanTab'
import { FindYourselfTab } from '@/components/tabs/FindYourselfTab'
import { ImageSearchTab } from '@/components/tabs/ImageSearchTab'
import { RemovalsTab } from '@/components/tabs/RemovalsTab'
import { ReportsTab } from '@/components/tabs/ReportsTab'
import { TrackHimTab } from '@/components/tabs/TrackHimTab'
import { EmailBlastTab } from '@/components/tabs/EmailBlastTab'
import { FingerprintTab } from '@/components/tabs/FingerprintTab'
import { PlatformReporterTab } from '@/components/tabs/PlatformReporterTab'
import { ReverseImageTab } from '@/components/tabs/ReverseImageTab'
import { PoliceReportTab } from '@/components/tabs/PoliceReportTab'
import { OsintTab } from '@/components/tabs/OsintTab'
import { useAuthStore } from '@/store/authStore'

const TABS = [
  { id: 'scan',        label: 'Dashboard',        icon: ShieldCheck,   short: 'Scan' },
  { id: 'find',        label: 'Find Yourself',    icon: Search,        short: 'Find' },
  { id: 'image',       label: 'Image Search',     icon: Image,         short: 'Image' },
  { id: 'reverse',     label: 'Reverse Image',    icon: ScanSearch,    short: 'Reverse' },
  { id: 'removal',     label: 'Opt-Out Queue',    icon: Trash2,        short: 'Remove' },
  { id: 'email',       label: 'Email Blast',      icon: Mail,          short: 'Emails' },
  { id: 'platform',    label: 'Report Platforms', icon: Send,          short: 'Report' },
  { id: 'fingerprint', label: 'Fingerprint',      icon: Fingerprint,   short: 'Hash' },
  { id: 'police',      label: 'Police Report',    icon: ClipboardList, short: 'Police' },
  { id: 'reports',     label: 'Legal Signals',    icon: FileText,      short: 'Legal' },
  { id: 'osint',       label: 'OSINT Tools',      icon: Crosshair,     short: 'OSINT' },
  { id: 'track',       label: 'Evidence',         icon: UserX,         short: 'Evidence' },
] as const

type TabId = typeof TABS[number]['id']

export function CommandCenter() {
  const [activeTab, setActiveTab] = useState<TabId>('scan')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top bar */}
      <header className="border-b border-gray-900 bg-black/95 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-red-500" />
            <span className="font-bold text-white text-sm tracking-wide">PHANTOM</span>
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

          {/* Right side: notifications + user */}
          <div className="flex items-center gap-2">
            <button className="relative p-1.5 rounded-lg bg-gray-900 border border-gray-800">
              <Bell className="h-4 w-4 text-gray-400" />
              <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>

            {/* User display */}
            {user && (
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-800">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-red-950/60 border border-red-900/50 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-red-400">{user.name?.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <span className="text-xs text-gray-400 max-w-[100px] truncate">{user.name}</span>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-1 rounded text-gray-600 hover:text-gray-300 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

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
          <div className="md:hidden border-t border-gray-900 bg-black px-4 py-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
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
            {user && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-900">
                <div className="flex items-center gap-2">
                  {user.picture
                    ? <img src={user.picture} alt={user.name} className="h-6 w-6 rounded-full object-cover" />
                    : <div className="h-6 w-6 rounded-full bg-red-950/60 border border-red-900/50 flex items-center justify-center"><span className="text-[10px] font-bold text-red-400">{user.name?.charAt(0).toUpperCase()}</span></div>
                  }
                  <span className="text-xs text-gray-400">{user.name}</span>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-300">
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            )}
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
            {activeTab === 'scan'        && <ScanTab onNavigate={(tab) => setActiveTab(tab as TabId)} />}
            {activeTab === 'find'        && <FindYourselfTab />}
            {activeTab === 'image'       && <ImageSearchTab />}
            {activeTab === 'reverse'     && <ReverseImageTab />}
            {activeTab === 'removal'     && <RemovalsTab />}
            {activeTab === 'email'       && <EmailBlastTab />}
            {activeTab === 'platform'    && <PlatformReporterTab />}
            {activeTab === 'fingerprint' && <FingerprintTab />}
            {activeTab === 'police'      && <PoliceReportTab />}
            {activeTab === 'reports'     && <ReportsTab />}
            {activeTab === 'osint'       && <OsintTab />}
            {activeTab === 'track'       && <TrackHimTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
