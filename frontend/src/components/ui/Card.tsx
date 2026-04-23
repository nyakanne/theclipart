import { clsx } from 'clsx'

interface CardProps {
  className?: string
  children: React.ReactNode
  glow?: 'red' | 'green' | 'blue' | 'none'
}

const glowStyles = {
  red:   'shadow-[0_0_30px_rgba(220,38,38,0.15)]',
  green: 'shadow-[0_0_30px_rgba(34,197,94,0.15)]',
  blue:  'shadow-[0_0_30px_rgba(59,130,246,0.15)]',
  none:  '',
}

export function Card({ className, children, glow = 'none' }: CardProps) {
  return (
    <div className={clsx(
      'rounded-xl border border-gray-800 bg-gray-900/60 backdrop-blur-sm',
      glowStyles[glow],
      className
    )}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx('px-6 py-4 border-b border-gray-800', className)}>
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
