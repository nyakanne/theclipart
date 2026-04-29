import {
  Building2,
  FileText,
  Fingerprint,
  Shield,
  Target,
  User,
  Users,
} from 'lucide-react'
import { clsx } from 'clsx'

const CATEGORIES = [
  { id: 'people', label: 'People Search', count: 23, x: 19, y: 28, icon: User },
  { id: 'brokers', label: 'Broker Sites', count: 47, x: 76, y: 24, icon: Building2 },
  { id: 'records', label: 'Public Records', count: 12, x: 82, y: 46, icon: FileText },
  { id: 'ads', label: 'Ad Networks', count: 89, x: 78, y: 70, icon: Target },
  { id: 'breach', label: 'Breach Data', count: 6, x: 52, y: 82, icon: Shield },
  { id: 'social', label: 'Social Profiles', count: 19, x: 26, y: 72, icon: Users },
] as const

const EDGES = [
  ['people', 'brokers'],
  ['people', 'records'],
  ['people', 'social'],
  ['brokers', 'records'],
  ['brokers', 'ads'],
  ['records', 'ads'],
  ['records', 'breach'],
  ['ads', 'breach'],
  ['social', 'breach'],
  ['social', 'people'],
] as const

const categoryById = Object.fromEntries(CATEGORIES.map(category => [category.id, category]))

export function ExposureGraph({
  focused = false,
  totalSources = 132,
  className,
}: {
  focused?: boolean
  totalSources?: number
  className?: string
}) {
  return (
    <div className={clsx('exposure-graph relative min-h-[520px] overflow-hidden', focused && 'is-focused', className)}>
      <div className="pixel-storm" />
      <div className="identity-dissolve" aria-hidden="true" />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="35%" stopColor="#ff3030" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ff3030" stopOpacity="0" />
          </radialGradient>
        </defs>
        {EDGES.map(([fromId, toId]) => {
          const from = categoryById[fromId]
          const to = categoryById[toId]
          return (
            <line
              key={`${fromId}-${toId}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className="graph-edge"
            />
          )
        })}
        {Array.from({ length: 34 }).map((_, index) => {
          const x = 15 + ((index * 17) % 72)
          const y = 18 + ((index * 29) % 66)
          return <circle key={index} cx={x} cy={y} r={index % 5 === 0 ? 0.85 : 0.45} className="graph-dot" />
        })}
      </svg>

      <div className="absolute left-[48%] top-[45%] z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <div className="radar-rings">
          <div className="radar-core">
            <Fingerprint className="h-9 w-9 text-white" />
            <span className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
              Your Digital Footprint
            </span>
            <span className="mt-1 font-mono text-[10px] text-red-200">{totalSources}+ sources</span>
          </div>
        </div>
      </div>

      {CATEGORIES.map((category, index) => {
        const Icon = category.icon
        return (
          <div
            key={category.id}
            className="graph-card"
            style={{
              left: `${category.x}%`,
              top: `${category.y}%`,
              animationDelay: `${index * 120}ms`,
            }}
          >
            <span className="graph-icon">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-white">{category.label}</span>
              <span className="text-xs text-gray-400">{category.count} Sources Found</span>
            </span>
          </div>
        )
      })}

      <div className="absolute bottom-5 left-1/2 z-20 grid w-[min(88%,760px)] -translate-x-1/2 grid-cols-2 border border-white/10 bg-black/55 backdrop-blur-xl sm:grid-cols-4">
        {[
          ['Privacy Score', focused ? '27/100' : '72/100'],
          ['Sources Found', `${totalSources}`],
          ['Removal Queue', focused ? '20 brokers' : 'Ready'],
          ['Report Pack', 'IC3 + State'],
        ].map(([label, value]) => (
          <div key={label} className="border-white/10 px-4 py-3 even:border-l sm:border-l sm:first:border-l-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">{label}</div>
            <div className="mt-1 font-mono text-lg font-bold text-white">{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
