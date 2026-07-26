# Codex Design System Handoff — Vindica

Updated: 2026-07-26

## Copy/Paste Prompt For Codex

Use this prompt to start the next session:

```text
You are taking over the Vindica repo's design-system upgrade. Please read
this handoff first:

docs/CODEX_DESIGN_SYSTEM_HANDOFF_2026-07-26.md

Then read these supporting docs:

- docs/UI_AUDIT_2026-06-07.md (the original open-items list this pass drew from)
- docs/CLAUDE_CONTINUATION_HANDOFF_2026-07-25.md
- docs/VINDICA_SERVERLESS_MIGRATION_PLAN.md

This pass formalized Vindica's black/red/gold identity into real Tailwind
tokens (frontend/tailwind.config.js + frontend/src/index.css), self-hosted
Inter/JetBrains Mono, unified the Card component and added
EmptyState/ErrorState/LoadingState primitives, and swept the worst
theme-consistency offenders (Dashboard.tsx, ScanPage.tsx's error state,
leftover blue "brand" tokens, most raw gold/red hex literals).

What's left is a specific, bounded list of raw-literal gradient/shadow
strings inside Tailwind arbitrary-value brackets (`bg-[linear-gradient(...)]`
etc.) in 7 files -- see "What's left to sweep" below for exact files and
occurrence counts. These are cosmetic-consistency cleanup, not bugs: the
app is fully on-theme and functional today.

Before editing, inspect git status and current branch. After editing, run
`cd frontend && npm run build` and the verification procedure below, then
commit and push.
```

## What Changed In This Pass

- **Token layer**: `frontend/src/index.css`'s `:root` custom properties were
  restructured from single hex values to RGB triplets
  (`--vindica-red-glow: 239 68 68`, `--vindica-red: 186 24 27`,
  `--vindica-red-deep: 94 11 17`, `--vindica-gold: 212 175 55`,
  `--vindica-gold-soft: 245 215 161`, `--vindica-ivory: 255 247 232`, plus a
  new `--vindica-ink-950` through `--vindica-ink-600` surface scale).
  `frontend/tailwind.config.js` now overrides Tailwind's `red` shades
  (400-900) and adds `gold`, `ink`, `ivory` colors that all read from those
  CSS vars. The unused/wrong `brand` (blue), `danger`, and `safe` color
  tokens were deleted.
- **Self-hosted fonts**: `@fontsource/inter` and `@fontsource/jetbrains-mono`
  are now dependencies. `frontend/src/fonts.css` imports the same weights
  the old Google Fonts URL requested; it's imported from the top of
  `index.css`. The Google Fonts `<link>`/`preconnect` tags were removed
  from `frontend/index.html`. Verified: with `fonts.googleapis.com`
  unreachable, the app still serves and renders Inter/JetBrains Mono from
  `dist/assets/*.woff2` (see Verification below).
- **`Card` unified**: `frontend/src/components/ui/Card.tsx` now has a
  `variant?: 'premium' | 'flat'` prop (default `'premium'`, which toggles
  the existing `.premium-panel` CSS class instead of duplicating it), and
  `glow` is narrowed to `'red' | 'gold' | 'none'` (the unused `blue`/`green`
  options are gone; the one live `blue` caller, `ScanProgress.tsx`, now
  passes `glow="red"`).
- **`Button` extended**: added a `gold` variant
  (`bg-gold-500 hover:bg-gold-600 text-ink-950`) for confirm/positive
  actions, since previously every button was red regardless of meaning.
  `secondary` recolored to the new `ink` scale.
- **`ProgressRing` fixed**: default `color` changed from an orphaned blue
  hex (`#4d7bff`) to `currentColor`; its one real caller
  (`CompliancePanel.tsx`) already passed an explicit severity color, so
  this was a dead-default fix, not a behavior change.
- **Three new shared primitives** in `frontend/src/components/ui/`:
  `EmptyState.tsx`, `ErrorState.tsx`, `LoadingState.tsx` — themed,
  motion-animated replacements for the ad hoc empty/error/loading markup
  that was scattered and under-styled across pages.
- **Sitewide focus-visible**: added a `:focus-visible` base rule in
  `index.css` (gold outline) so keyboard focus is visible on every
  interactive element by default, not just inside the shared `Button`.
- **Blue "brand" token sweep**: fixed the 5 files that referenced the now
  deleted `brand-*` classes — `BrokerList.tsx`, `CompliancePanel.tsx`,
  `ScanProgress.tsx`, `RegulatorPack.tsx`, `Dashboard.tsx`. Distinguished
  "done"/"authority" states as gold vs. "active"/"failed" as red, instead
  of everything being one color.
