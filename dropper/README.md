# Dropper Design System

Dropper is Rookie's design system: the tokens, primitives and patterns behind every screen.

- **Live reference:** run `npm run dev` and open **http://localhost:3000/design-system**. The same page works on any deploy at `/design-system`.
- **Source of truth:** [`tokens/tokens.ts`](tokens/tokens.ts). After editing it, run `npm run tokens`.
- **Import:** `import { Button, Card, Text, Row, tokens } from '@/dropper'`.
- **Stack:** shadcn/ui (Base UI primitives) + Tailwind v4, **Open Sauce Two**, **Lucide** icons.

```
dropper/
├─ tokens/
│  ├─ tokens.ts      ← edit here (typed, single source of truth)
│  ├─ tokens.css     ← generated: CSS variables (--dp-*), light + .dark
│  └─ theme.css      ← generated: Tailwind v4 @theme → utilities (rounded-card, text-display, p-card…)
├─ scripts/build-tokens.ts   ← `npm run tokens`
├─ components/
│  ├─ button.tsx     Button (9 types, 5 sizes, 4 icon sizes, loading, icons, link)
│  ├─ text.tsx       Text, Display, Heading, Title, Meta, Caption
│  ├─ layout.tsx     Container, PageHeader, Section, Row, Stack, Inline
│  ├─ surface.tsx    Card (default/static/interactive/sunken/pass/stage), CardHead, Modal
│  ├─ controls.tsx   Chip, SegmentedControl, Input, Field, OmrOption, OmrCheck
│  ├─ data.tsx       Tag, Dot, Bar, Ring, RingStat, Metric, ListRow, ListButton, Kbd
│  └─ feedback.tsx   Hint, Callout, EmptyState, Skeleton, Spinner
└─ index.ts          public API
```

`app/globals.css` imports `tokens.css` and `theme.css` once. shadcn's CSS variables (`--primary`, `--muted`, …) are mapped onto Dropper's semantic tokens, so `components/ui/*` follows the system automatically. `components/ui/button.tsx` *is* the Dropper Button.

---

## Principles

1. **Gray by default.** White cards sit on a `#F8F8F7` canvas. Colour is never decoration.
2. **Colour means something.**
   - Blue: action, progress, "you"
   - Mint: right
   - Red: wrong / destructive
   - Marigold: marked / celebration
   - Gold, silver, bronze: medals
   - Navy: Rookie Pass
   - Coral: sale
3. **Calm corners.** 8px for controls, 16px for cards. 16px is the maximum. Fully round shapes are for avatars, dots and progress tracks only.
4. **One row of cards.** Card groups sit side by side on desktop and become a swipe strip on mobile. No 2×2 grids, no stacks of cards.
5. **Big vs small.** Hierarchy comes from type contrast (display 2.6rem down to caption 0.75rem), not from colour.
6. **Explain every number.** Every metric or data heading has a hover/focus definition (`Hint`).
7. **No dividers.** List items are 8px gray tiles (`ListRow`), not rows separated by lines.
8. **Bare icons.** Lucide icons sit next to their label, never inside a coloured frame.

## Tokens

### Layers

| Layer | Example | Rule |
|---|---|---|
| primitive | `--dp-sky-700`, `bg-dp-sky-700` | The raw palette. Don't use it in components. |
| semantic | `--dp-action-primary`, `bg-action-primary`, `text-fg-muted` | **Use these.** They switch automatically for Night owl (`html.dark`). |
| component | button heights, card padding | Encoded in the primitives. |

### Colour, palette

These come from the owl logo:

| Family | From | Used for |
|---|---|---|
| sky | the owl's circle | brand blue |
| clay | the feathers | |
| marigold | the beak | |

The other families are mint, red, coral (sale), navy (Pass), gray (UI), night (dark UI) and paper (landing). Every step is visible at `/design-system#color`.

### Colour, semantic (Tailwind class → meaning)

