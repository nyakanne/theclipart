import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'

interface ErrorStateProps {
  title?: string
  description: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

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
        'flex flex-col items-center gap-3 rounded-xl border border-red-800 bg-red-900/20 px-6 py-8 text-center',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-400/45 bg-black/40 text-red-300">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div>
        <p className="font-black text-white">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-red-200/80">{description}</p>
      </div>
      {onRetry && (
        <Button variant="danger" size="sm" className="red-button-glow" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </motion.div>
  )
}
