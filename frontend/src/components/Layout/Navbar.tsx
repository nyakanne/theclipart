import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheck, LayoutDashboard, Search, FileText, LogOut, LogIn } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/services/api'

const navItems = [
  { label: 'Scan',      href: '/',          icon: Search },
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Reports',   href: '/reports',   icon: FileText },
]

export function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-brand-400" />
            <span className="text-lg font-bold tracking-tight text-white">DataGuard</span>
          </Link>

          <div className="flex items-center gap-1">
            {isAuthenticated() && navItems.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                to={href}
                className={clsx(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-brand-900/50 text-brand-300'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated() && user ? (
              <>
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="h-8 w-8 rounded-full border border-gray-700"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className="hidden sm:block text-sm text-gray-300 max-w-[140px] truncate">
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:block">Sign out</span>
                </button>
              </>
            ) : (
              <a
                href={api.auth.loginUrl()}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </a>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
