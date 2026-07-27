import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { NeuralField } from '@/components/visuals/NeuralField'

interface ErrorStateProps {
  title?: string
  description: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

/**
 * The failure surface. Same obsidian-glass language as everything else, but
 * the facets are lit red instead of gold and the graph behind it reads as a
 * broken link rather than a dormant one.
 */
export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        'relative isolate flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-red-500/35 px-6 py-10 text-center',
        'bg-[linear-gradient(168deg,rgb(var(--vindica-red-deep)/0.55),rgb(var(--vindica-ink-950)/0.96))]',
        'shadow-[inset_0_1px_0_rgb(var(--vindica-ivory)/0.08),0_30px_90px_rgba(0,0,0,0.5)]',
        className
      )}
    >
      <NeuralField density={14} intensity={0.3} seed={91} />

      <div className="relative flex h-14 w-14 items-center justify-center">
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border border-red-400/45"
          animate={{ scale: [1, 1.45], opacity: [0.55, 0] }}
          transition={{ duration: 1.9, ease: 'easeOut', repeat: Infinity }}
        />
        <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-red-400/50 bg-black/60 text-red-300 shadow-[0_0_26px_rgb(var(--vindica-red-glow)/0.32)] backdrop-blur-sm">
          <AlertTriangle className="h-5 w-5" />
        </span>
      </div>

      <div className="relative">
        <p className="font-black tracking-tight text-white">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-red-200/80">{description}</p>
      </div>

      {onRetry && (
        <div className="relative">
          <Button variant="danger" size="sm" className="red-button-glow" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </motion.div>
  )
}