- **`Dashboard.tsx` sweep**: added framer-motion entrances (previously had
  none), moved its two ad hoc empty blocks and one loading spinner over to
  `EmptyState`/`LoadingState`, and (via `Card`'s new `variant="premium"`
  default) its three lower cards now match the rest of the app's visual
  language instead of using a separate flat-gray style.
- **`ScanPage.tsx` error state**: the flat, action-less "Scan failed" block
  is now `<ErrorState onRetry={refresh} />`, reusing the page's existing
  `refresh()` query-invalidation callback.
- **Raw gold/red literal sweep (mechanical/safe subset)**: every simple
  Tailwind arbitrary-value class of the form `text-[#d4af37]`,
  `border-[#f5d7a1]`, `bg-[#fff7e8]`, etc. was replaced with the
  corresponding token class (`text-gold-500`, `border-gold-400`,
  `bg-ivory`) across all files that had them. Also reconciled the
  `#050505`/`#050506`/`#050507` near-duplicate ink values (Home.tsx,
  Footer.tsx, Navbar.tsx, MobileTabBar.tsx, LegalPage.tsx) to one
  `bg-ink-900`.
- **`index.css` internal literal pass**: went further than originally
  planned as optional/deferrable — all ~64 `rgba(239,68,68,...)` /
  `rgba(212,175,55,...)` / `rgba(186,24,27,...)` / `rgba(94,11,17,...)` /
  `rgba(255,247,232,...)` literals inside the ~30 bespoke effect classes
  (`.premium-panel`, `.hero-stage`, `.signal-*`, etc.) were converted to
  `rgb(var(--vindica-*) / alpha)`. This was safe here specifically because
  `index.css` is plain CSS (not Tailwind's JIT arbitrary-value bracket
  parser), so spaces in `rgb(var(--x) / 0.14)` are valid — this is *not*
  safe to blindly repeat inside `.tsx` files' `bg-[...]` bracket classes
  (see below).

## The Token System — Use This, Not Raw Literals

Never write a raw hex or `rgba()` for red/gold/ink in a component. Use:

| Need | Class / value |
|---|---|
| Bright red accent, glow, primary CTA | `text-red-400`/`500`/`600`, `bg-red-600`, etc. (== `#ef4444`, unchanged from Tailwind default) |
| Structural/border red (deeper) | `border-red-700`/`800` (== `#ba181b`) |
| Deep red fill | `bg-red-900` (== `#5e0b11`) |
| Gold (authority, confirm, positive) | `text-gold-400` (== `#f5d7a1`), `text-gold-500`/`bg-gold-500` (== `#d4af37`), `gold-600` for hover/darker |
| Ink surfaces | `bg-ink-950` (page bg) → `ink-900` (PWA chrome) → `ink-800` (elevated panel) → `ink-700` (card) → `ink-600` (hover/active) |
| Off-white text | `text-ivory` (== `#fff7e8`) |
| In hand-written CSS (index.css) | `rgb(var(--vindica-gold) / 0.2)` etc. — see the `:root` block for all variable names |

If you need a color not on this list, check whether it should collapse
into an existing token first (most "new" colors turn out to be a slightly
different alpha of gold or red) before adding a new one.

## New Component Usage

**`Card`** (`frontend/src/components/ui/Card.tsx`)
```tsx
<Card variant="premium" glow="red">...</Card>   // default look, most of the app
<Card variant="flat">...</Card>                  // quieter nested surface, e.g. a list row inside a premium panel
```

**`EmptyState`** / **`ErrorState`** / **`LoadingState`**
(`frontend/src/components/ui/{EmptyState,ErrorState,LoadingState}.tsx`)
```tsx
<EmptyState
  icon={<Vault className="h-6 w-6" />}
  title="No scans stored yet."
  description="Every scan you run gets a place here."
  action={{ label: 'Start your first scan', to: '/' }}  // or onClick
/>

<ErrorState
  title="Scan failed"
  description="Please try again or contact support."
  onRetry={refresh}
/>

<LoadingState message="Loading scan history…" />
```
Canonical before/after example: `frontend/src/pages/ScanPage.tsx`'s
`statusData?.status === 'failed'` block — was a static, action-less
`<div>`, is now the `ErrorState` call above.

## What's Left To Sweep

