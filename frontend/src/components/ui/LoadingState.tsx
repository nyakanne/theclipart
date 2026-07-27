import { motion } from 'framer-motion'
import { clsx } from 'clsx'

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const ringSizes = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
}

/**
 * Loading reads as the graph actively resolving: counter-rotating scan rings
 * around a live core, matching the radar language of the exposure graph rather
 * than a generic spinner.
 */
export function LoadingState({ message = 'Resolving…', size = 'md', className }: LoadingStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3 py-10 text-center', className)}>
      <div className={clsx('relative', ringSizes[size])}>
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border border-transparent border-t-gold-400 border-r-gold-500/40"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, ease: 'linear', repeat: Infinity }}
        />
        <motion.span
          aria-hidden
          className="absolute inset-[3px] rounded-full border border-transparent border-b-red-400 border-l-red-500/30"
          animate={{ rotate: -360 }}
          transition={{ duration: 2.4, ease: 'linear', repeat: Infinity }}
        />
        <motion.span
          aria-hidden
          className="absolute inset-[38%] rounded-full bg-gold-400 shadow-[0_0_14px_rgb(var(--vindica-gold)/0.8)]"
          animate={{ opacity: [0.45, 1, 0.45], scale: [0.85, 1.15, 0.85] }}
          transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity }}
        />
      </div>
      {message && (
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-gray-400">{message}</p>
      )}
    </div>
  )
}
