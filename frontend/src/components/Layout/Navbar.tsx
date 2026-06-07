import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, ChevronDown, Menu, ShieldAlert, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthSession } from '@/hooks/useAuthSession'

const navItems = [
  { label: 'Command Center', href: '/#command-center' },
  { label: 'Scan', href: '/scan-yourself#command-center' },
  { label: 'Find Yourself', href: '/lookup' },
  { label: 'OSINT', href: '/osint#command-center' },
  { label: 'Authorized Tracker', href: '/track#command-center' },
  { label: 'Opt Out', href: '/opt-out#command-center' },
  { label: 'Reports', href: '/reports', hasMenu: true },
  { label: 'Dashboard', href: '/dashboard' },
]

const visibleNavItems = import.meta.env.DEV
  ? [...navItems, { label: 'Phase 1', href: '/internal/phase1' }]
  : navItems

export function Navbar() {
  const { pathname } = useLocation()
  const { isAuthenticated } = useAuthSession()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-40 border-b border-[#d4af37]/12 bg-black/88 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.42),rgba(186,24,27,0.4),transparent)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#d4af37]/25 bg-[radial-gradient(circle_at_50%_30%,rgba(212,175,55,0.22),rgba(186,24,27,0.16),rgba(0,0,0,0.9))] shadow-[0_0_34px_rgba(186,24,27,0.22)]">
              <ShieldAlert className="h-6 w-6 fill-red-600 text-[#f5d7a1]" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#f5d7a1]">Detect. Remove. Defend.</div>
              <span className="text-2xl font-black tracking-tight text-white">Vindica</span>
            </div>
          </Link>

          <div className="hidden items-center gap-5 xl:gap-8 lg:flex">
            {visibleNavItems.map(({ label, href, hasMenu }) => (
              <Link
                key={href}
                to={href}
                className={clsx(
                  'flex items-center gap-1.5 text-xs font-semibold tracking-[0.04em] transition-colors xl:text-sm',
                  pathname === href || (href !== '/' && pathname.startsWith(href.split('#')[0]))
                    ? 'text-[#f5d7a1]'
                    : 'text-gray-300 hover:text-white'
                )}
              >
                {label}
                {hasMenu && <ChevronDown className="h-3.5 w-3.5" />}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/account"
              className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-xs font-semibold text-gray-300 transition-colors hover:border-red-500/40 hover:text-white sm:inline-flex sm:text-sm"
            >
              {isAuthenticated ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Vault active
                </>
              ) : (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400/75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-400" />
                  </span>
                  Sign in / create vault
                </>
              )}
            </Link>
            <Link
              to="/#scan"
              className="hidden items-center gap-2 rounded-lg border border-red-500/70 bg-[linear-gradient(180deg,rgba(186,24,27,0.32),rgba(60,5,9,0.88))] px-5 py-3 text-sm font-bold text-[#fff7e8] transition-colors hover:border-[#d4af37]/45 hover:text-white sm:inline-flex"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              onClick={() => setMenuOpen(open => !open)}
              className="grid h-10 w-10 place-items-center border border-white/10 bg-black/45 text-gray-200 lg:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
      {menuOpen ? (
        <div className="border-t border-white/10 bg-[#050507] px-4 py-4 lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-1">
            {visibleNavItems.map(({ label, href }) => (
              <Link
                key={href}
                to={href}
                onClick={() => setMenuOpen(false)}
                className={clsx(
                  'border-l-2 px-4 py-3 text-sm font-semibold transition-colors',
                  pathname === href || (href !== '/' && pathname.startsWith(href.split('#')[0]))
                    ? 'border-[#d4af37] bg-[#d4af37]/[0.05] text-white'
                    : 'border-white/10 text-gray-400 hover:border-red-500 hover:text-white'
                )}
              >
                {label}
              </Link>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link to="/account" onClick={() => setMenuOpen(false)} className="border border-white/10 px-4 py-3 text-center text-sm font-bold text-gray-200">
                {isAuthenticated ? 'Open vault' : 'Create vault'}
              </Link>
              <Link to="/#scan" onClick={() => setMenuOpen(false)} className="border border-red-500/50 bg-red-600 px-4 py-3 text-center text-sm font-bold text-white">
                Start scan
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  )
}