A bounded, specific list — these are cosmetic-consistency items, not bugs.
The app renders correctly and on-theme today; these are raw literals
embedded inside multi-stop Tailwind arbitrary-value gradient/shadow
strings (e.g. `bg-[radial-gradient(circle,rgba(212,175,55,0.1),transparent)]`)
that a blind find-and-replace risks breaking, because Tailwind's JIT
bracket parser requires underscores in place of spaces — unlike plain CSS,
where `rgb(var(--x) / 0.14)` with real spaces is valid. Converting these
needs a careful per-string rewrite (or, per the original plan, extracting
a handful of new `@layer components` classes into `index.css` so the
gradient definition lives in one place instead of inline), not a sed pass.

Exact remaining occurrences (`rgba(212,175,55,...)`, `rgba(186,24,27,...)`,
`rgba(94,11,17,...)`, or standalone `#d4af37`/`#ba181b` hex, all inside
`.tsx` arbitrary-value brackets):

- `components/auth/AuthVaultPrompt.tsx` — 8 occurrences (lines ~35-36, 44-45, 80-81)
- `components/Layout/Navbar.tsx` — 6 occurrences (lines ~30, 34, 84)
- `pages/Home.tsx` — 6 occurrences (lines ~931, 975, 1164), plus 4 one-off
  gradient-stop hex values not on the token list at all (`#f1c96b`,
  `#f4d889`, `#8f6f1f`, `#7a1117` — decide whether these deserve dedicated
  gradient tokens or should collapse into existing gold/red shades)
- `pages/Account.tsx` — 4 occurrences (lines ~125, 131, 240), plus 3
  one-off hex values (`#f7f7f5`, `#fff2cf` x2) worth checking against the
  `ivory`/`gold-soft` tokens
- `components/auth/VaultActivationTransition.tsx` — 2 occurrences (line ~84)
- `components/Layout/MobileTabBar.tsx` — 1 occurrence (line ~31)
- `pages/LegalPage.tsx` — 1 occurrence (line ~150)

Also carried over, not touched in this pass:
- `frontend/src/pages/Phase1Status.jsx` is completely off-theme (inline
  `style={}`, different font stack, green/blue/orange palette, zero
  red/gold or motion) but is dev-gated behind `import.meta.env.DEV`
  (`App.tsx`, `Navbar.tsx`) and never ships to production. Standing risk
  only: if that gate ever slips, this is the worst-looking screen in the
  app. Not worth re-theming a screen users never see.
- No skip-to-content link exists (flagged as open in
  `docs/UI_AUDIT_2026-06-07.md` already; out of scope for this pass).
- Icon-only buttons without `aria-label` beyond what the sitewide
  `:focus-visible` rule and existing `Navbar`/`MobileTabBar` labels cover —
  worth a fresh `grep -rn "aria-label" src` pass to see how much the count
  grew and where gaps remain.

## Known Constraints / Do Not Break

- No SSR, no server components, nothing requiring a Node runtime at
  request time — the frontend must survive a pure static
  `vite build` → `frontend/dist` deploy (Vercel/Netlify/Cloudflare Pages),
  matching `docs/VINDICA_SERVERLESS_MIGRATION_PLAN.md`'s target
  architecture.
- Fonts must stay self-hosted (`@fontsource/*`, bundled by Vite) — do not
  reintroduce a Google Fonts (or any external font CDN) `<link>`.
- Theme stays black/red/gold (`ink`/`red`/`gold`/`ivory` tokens) only — do
  not reintroduce blue/green accent colors.
- Docker/VPS deployment path (`docker-compose.yml`, `backend/Dockerfile`,
  worker services, runbooks) is untouched by this pass and must stay that
  way until the serverless migration is further along.

## How To Verify

```bash
cd frontend
npm install            # picks up @fontsource/inter, @fontsource/jetbrains-mono
npm run build           # tsc + vite build; must succeed with no errors
npm run preview          # serves dist/ on :3000, matching a static-host deploy
```

Then, with a backend reachable (see `DEPLOYMENT.md` / the serverless
readiness docs for how to point `VITE_API_PROXY_TARGET` at one), drive a
headless browser to `/`, `/dashboard`, `/account`, `/privacy`, `/terms`,
and any real `/scan/:id`: screenshot each, and check for:

- Zero browser console errors.
- Zero failed network requests (specifically: no request to
  `fonts.googleapis.com` should even be attempted — the app must not
  regress back to loading fonts externally).
- Font-family computed style resolves to `Inter`/`JetBrains Mono`, not a
  system-font fallback.

This exact procedure (Playwright via `python -m playwright`, Chromium at
`/opt/pw-browsers/chromium-*/chrome-linux/chrome` in this environment) was
used to verify this pass: all four routes tested clean with zero console
errors, zero failed requests, and fonts served from same-origin
`dist/assets/*.woff2`.