| Class | Meaning |
|---|---|
| `bg-canvas` | App background, the only gray background |
| `bg-surface` | Cards |
| `bg-raised` | Popovers, dialogs |
| `bg-sunken` | Inner tiles, chips, options |
| `text-fg` / `text-fg-secondary` / `text-fg-muted` | Text hierarchy |
| `text-link` | Inline links |
| `ring-line-subtle` / `ring-line` / `ring-line-strong` | Outlines |
| `ring-focus` | Focus ring |
| `bg-action-primary` + `text-on-primary` | Primary CTA (blue) |
| `bg-action-secondary` + `text-on-secondary` | Secondary CTA / selection (pastel blue) |
| `bg-action-neutral` | Neutral button |
| `text-success`, `bg-success-surface`, `ring-success-border` | Right answer |
| `text-danger`, `bg-danger-surface`, `text-danger-text`, `ring-danger-border` | Wrong answer / error |
| `text-warning`, `bg-warning-surface`, `text-warning-text` | Marked / attention |

Gradients (`--dp-gradient-*`), one job each:

| Gradient | Job |
|---|---|
| `pass` | Rookie Pass |
| `sale` | % off tag, sale CTA |
| `stage` | Leaderboard |
| `brand` | Landing footer |

### Typography

Font: Open Sauce Two. The dashboard root is **14px** (landing 16px), so everything is in `rem` and the whole UI scales together. Each `text-<name>` class sets size, line height, tracking and default weight.

| Class | Size | Use |
|---|---|---|
| `text-price` | 3.2rem | Pass price |
| `text-display` | 2.6rem | Page title (one per page) |
| `text-value` | 2.4rem | Metric numbers |
| `text-heading` | 1.35rem | Section headings |
| `text-title` | 1.2rem | Card titles |
| `text-body-lg` | 1.15rem | Question text |
| `text-body` | 1rem | Default |
| `text-body-sm` | 0.9rem | Dense body, list rows |
| `text-label` | 0.85rem | Labels, small buttons |
| `text-meta` | 0.8rem | Meta, helper text |
| `text-caption` | 0.75rem | Tags, chips. **Minimum size.** |

### Spacing

The grid is 4pt. Tailwind's numeric scale *is* the grid (`p-4` = 1rem). **Prefer the named tokens**, because they encode intent:

| Token | Value | Use |
|---|---|---|
| `inline` | 0.375rem | Icon ↔ label |
| `inline-lg` | 0.75rem | Between inline items |
| `stack-xs` | 0.5rem | List rows, chip groups |
| `stack` | 1rem | Cards in a row, blocks in a card |
| `stack-lg` | 1.5rem | Groups inside a card |
| `card` | 1.5rem | Card padding |
| `card-lg` | 2rem | Feature card padding |
| `control` | 1rem | Button/input horizontal padding |
| `gutter` / `gutter-lg` | 1rem / 1.5rem | Page side padding (mobile / ≥md) |
| `section-sm` | 2.5rem | Page top → first block |
| `section` | 3.5rem | Between sections |
| `section-lg` | 5rem | Landing sections |

Usage: `p-card`, `gap-stack`, `mt-section`, `px-gutter md:px-gutter-lg`, `gap-inline`.

### Radius · elevation · motion · layout

- **Radius:**
  - `rounded-tag` 6px
  - `rounded-control` 8px (default)
  - `rounded-card` 16px (max)
  - `rounded-round` (avatars and dots only)
- **Shadow:**
  - Cards use `ring-1 ring-line-subtle`, not a shadow.
  - `shadow-hover` (card lift), `shadow-raised` (popovers), `shadow-float` (floating nav), `shadow-sale`
- **Motion:**
  - Durations: instant 100, fast 150, base 300, slow 500, lazy 700 (ms)
  - `ease-standard` `cubic-bezier(.2,.7,.2,1)` is the default; also `ease-emphasized` and `ease-exit`
  - Always respect reduced motion.
- **Layout:**
  - `max-w-content` 1180px · `max-w-focus` 880px · `max-w-prose` 42rem
  - Breakpoints: sm 640, md 768, lg 1024, xl 1280
