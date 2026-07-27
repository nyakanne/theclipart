import { useMemo } from 'react'
import { clsx } from 'clsx'

/**
 * The obsidian second-brain motif, as an ambient background layer.
 *
 * Vindica's design brief calls for the connection-map look to repeat across
 * every surface rather than living in one hero section. This renders that
 * motif at a configurable density so it can sit behind panels, empty states,
 * and section backgrounds without competing with the content in front of it.
 *
 * Node placement is derived from a seeded generator so a given `seed` always
 * produces the same graph — stable across re-renders and across a static
 * build, and tunable per placement so two fields on one page don't look
 * identical.
 */

// Small deterministic PRNG (mulberry32) — no dependency, stable output.
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface NeuralFieldProps {
  /** Number of nodes. Keep low for small surfaces. */
  density?: number
  /** Overall opacity of the field. */
  intensity?: number
  /** Changes the generated graph. Same seed = same graph. */
  seed?: number
  className?: string
}

export function NeuralField({
  density = 18,
  intensity = 0.5,
  seed = 7,
  className,
}: NeuralFieldProps) {
  const { nodes, edges } = useMemo(() => {
    const rand = seeded(seed)
    const nodes = Array.from({ length: density }, (_, i) => ({
      id: i,
      x: 4 + rand() * 92,
      y: 6 + rand() * 88,
      r: rand() > 0.82 ? 0.9 : 0.42,
      key: rand() > 0.82,
      delay: rand() * 4.8,
    }))

    // Connect each node to its nearest couple of neighbours — produces the
    // clustered, organic web of a knowledge graph rather than a uniform mesh.
    const edges: { a: typeof nodes[number]; b: typeof nodes[number]; pulse: boolean; delay: number; dur: number }[] = []
    nodes.forEach((node, i) => {
      const neighbours = nodes
        .filter((_, j) => j !== i)
        .map(other => ({ other, d: Math.hypot(other.x - node.x, other.y - node.y) }))
        .sort((l, r) => l.d - r.d)
        .slice(0, 2)
      neighbours.forEach(({ other }) => {
        if (other.id > node.id) {
          edges.push({
            a: node,
            b: other,
            pulse: rand() > 0.72,
            delay: rand() * 6,
            dur: 3 + rand() * 3,
          })
        }
      })
    })

    return { nodes, edges }
  }, [density, seed])

  return (
    <div className={clsx('neural-field', className)} style={{ opacity: intensity }} aria-hidden>
      <svg
        className="h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        focusable="false"
      >
        <g className="neural-field__layer">
          {edges.map((edge, i) => (
            <line
              key={`e-${i}`}
              className="neural-field__edge"
              x1={edge.a.x}
              y1={edge.a.y}
              x2={edge.b.x}
              y2={edge.b.y}
            />
          ))}

          {/* Light travelling along a subset of the connections. */}
          {edges.filter(edge => edge.pulse).map((edge, i) => {
            const length = Math.hypot(edge.b.x - edge.a.x, edge.b.y - edge.a.y)
            return (
              <line
                key={`p-${i}`}
                className="neural-field__pulse"
                x1={edge.a.x}
                y1={edge.a.y}
                x2={edge.b.x}
                y2={edge.b.y}
                strokeDasharray={`${Math.max(1.5, length * 0.16)} ${length}`}
                style={{
                  animation: `neuralPulse ${edge.dur}s linear ${edge.delay}s infinite`,
                }}
              />
            )
          })}

          <g className="neural-field__nodes">
            {nodes.map(node => (
              <circle
                key={node.id}
                className={clsx('neural-field__node', node.key && 'neural-field__node--key')}
                cx={node.x}
                cy={node.y}
                r={node.r}
                style={{ animationDelay: `${node.delay}s` }}
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  )
}
