interface Props {
  score: number
  size?: number
}

export function PrivacyScore({ score, size = 80 }: Props) {
  const r = size * 0.4
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const cx = size / 2
  const cy = size / 2

  const color = score < 40 ? '#ef4444' : score < 70 ? '#f59e0b' : '#22c55e'
  const label = score < 40 ? 'High Risk' : score < 70 ? 'Medium Risk' : 'Low Risk'

  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1f2937" strokeWidth={6} />
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
      </div>
      <div>
        <div className="text-3xl font-bold text-white" style={{ color }}>{score}</div>
        <div className="text-xs font-semibold" style={{ color }}>{label}</div>
      </div>
    </div>
  )
}
