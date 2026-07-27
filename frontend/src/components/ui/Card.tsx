import { clsx } from 'clsx'
import { ShardPanel } from '@/components/ui/ShardPanel'
import { NeuralField } from '@/components/visuals/NeuralField'

interface CardProps {
  className?: string
  children: React.ReactNode
  /** 'shard' (default) is the fragmented mirror-glass surface — obsidian body,
   *  angled facets, cursor-tracked specular. 'premium' is the older flat gold
   *  panel, kept for surfaces that sit inside another shard. 'flat' is for
   *  quiet nested rows, e.g. list items inside a shard container. */
  variant?: 'shard' | 'premium' | 'flat'
  glow?: 'red' | 'gold' | 'none'
  /** Ambient second-brain graph behind the content. */
  field?: boolean
  /** Seeds the neural field so sibling cards don't render identical graphs. */
  fieldSeed?: number
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

export function Card({
  className,
  children,
  variant = 'shard',
  glow = 'none',
  field = false,
  fieldSeed = 7,
}: CardProps) {
  if (variant === 'shard') {
    return (
      <ShardPanel className={clsx(glowStyles[glow], className)}>
        {field && <NeuralField density={14} intensity={0.28} seed={fieldSeed} />}
        <div className="relative">{children}</div>
      </ShardPanel>
    )
  }

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
