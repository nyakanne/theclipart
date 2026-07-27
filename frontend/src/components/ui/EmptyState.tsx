import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { NeuralField } from '@/components/visuals/NeuralField'

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
  /** Seeds the ambient graph so stacked empty states don't look identical. */
  seed?: number
  className?: string
}

// Mirrors Button's base + secondary + sm classes so a router <Link> can look
// identical to a <Button> without Button needing to support polymorphic `as`.
const secondaryLinkClass =
  'inline-flex items-center justify-center gap-2 border font-bold uppercase tracking-[0.08em] ' +
  'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ' +
  'bg-ink-900 hover:bg-ink-800 text-gray-100 border-white/10 px-3 py-1.5 text-sm'

/**
 * An empty state reads as a dormant region of the graph — the connection map
 * is already there and breathing, it just has nothing to surface yet. That's
 * the intent: the surface never looks inert, it looks like it's waiting.
 */
export function EmptyState({ icon, title, description, action, seed = 3, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx('relative isolate flex flex-col items-center gap-3 overflow-hidden py-12 text-center', className)}
    >
      <NeuralField density={16} intensity={0.34} seed={seed} />

      <div className="relative flex h-14 w-14 items-center justify-center">
        {/* Concentric sonar rings — the same radar language as the scan graph. */}
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border border-gold-500/35"
          animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
          transition={{ duration: 2.4, ease: 'easeOut', repeat: Infinity }}
        />
        <motion.span
          aria-hidden
          className="absolute inset-1 rounded-full border border-red-400/30"
          animate={{ scale: [1, 1.32], opacity: [0.45, 0] }}
          transition={{ duration: 2.4, ease: 'easeOut', repeat: Infinity, delay: 0.5 }}
        />
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gold-500/30 bg-black/60 text-gold-400 shadow-[0_0_24px_rgb(var(--vindica-gold)/0.18)] backdrop-blur-sm">
          {icon}
        </span>
      </div>

      <div className="relative">
        <p className="font-black tracking-tight text-ivory">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-gray-400">{description}</p>
      </div>

      {action && (
        <div className="relative">
          {action.to ? (
            <Link to={action.to} className={secondaryLinkClass}>
              {action.label}
            </Link>
          ) : (
            <Button variant="secondary" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  )
}
