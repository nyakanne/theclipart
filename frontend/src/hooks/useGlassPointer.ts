import { useCallback, useEffect, useRef } from 'react'

/**
 * Tracks the pointer across an element and writes its position to CSS custom
 * properties, so the obsidian-glass surfaces can render a specular highlight
 * and a parallax tilt that follow the cursor.
 *
 * Written as CSS vars (rather than React state) deliberately: the highlight
 * updates on every pointer move, and re-rendering the subtree at that rate
 * would be wasteful. The element only ever has its style properties mutated.
 *
 * Sets on the element:
 *   --gx, --gy  pointer position within the element, 0-100 (%)
 *   --gtx, --gty  tilt offset, -1..1, for rotateX/rotateY
 *   --gactive   1 while the pointer is over the element, 0 otherwise
 */
export function useGlassPointer<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null)
  const frame = useRef<number | null>(null)
  const pending = useRef<{ x: number; y: number } | null>(null)

  const flush = useCallback(() => {
    frame.current = null
    const el = ref.current
    const next = pending.current
    if (!el || !next) return
    el.style.setProperty('--gx', `${next.x.toFixed(2)}%`)
    el.style.setProperty('--gy', `${next.y.toFixed(2)}%`)
    // Tilt is inverted so the panel leans *toward* the cursor.
    el.style.setProperty('--gtx', ((next.y - 50) / 50).toFixed(3))
    el.style.setProperty('--gty', ((50 - next.x) / 50).toFixed(3))
  }, [])

  const handlePointerMove = useCallback((event: React.PointerEvent<T>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    pending.current = {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    }
    if (frame.current === null) {
      frame.current = window.requestAnimationFrame(flush)
    }
  }, [flush])

  const handlePointerEnter = useCallback(() => {
    ref.current?.style.setProperty('--gactive', '1')
  }, [])

  const handlePointerLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--gactive', '0')
    el.style.setProperty('--gtx', '0')
    el.style.setProperty('--gty', '0')
  }, [])

  useEffect(() => () => {
    if (frame.current !== null) window.cancelAnimationFrame(frame.current)
  }, [])

  return {
    ref,
    glassProps: {
      onPointerMove: handlePointerMove,
      onPointerEnter: handlePointerEnter,
      onPointerLeave: handlePointerLeave,
    },
  }
}
