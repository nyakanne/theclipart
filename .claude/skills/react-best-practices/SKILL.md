---
name: react-best-practices
description: Apply React and Next.js performance best practices. Use when writing new React components, implementing data fetching, reviewing code for performance issues, refactoring, or optimizing bundle size.
metadata:
  author: vercel
  version: "1.0.0"
---

# React Best Practices

70 rules across 8 categories, prioritized by impact. Reference when writing React components, implementing data fetching, reviewing performance, or optimizing bundle size.

## Categories by Priority

### CRITICAL — Eliminating Waterfalls
Fetch data in parallel wherever possible.

```tsx
// Bad — sequential waterfall
const user = await getUser(id)
const posts = await getPosts(user.id)

// Good — parallel
const [user, posts] = await Promise.all([getUser(id), getPosts(id)])
```

Use Suspense boundaries to stream content independently rather than blocking the whole page.

### CRITICAL — Bundle Size Optimization
Import only what you use. Prefer direct imports over barrel files.

```tsx
// Bad
import { Button } from '@ui/components'

// Good
import { Button } from '@ui/components/Button'
```

Use dynamic imports (`next/dynamic`, `React.lazy`) for large components not needed on initial load.

### HIGH — Server-Side Performance
- Cache expensive computations and data fetches at the appropriate scope
- Deduplicate identical requests within a render cycle
- Fetch data in parallel on the server; avoid sequential awaits

### MEDIUM-HIGH — Client-Side Data Fetching
- Deduplicate in-flight requests (React Query, SWR, or React's `use` cache)
- Clean up event listeners and subscriptions in `useEffect` return functions
- Avoid fetching in `useEffect` when server fetching is possible

### MEDIUM — Re-render Optimization
- Use `useMemo` for expensive calculations, `useCallback` for stable function references passed to memoized children
- Keep dependency arrays accurate — missing deps cause stale closures, extra deps cause unnecessary recalculations
- Lift state up only as far as needed; co-locate state with the component that owns it

### MEDIUM — Rendering Performance
- Use `content-visibility: auto` for off-screen content
- Prefer CSS transitions over JS animations for layout changes
- Avoid hydration mismatches: don't render different content on server vs client

### LOW-MEDIUM — JavaScript Performance
- Batch DOM reads before writes to avoid layout thrashing
- Cache selector results and computed values that don't change between renders
- Choose O(n) algorithms over O(n²) for list operations

### LOW — Advanced Patterns
- Use `useEffectEvent` (React 19) for event handlers that read latest state without re-subscribing
- Initialize expensive state once with the initializer form of `useState`: `useState(() => computeExpensive())`
