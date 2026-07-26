import { clsx } from 'clsx'

interface CardProps {
  className?: string
  children: React.ReactNode
  /** 'premium' (default) matches the gold-bordered look used across most of
   *  the app (the `.premium-panel` treatment in index.css). 'flat' is for
   *  quieter nested surfaces, e.g. list rows inside a premium-panel container. */
  variant?: 'premium' | 'flat'
  glow?: 'red' | 'gold' | 'none'
}

const glowStyles = {
  red:  'shadow-[0_0_30px_rgb(var(--vindica-red-glow)/0.15)]',
  gold: 'shadow-[0_0_30px_rgb(var(--vindica-gold)/0.15)]',
  none: '',
}

const variantStyles = {
  premium: 'premium-panel',
  flat: 'border border-white/10 bg-ink-700/90 backdrop-blur-sm',
}

export function Card({ className, children, variant = 'premium', glow = 'none' }: CardProps) {
  return (
    <div className={clsx(variantStyles[variant], glowStyles[glow], className)}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx('px-6 py-4 border-b border-white/10', className)}>
      {children}
    </div>
  )
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx('px-6 py-4', className)}>
      {children}
    </div>
  )
}
