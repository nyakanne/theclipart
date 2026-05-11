import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  subtitle: string
  badge?: string
  action?: { label: string; onClick: () => void }
}

export function PageHeader({ icon: Icon, title, subtitle, badge, action }: Props) {
  return (
    <div className="flex items-start justify-between mb-1">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-red-950/50 border border-red-900/40 flex items-center justify-center flex-shrink-0"
          style={{ boxShadow: '0 0 12px rgba(220,38,38,0.15)' }}>
          <Icon className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-white text-base">{title}</h1>
            {badge && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-950/50 border border-red-900/40 text-red-400">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-700 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
