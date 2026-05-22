import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, Search, Image, Trash2, FileText, UserX, Bell,
  Menu, X, LogOut, Mail, Fingerprint, Send, ScanSearch,
  ClipboardList, Crosshair, ChevronRight, Activity
} from 'lucide-react'
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
import { FootprintAnimation } from '@/components/FootprintAnimation'

const TABS = [
  { id: 'scan',        label: 'Privacy Scan',      icon: ShieldCheck,   short: 'Scan',     group: 'Core' },
  { id: 'find',        label: 'Find Yourself',      icon: Search,        short: 'Find',     group: 'Core' },
  { id: 'removal',     label: 'Opt-Out Queue',      icon: Trash2,        short: 'Remove',   group: 'Core' },
  { id: 'reports',     label: 'Legal Signals',      icon: FileText,      short: 'Legal',    group: 'Core' },
  { id: 'image',       label: 'Image Search',       icon: Image,         short: 'Image',    group: 'Tools' },
  { id: 'reverse',     label: 'Reverse Image',      icon: ScanSearch,    short: 'Reverse',  group: 'Tools' },
  { id: 'email',       label: 'Email Blast',        icon: Mail,          short: 'Emails',   group: 'Tools' },
  { id: 'platform',    label: 'Report Platforms',   icon: Send,          short: 'Report',   group: 'Tools' },
  { id: 'fingerprint', label: 'Fingerprint',        icon: Fingerprint,   short: 'Hash',     group: 'Tools' },
  { id: 'osint',       label: 'OSINT Tools',        icon: Crosshair,     short: 'OSINT',    group: 'Intel' },
  { id: 'track',       label: 'Evidence Board',     icon: UserX,         short: 'Evidence', group: 'Intel' },
  { id: 'police',      label: 'Police Report',      icon: ClipboardList, short: 'Police',   group: 'Intel' },
] as const

type TabId = typeof TABS[number]['id']

const GROUPS = ['Core', 'Tools', 'Intel'] as const

export function CommandCenter() {
  const [activeTab, setActiveTab] = useState<TabId>('scan')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showAnimation, setShowAnimation] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const handleAnimationComplete = useCallback(() => setShowAnimation(false), [])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const activeTabDef = TABS.find(t => t.id === activeTab)

  return (
    <>
      {showAnimation && <FootprintAnimation onComplete={handleAnimationComplete} />}
      <div className="min-h-screen bg-[#030305] flex flex-col">

        {/* ── Top header ────────────────────────────────────────────────── */}
        <header className="border-b border-gray-900 bg-black/95 sticky top-0 z-50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center justify-between h-14 px-4">

            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-red-950/60 border border-red-900/50 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-red-500" />
              </div>
              <span className="font-black text-sm tracking-tight text-white">vindica</span>
              <span className="hidden sm:inline text-[10px] text-gray-600 font-medium">Command Center</span>
            </div>

            {/* Breadcrumb */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-600">
              <Activity className="h-3 w-3 text-red-500" />
              <span className="text-gray-700">/</span>
              <span className="text-red-400 font-semibold">{activeTabDef?.label}</span>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Notification */}
              <button className="relative p-1.5 rounded-lg bg-gray-900/60 border border-gray-800/60 hover:border-gray-700 transition-colors">
                <Bell className="h-3.5 w-3.5 text-gray-500" />
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500 ring-1 ring-black" />
              </button>

              {/* Sidebar toggle (desktop) */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden md:flex p-1.5 rounded-lg bg-gray-900/60 border border-gray-800/60 hover:border-gray-700 transition-colors"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <ChevronRight className={`h-3.5 w-3.5 text-gray-500 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
              </button>

              {/* User pill */}
              {user && (
                <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-800/60">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="h-6 w-6 rounded-full object-cover ring-1 ring-red-900/40" />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-red-950/60 border border-red-900/50 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-red-400">{user.name?.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <span className="text-xs text-gray-400 max-w-[90px] truncate">{user.name}</span>
                  <button
                    onClick={handleLogout}
                    title="Sign out"
                    className="p-1 rounded text-gray-700 hover:text-gray-300 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                className="md:hidden p-1.5 rounded-lg bg-gray-900/60 border border-gray-800/60"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-4 w-4 text-gray-400" /> : <Menu className="h-4 w-4 text-gray-400" />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown nav */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-900/60 bg-black px-4 py-3 space-y-3">
              {GROUPS.map(group => (
                <div key={group}>
                  <div className="text-[9px] font-bold text-gray-700 uppercase tracking-widest mb-2">{group}</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {TABS.filter(t => t.group === group).map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false) }}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
                          activeTab === tab.id
                            ? 'bg-red-950/50 text-red-400 border border-red-900/40'
                            : 'text-gray-600 border border-gray-900/60 hover:text-gray-300 hover:border-gray-800'
                        }`}
                      >
                        <tab.icon className="h-3.5 w-3.5" />
                        {tab.short}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {user && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-900/60">
                  <div className="flex items-center gap-2">
                    {user.picture
                      ? <img src={user.picture} alt={user.name} className="h-6 w-6 rounded-full object-cover" />
                      : <div className="h-6 w-6 rounded-full bg-red-950/60 border border-red-900/50 flex items-center justify-center"><span className="text-[10px] font-bold text-red-400">{user.name?.charAt(0).toUpperCase()}</span></div>
                    }
                    <span className="text-xs text-gray-400">{user.name}</span>
                  </div>
                  <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-400 transition-colors">
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </header>

        {/* ── Main layout: sidebar + content ────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar (desktop) */}
          <aside className={`hidden md:flex flex-col flex-shrink-0 border-r border-gray-900/60 bg-black/60 transition-all duration-300 ${sidebarCollapsed ? 'w-14' : 'w-52'}`}>
            <nav className="flex-1 py-4 px-2 space-y-4 overflow-y-auto">
              {GROUPS.map(group => (
                <div key={group}>
                  {!sidebarCollapsed && (
                    <div className="px-2 mb-1.5 text-[9px] font-bold text-gray-700 uppercase tracking-widest">{group}</div>
                  )}
                  <div className="space-y-0.5">
                    {TABS.filter(t => t.group === group).map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        title={sidebarCollapsed ? tab.label : undefined}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group ${
                          activeTab === tab.id
                            ? 'bg-red-950/50 text-red-400 border border-red-900/40'
                            : 'text-gray-600 hover:text-gray-300 hover:bg-gray-900/60 border border-transparent'
                        }`}
                      >
                        <tab.icon className={`h-3.5 w-3.5 flex-shrink-0 ${activeTab === tab.id ? 'text-red-500' : 'text-gray-700 group-hover:text-gray-400'}`} />
                        {!sidebarCollapsed && <span className="truncate">{tab.label}</span>}
                        {!sidebarCollapsed && activeTab === tab.id && (
                          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Sidebar footer */}
            {!sidebarCollapsed && user && (
              <div className="border-t border-gray-900/60 p-3">
                <div className="flex items-center gap-2 mb-2">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="h-7 w-7 rounded-full object-cover ring-1 ring-red-900/30 flex-shrink-0" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-red-950/50 border border-red-900/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-red-400">{user.name?.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-white truncate">{user.name}</div>
                    <div className="text-[10px] text-gray-600 truncate">{user.email}</div>
                  </div>
                </div>
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-gray-600 hover:text-red-400 hover:bg-red-950/20 transition-colors">
                  <LogOut className="h-3 w-3" /> Sign out
                </button>
              </div>
            )}
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
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
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
