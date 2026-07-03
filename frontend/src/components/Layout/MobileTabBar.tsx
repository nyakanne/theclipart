import { Link, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { Gauge, Search, ShieldAlert, UserRound, Waypoints } from 'lucide-react'

const mobileTabs = [
  { label: 'Scan', href: '/scan-yourself', icon: ShieldAlert },
  { label: 'Lookup', href: '/lookup', icon: Search },
  { label: 'OSINT', href: '/osint', icon: Waypoints },
  { label: 'Vault', href: '/dashboard', icon: Gauge },
  { label: 'Me', href: '/account', icon: UserRound },
] as const

export function MobileTabBar() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Mobile primary navigation"
      className="mobile-tabbar fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#050507]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 shadow-[0_-18px_44px_rgba(0,0,0,0.48)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {mobileTabs.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href)
          return (
            <Link
              key={href}
              to={href}
              className={clsx(
                'grid min-h-[54px] place-items-center rounded-lg px-1 text-[10px] font-bold leading-none transition-colors',
                active
                  ? 'bg-[#d4af37]/10 text-[#f5d7a1] shadow-[inset_0_0_0_1px_rgba(212,175,55,0.18)]'
                  : 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-200'
              )}
            >
              <Icon className={clsx('mb-1 h-5 w-5', active ? 'text-[#f5d7a1]' : 'text-gray-500')} />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
