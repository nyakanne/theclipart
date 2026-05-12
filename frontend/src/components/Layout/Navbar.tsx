import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, ChevronDown, ShieldAlert } from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Product', href: '/#product', hasMenu: true },
  { label: 'Find Yourself', href: '/lookup' },
  { label: 'Track Him', href: '/track#command-center' },
  { label: 'Image Search', href: '/image-search' },
  { label: 'Data Brokers', href: '/#data-brokers' },
  { label: 'Resources', href: '/reports', hasMenu: true },
  { label: 'Dashboard', href: '/dashboard' },
]

export function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-black/86 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <ShieldAlert className="h-8 w-8 fill-red-600 text-red-500" />
            <span className="text-2xl font-black tracking-tight text-white">Vindica</span>
          </Link>

          <div className="hidden items-center gap-5 xl:gap-8 lg:flex">
            {navItems.map(({ label, href, hasMenu }) => (
              <Link
                key={href}
                to={href}
                className={clsx(
                  'flex items-center gap-1.5 text-xs font-medium transition-colors xl:text-sm',
                  pathname === href ? 'text-red-300' : 'text-gray-300 hover:text-white'
                )}
              >
                {label}
                {hasMenu && <ChevronDown className="h-3.5 w-3.5" />}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link to="/account" className="hidden text-sm font-medium text-gray-300 transition-colors hover:text-white sm:inline-flex">
              Log in
            </Link>
            <Link
              to="/#scan"
              className="inline-flex items-center gap-2 rounded-lg border border-red-500 px-5 py-3 text-sm font-bold text-red-300 transition-colors hover:bg-red-600 hover:text-white"
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
