import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, ChevronDown, ShieldAlert } from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { label: 'Command Center', href: '/#command-center' },
  { label: 'Scan', href: '/scan-yourself#command-center' },
  { label: 'Find Yourself', href: '/lookup' },
  { label: 'OSINT', href: '/osint#command-center' },
  { label: 'Track Him', href: '/track#command-center' },
  { label: 'Opt Out', href: '/opt-out#command-center' },
  { label: 'Reports', href: '/reports', hasMenu: true },
  { label: 'Dashboard', href: '/dashboard' },
]

export function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav className="sticky top-0 z-40 border-b border-[#d4af37]/12 bg-black/88 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.42),rgba(186,24,27,0.4),transparent)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
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
            {navItems.map(({ label, href, hasMenu }) => (
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

          <div className="flex items-center gap-4">
            <Link to="/account" className="inline-flex text-xs font-semibold text-gray-300 transition-colors hover:text-white sm:text-sm">
              Log in to save
            </Link>
            <Link
              to="/#scan"
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/70 bg-[linear-gradient(180deg,rgba(186,24,27,0.32),rgba(60,5,9,0.88))] px-5 py-3 text-sm font-bold text-[#fff7e8] transition-colors hover:border-[#d4af37]/45 hover:text-white"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
