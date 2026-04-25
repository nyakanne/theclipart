---
name: react-view-transitions
description: Implement smooth animations using React's View Transition API. Use when adding page transitions, route animations, list reordering animations, or shared element transitions.
metadata:
  author: vercel
  version: "1.0.0"
---

# React View Transitions

Native-feeling animations using the browser's View Transition API and React's `<ViewTransition>` component — no third-party animation libraries needed.

## Core Rule

**Every `<ViewTransition>` must communicate a spatial relationship or continuity.** If you can't articulate what the animation communicates, don't add it.

## Trigger Requirement

Only these patterns activate view transitions — regular `setState` does not:

```tsx
// These trigger view transitions:
startTransition(() => setState(...))
useDeferredValue(value)
<Suspense>
```

## Implementation Priority Order

1. **Shared element transitions** — morph an element from one route to another using `viewTransitionName`
2. **Suspense reveals** — animate content as it loads
3. **List identity** — animate list reordering with stable keys
4. **State changes** — enter/exit animations for conditional rendering
5. **Route changes** — page-level transitions (lowest priority, highest visual noise)

## Placement

`<ViewTransition>` must wrap the element **before** any DOM nodes to enable enter/exit animations:

```tsx
// Bad — transition after DOM node
<div>
  <ViewTransition>content</ViewTransition>
</div>

// Good — transition wraps the element
<ViewTransition>
  <div>content</div>
</ViewTransition>
```

## Avoid Cross-Fading Everything

Use `default="none"` to prevent unwanted cross-fades on every transition:

```tsx
<ViewTransition default="none" share="slide">
  <Card />
</ViewTransition>
```

## Navigation Patterns

```tsx
// Hierarchical navigation (list → detail): use directional slides
<ViewTransition enter="nav-forward" exit="nav-back">

// Lateral navigation (tabs): use simple fades
<ViewTransition enter="fade-in" exit="fade-out">
```

Directional slides on lateral navigation falsely imply spatial depth — use fades for tabs.

## Browser Support

Chromium 111+, Firefox 144+, Safari 18.2+. Degrades gracefully (transitions simply don't play on unsupported browsers).

For Next.js App Router: React canary is already included — no separate installation needed.
