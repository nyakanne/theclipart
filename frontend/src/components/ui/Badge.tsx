import { clsx } from 'clsx'
import type { SeverityLevel } from '@/types'

const severityStyles: Record<SeverityLevel, string> = {
  critical: 'bg-red-900/60 text-red-300 border-red-700/50',
  high:     'bg-red-950/60 text-red-400 border-red-900/50',
  medium:   'bg-red-950/40 text-red-400/80 border-red-900/30',
  low:      'bg-gray-800/60 text-gray-400 border-gray-700/50',
  info:     'bg-gray-800/60 text-gray-400 border-gray-600/50',
}

interface BadgeProps {
  severity?: SeverityLevel
  label: string
  className?: string
}

export function SeverityBadge({ severity = 'info', label, className }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      severityStyles[severity],
      className
    )}>
      {label}
    </span>
  )
}

interface StatusDotProps {
  active?: boolean
  label: string
}

export function StatusDot({ active, label }: StatusDotProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={clsx(
        'h-2 w-2 rounded-full',
        active ? 'bg-red-500 animate-pulse' : 'bg-gray-600'
      )} />
      <span className={active ? 'text-red-400' : 'text-gray-500'}>{label}</span>
    </span>
  )
}
