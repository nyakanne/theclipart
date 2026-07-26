import { Loader } from 'lucide-react'
import { clsx } from 'clsx'

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-9 w-9',
}

export function LoadingState({ message = 'Loading…', size = 'md', className }: LoadingStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-2 py-8 text-center', className)}>
      <Loader className={clsx(iconSizes[size], 'animate-spin text-gold-400')} />
      {message && <p className="text-sm text-gray-400">{message}</p>}
    </div>
  )
}
