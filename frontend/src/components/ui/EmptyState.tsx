import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

// Mirrors Button's base + secondary + sm classes so a router <Link> can look
// identical to a <Button> without Button needing to support polymorphic `as`.
const secondaryLinkClass =
  'inline-flex items-center justify-center gap-2 border font-bold uppercase tracking-[0.08em] ' +
  'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ' +
  'bg-ink-900 hover:bg-ink-800 text-gray-100 border-white/10 px-3 py-1.5 text-sm'

interface EmptyStateAction {
  label: string
  to?: string
  onClick?: () => void
}

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: EmptyStateAction
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('flex flex-col items-center gap-3 py-10 text-center', className)}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold-500/25 bg-ink-800 text-gold-400">
        {icon}
      </div>
      <div>
        <p className="font-black text-ivory">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-gray-400">{description}</p>
      </div>
      {action && (
        action.to ? (
          <Link to={action.to} className={secondaryLinkClass}>
            {action.label}
          </Link>
        ) : (
          <Button variant="secondary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </motion.div>
  )
}
