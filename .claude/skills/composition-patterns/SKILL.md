---
name: composition-patterns
description: Apply React composition patterns to avoid boolean prop proliferation. Use when refactoring components, building component libraries, or designing flexible component APIs.
metadata:
  author: vercel
  version: "1.0.0"
---

# React Composition Patterns

Strategies for scalable component APIs that avoid boolean prop accumulation.

## Rules by Priority

### Architecture (Highest Impact)

**Use composition over boolean props.**

```tsx
// Bad — accumulating boolean flags
<Button primary disabled loading icon="save" />

// Good — explicit variant components
<PrimaryButton>
  <SaveIcon />
  Save
</PrimaryButton>
```

**Structure complex components with shared context.**

Use a context provider at the root so child components can access shared state without prop drilling.

```tsx
const DialogContext = createContext<DialogState | null>(null)

function Dialog({ children, open, onClose }) {
  return (
    <DialogContext.Provider value={{ open, onClose }}>
      {children}
    </DialogContext.Provider>
  )
}

function DialogClose() {
  const { onClose } = useContext(DialogContext)!
  return <button onClick={onClose}>Close</button>
}
```

### State Management

- Decouple implementation details within providers — expose a stable interface, not internal state shape
- Define generic interfaces for dependency injection so components aren't tied to a specific data source
- Elevate shared state to a provider when siblings need to communicate

### Implementation Patterns

- **Explicit variant components** over boolean modes: `<PrimaryButton>` not `<Button primary>`
- **Children-based composition** over render props when the parent doesn't need to control rendering timing
- **Compound components** (Dialog + Dialog.Close, Select + Select.Option) for related UI that shares implicit state

### React 19 APIs

- Use `use(Context)` for reading context in async components
- Use `useOptimistic` for optimistic UI updates
- Use `useFormStatus` / `useActionState` for form state tied to Server Actions
