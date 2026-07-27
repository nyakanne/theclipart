import { clsx } from 'clsx'
import { useGlassPointer } from '@/hooks/useGlassPointer'

interface ShardPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lean the panel toward the cursor on hover. Off for large/page-level surfaces. */
  tilt?: boolean
  /** Render the fracture facets. Off for very small surfaces where they'd read as noise. */
  facets?: boolean
  children: React.ReactNode
}

/**
 * The fragmented mirror-glass surface used across Vindica.
 *
 * Obsidian body, independently-angled reflective facets with bright seams,
 * and a specular highlight that follows the cursor. All of the visual weight
 * lives in CSS (`.obsidian-shard` in index.css); this component wires the
 * pointer tracking and stacks the facet layers.
 */
export function ShardPanel({
  tilt = true,
  facets = true,
  className,
  children,
  ...props
}: ShardPanelProps) {
  const { ref, glassProps } = useGlassPointer<HTMLDivElement>()

  return (
    <div
      ref={ref}
      {...glassProps}
      {...props}
      className={clsx('obsidian-shard', tilt && 'obsidian-shard--tilt', className)}
    >
      {facets && (
        <>
          <span aria-hidden className="shard-facet shard-facet--a" />
          <span aria-hidden className="shard-facet shard-facet--b" />
          <span aria-hidden className="shard-facet shard-facet--c" />
          <span aria-hidden className="shard-facet shard-facet--d" />
          <span aria-hidden className="shard-seam" />
        </>
      )}
      <div className="relative z-[5]">{children}</div>
    </div>
  )
}
