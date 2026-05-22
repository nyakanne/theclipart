interface Props {
  score: number
  size?: number
  showLabel?: boolean
}

export function PrivacyScore({ score, size = 100, showLabel = true }: Props) {
  const strokeW = size * 0.09
  const r = (size - strokeW) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const cx = size / 2
  const cy = size / 2

  const color = score < 35 ? '#ef4444' : score < 55 ? '#f97316' : score < 75 ? '#eab308' : '#22c55e'
  const glow  = score < 35 ? 'rgba(239,68,68,0.5)' : score < 55 ? 'rgba(249,115,22,0.5)' : score < 75 ? 'rgba(234,179,8,0.5)' : 'rgba(34,197,94,0.5)'
  const label = score < 35 ? 'Critical' : score < 55 ? 'High Risk' : score < 75 ? 'Medium' : 'Good'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Track */}
        <svg width={size} height={size} className="absolute inset-0">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a1f" strokeWidth={strokeW} />
        </svg>
        {/* Progress */}
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 8px ${glow}) drop-shadow(0 0 3px ${glow})`, transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold leading-none" style={{ fontSize: size * 0.28, color }}>{score}</span>
          <span className="text-gray-500 leading-none" style={{ fontSize: size * 0.12 }}>/100</span>
        </div>
      </div>
      {showLabel && (
        <div className="text-xs font-semibold" style={{ color }}>{label}</div>
      )}
    </div>
  )
}