- **Z-index:** sticky 30 · nav 40 · overlay 50 · toast 60.
- **Icons:** Lucide at 12 / 14 / 16 / 20 / 24px, stroke 1.75 (2 at ≤14px).

## Components

### Button

```tsx
<Button>Continue</Button>                                   // primary · md
<Button variant="secondary" iconStart={<Sparkles />}>Explain it</Button>
<Button variant="ghost" size="icon-sm" aria-label="Bookmark"><Bookmark /></Button>
<Button loading={busy}>Saving…</Button>
<Button variant="outline" render={<Link href="/tests" />}>All tests</Button>
<Button block>Full width</Button>
```

| Variant | Use |
|---|---|
| `primary` | The **one** main action on a screen or card |
| `secondary` | Supporting action next to primary; selection CTAs |
| `neutral` | Quiet, frequent actions |
| `outline` | Secondary on white where pastel blue is too loud |
| `ghost` | Toolbars, "Back", "See all", icon buttons |
| `link` | Inline text action |
| `danger` | Destructive |
| `inverse` | On Pass/stage (dark, gradient) surfaces |
| `sale` | Sale CTA only, max one per screen |

- **Sizes:** `xs` 28 · `sm` 32 · `md` 40 (default) · `lg` 44 · `xl` 52 px, plus `icon-xs` / `icon-sm` / `icon-md` / `icon-lg`.
- **Aliases** kept for shadcn code: `default` = primary, `destructive` = danger, size `default` = sm, `icon` = icon-sm.

### The rest

| Component | Notes |
|---|---|
| `Text variant tone as uppercase` | Every piece of type. Shorthands: `Display`, `Heading`, `Title`, `Meta`, `Caption`. |
| `Container size="content\|focus"` | |
| `PageHeader` | One display title, one line, optional action. |
| `Section` | Heading (optional `hint`) + action, with `mt-section` rhythm. |
| `Row cols` | **The** card group. |
| `Stack` / `Inline` | Flex with token gaps. |
| `Card variant padding` | Variants: default, static, interactive, sunken, pass, stage. Plus `CardHead`. |
| `Modal` | Dialog recipe (16px). |
| `Chip active` | Pill toggle. |
| `SegmentedControl` | |
| `Input` / `Field` | label, hint, error. |
| `OmrOption` | idle / selected / right / wrong. |
| `OmrCheck` | Multi-select. |
| `Tag tone` | neutral, info, success, danger, warning, pass, sale. |
| `Dot` | |
| `Bar tone` | |
| `Ring` / `RingStat` | |
| `Metric` | icon, label, hint, value, action. |
| `ListRow` / `ListButton` | |
| `Kbd` | |
| `Hint` | Definition tooltip. |
| `Callout tone` | |
| `EmptyState` | |
| `Skeleton` | |
| `Spinner` | |

### Rookie product patterns

These live in `components/rookie/` and are built from Dropper:

- `sale.tsx`: PassCard, PassMini, SaleBar, OffTag, FlipCountdown, `useBuyPass`
- `stage.tsx`: leaderboard stage, medals, confetti, spotlight
- `define.tsx`: Rookie's metric definitions (DEFS)
- `app-shell.tsx`: sidebar, top bar, mobile nav

`components/rookie/ui.tsx` re-exports Dropper under the names the screens already use.

## Do and don't

| Do | Don't |
|---|---|
| Semantic classes (`bg-surface`, `text-fg-muted`, `bg-action-primary`) | Hex colours or palette steps in components |
| One primary button per screen | Coloured section backgrounds |
| Card groups in `<Row>` | Radius above 16px, pill-shaped buttons |
| `Hint` on every metric | Frames/backgrounds behind icons |
| `rounded-control` / `rounded-card` | Divider lines between list items |
| `notify()` toasts | `alert()`; text below 0.75rem |

## Changing a token

1. Edit `dropper/tokens/tokens.ts`.
2. Run `npm run tokens`. This regenerates `tokens.css` and `theme.css`.
3. Check `/design-system` in light and Night owl.
