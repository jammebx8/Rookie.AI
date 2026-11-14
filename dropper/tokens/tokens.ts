/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  DROPPER DESIGN SYSTEM · TOKENS (single source of truth)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Edit values HERE, then run `npm run tokens` to regenerate:
 *    dropper/tokens/tokens.css  → CSS custom properties (--dp-*) + light/dark semantics
 *    dropper/tokens/theme.css   → Tailwind v4 @theme (utilities: rounded-card, text-display, mt-section…)
 *  The app also imports this file directly for typed access (`import { tokens } from '@/dropper'`).
 *
 *  Layers
 *    1. primitive  — raw palette & scales. Never used directly in components.
 *    2. semantic   — meaning (surface, text, action, feedback). Light + dark ("Night owl").
 *    3. component  — a few named recipes (button heights, card padding) built from 1 + 2.
 *
 *  Plain TS only (no enums) so Node can run it with type-stripping.
 */

/* ── 1. PRIMITIVES ──────────────────────────────────────────────────────── */

/** Pastel families extracted from the owl logo + supporting hues. */
export const palette = {
  /** Sky — the owl's circle. Brand blue: CTAs, progress, selection, "you". */
  sky: { 50: '#f3f9ff', 100: '#e3f1ff', 200: '#c9e5ff', 300: '#a3d4ff', 400: '#85c3fe', 500: '#65b1fc', 600: '#3d8fe0', 700: '#2a6fb5', 800: '#1d4f86', 900: '#163a60' },
  /** Clay — the feathers. Warm accent; used sparingly (landing, owl). */
  clay: { 50: '#fcf5f2', 100: '#f7e8e1', 200: '#efd2c6', 300: '#e0b3a2', 400: '#c38778', 500: '#a65d4e', 600: '#8a4637', 700: '#734338', 800: '#5a3128', 900: '#3d221c' },
  /** Marigold — the beak. Celebration, "marked for review", Pass highlights. */
  marigold: { 50: '#fffbea', 100: '#fff3c4', 200: '#ffe68a', 300: '#ffd84d', 400: '#ffce00', 500: '#fdba12', 600: '#d69600', 700: '#a06f00', 800: '#6b4a00', 900: '#4d3500' },
  /** Mint — supporting. Right answers, success, live. */
  mint: { 50: '#f0fbf5', 100: '#dcf5e7', 200: '#b6eacd', 300: '#86dbae', 400: '#4fc787', 500: '#22a865', 600: '#178a51', 700: '#126e41', 800: '#14593a', 900: '#0d3d28' },
  /** Red — wrong answers, errors, destructive (the teacher's red pen). */
  red: { 50: '#fdf4f3', 100: '#fdecea', 200: '#f7cdc8', 300: '#e7a39b', 400: '#e2766a', 500: '#d9473a', 600: '#b2382d', 700: '#8f2c23', 800: '#6b211b', 900: '#4a1712' },
  /** Coral — sale only (the "% off" tag). */
  coral: { 400: '#ff7a3d', 500: '#ff4f7b' },
  /** Navy — Rookie Pass & leaderboard stage only. */
  navy: { 950: '#0b1430', 900: '#0d1736', 850: '#0f1d45', 800: '#14295f', 700: '#1b3a8a', 600: '#2f6fe0' },
  /** Gray — neutral UI (light). 50 is the app canvas. */
  gray: { 0: '#ffffff', 25: '#fbfbfa', 50: '#f8f8f7', 100: '#f1f1ef', 150: '#ecebe8', 200: '#e6e4e0', 300: '#bdb6ad', 400: '#8f8a85', 500: '#736d68', 600: '#625d59', 700: '#55514e', 800: '#3d3a38', 900: '#2e2e2e', 950: '#23272b' },
  /** Night — neutral UI (dark / "Night owl"). */
  night: { 950: '#0e0f12', 900: '#121417', 850: '#16181c', 800: '#1b1e22', 750: '#24272c', 700: '#2a2e34', 400: '#868c97', 200: '#b6bbc5', 50: '#f3f5fa' },
  /** Paper — warm whites used by the landing page's answer-sheet motif. */
  paper: { 25: '#fbf9f5', 50: '#f5f2ec', 100: '#ece6dd' },
} as const;

/* ── 2. SEMANTIC ────────────────────────────────────────────────────────── */

type Pair = { light: string; dark: string; note: string };
const p = (light: string, dark: string, note: string): Pair => ({ light, dark, note });
const P = palette;

/** Semantic colours. Components use ONLY these. Emitted as --dp-<group>-<name>. */
export const semantic = {
  surface: {
    canvas: p(P.gray[50], P.night[850], 'App background behind cards. The only gray background.'),
    base: p(P.gray[0], P.night[900], 'Page background where there is no canvas (landing, dialogs’ backdrop target).'),
    card: p(P.gray[0], P.night[800], 'Cards, panels, list containers.'),
    raised: p(P.gray[0], P.night[800], 'Popovers, menus, dialogs, toasts.'),
    sunken: p(P.gray[50], P.night[850], 'Inner rows, chips, option tiles inside a card.'),
    inverse: p(P.gray[900], P.night[50], 'Rare: tooltips and inverse chips.'),
  },
  text: {
    primary: p(P.gray[900], P.night[50], 'Headings and body.'),
    secondary: p(P.gray[700], P.night[200], 'Supporting copy.'),
    muted: p(P.gray[500], P.night[400], 'Meta, labels, icons. ≥ 4.5:1 on canvas.'),
    inverse: p(P.gray[0], P.night[900], 'Text on inverse surfaces.'),
    link: p(P.sky[700], P.sky[300], 'Inline links.'),
  },
  border: {
    subtle: p('rgba(0,0,0,0.05)', 'rgba(255,255,255,0.06)', 'Card outline (as ring).'),
    default: p(P.gray[150], 'rgba(255,255,255,0.08)', 'Inputs, pills, separators when unavoidable.'),
    strong: p(P.gray[200], 'rgba(255,255,255,0.12)', 'Hover outline, input border.'),
    focus: p(P.sky[600], P.sky[300], 'Focus ring.'),
  },
  action: {
    primary: p(P.sky[700], P.sky[300], 'Primary CTA background, progress fills. White text = 5.3:1.'),
    'primary-hover': p(P.sky[800], P.sky[200], 'Primary CTA hover.'),
    'on-primary': p(P.gray[0], P.night[900], 'Text/icons on primary.'),
    secondary: p(P.sky[100], 'rgba(163,212,255,0.14)', 'Secondary CTA (pastel blue), selected chips, "you" rows.'),
    'secondary-hover': p(P.sky[200], 'rgba(163,212,255,0.22)', 'Secondary hover.'),
    'on-secondary': p(P.sky[800], P.sky[200], 'Text on secondary.'),
    neutral: p(P.gray[100], P.night[750], 'Neutral (gray) button.'),
    'neutral-hover': p(P.gray[150], P.night[700], 'Neutral hover.'),
  },
  feedback: {
    success: p(P.mint[600], P.mint[300], 'Right answer / success text & icons.'),
    'success-surface': p(P.mint[100], 'rgba(134,219,174,0.12)', 'Right-answer tile.'),
    'success-border': p(P.mint[400], 'rgba(134,219,174,0.35)', 'Right-answer outline.'),
    danger: p(P.red[500], '#ff7a66', 'Wrong answer / errors / destructive.'),
    'danger-surface': p(P.red[100], 'rgba(255,122,102,0.12)', 'Wrong-answer tile, error banner.'),
    'danger-border': p(P.red[300], 'rgba(255,122,102,0.35)', 'Wrong-answer outline.'),
    'danger-text': p(P.red[600], '#ff9c8c', 'Text on danger surface.'),
    warning: p(P.marigold[600], P.marigold[300], 'Marked for review, attention.'),
    'warning-surface': p(P.marigold[100], 'rgba(255,216,77,0.12)', 'Warning tile.'),
    'warning-text': p(P.marigold[800], P.marigold[200], 'Text on warning surface.'),
  },
} as const;

/** Signature gradients — each has exactly one job. */
export const gradients = {
  pass: 'radial-gradient(90% 70% at 100% 0%, rgba(253,186,18,.38) 0%, transparent 55%), radial-gradient(70% 60% at 0% 100%, rgba(163,212,255,.32) 0%, transparent 60%), linear-gradient(155deg, #0d1736 0%, #1b3a8a 48%, #2f6fe0 100%)',
  sale: 'linear-gradient(100deg, #ff4f7b 0%, #ff7a3d 100%)',
  stage: 'radial-gradient(70% 55% at 50% 0%, rgba(163,212,255,.18), transparent 70%), linear-gradient(180deg, #0b1430 0%, #122556 100%)',
  brand: 'linear-gradient(115deg, #c9e5ff 0%, #f7e8e1 48%, #ffe68a 100%)',
  stars: 'radial-gradient(1.2px 1.2px at 20% 30%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 70% 20%, #fff 50%, transparent 51%), radial-gradient(1.4px 1.4px at 85% 65%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 35% 80%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 55% 50%, #fff 50%, transparent 51%)',
} as const;

export const medals = {
  gold: { ring: 'linear-gradient(135deg,#fff1a8,#f5b301 55%,#c98a00)', text: '#ffd84d', glow: 'rgba(255,206,0,.55)' },
  silver: { ring: 'linear-gradient(135deg,#ffffff,#c6ceda 55%,#8e98a6)', text: '#dfe5ee', glow: 'rgba(210,220,235,.35)' },
  bronze: { ring: 'linear-gradient(135deg,#ffd9b8,#d08a57 55%,#9c5a2e)', text: '#f1b07e', glow: 'rgba(208,138,87,.4)' },
} as const;

/* ── SPACING ────────────────────────────────────────────────────────────── */

/**
 * 4-point grid. Values in rem (dashboard root = 14px, landing = 16px — the whole UI scales together).
 * Tailwind's numeric scale (p-1 … p-24) IS this grid: step n = n × 0.25rem.
 */
export const space = {
  0: '0rem', 0.5: '0.125rem', 1: '0.25rem', 1.5: '0.375rem', 2: '0.5rem', 2.5: '0.625rem', 3: '0.75rem', 4: '1rem',
  5: '1.25rem', 6: '1.5rem', 7: '1.75rem', 8: '2rem', 10: '2.5rem', 12: '3rem', 14: '3.5rem', 16: '4rem', 20: '5rem', 24: '6rem',
} as const;

/** Named spacing — use these first. Each becomes a Tailwind spacing key (p-card, gap-stack, mt-section…). */
export const spacing = {
  hair: { value: '0.125rem', note: 'Hairline nudges (2px @16).' },
  inline: { value: '0.375rem', note: 'Icon ↔ label gap.' },
  'inline-lg': { value: '0.75rem', note: 'Between inline items (avatar ↔ name, pills).' },
  'stack-xs': { value: '0.5rem', note: 'Between rows in a list, chips in a group.' },
  stack: { value: '1rem', note: 'Between cards in a row; between blocks inside a card.' },
  'stack-lg': { value: '1.5rem', note: 'Between groups inside a card.' },
  card: { value: '1.5rem', note: 'Card padding.' },
  'card-lg': { value: '2rem', note: 'Feature card padding (question card, Pass card).' },
  control: { value: '1rem', note: 'Horizontal padding of md buttons/inputs.' },
  gutter: { value: '1rem', note: 'Page side padding on mobile.' },
  'gutter-lg': { value: '1.5rem', note: 'Page side padding ≥ md.' },
  'section-sm': { value: '2.5rem', note: 'Top of page → first block.' },
  section: { value: '3.5rem', note: 'Between page sections.' },
  'section-lg': { value: '5rem', note: 'Landing sections.' },
} as const;

/* ── RADIUS ─────────────────────────────────────────────────────────────── */
export const radius = {
  none: { value: '0px', note: 'Full-bleed bars.' },
  tag: { value: '6px', note: 'Tags, badges, inner pills, flip-clock tiles.' },
  control: { value: '8px', note: 'Buttons, inputs, chips, list rows, option tiles. Default.' },
  card: { value: '16px', note: 'Cards, dialogs, sheets, banners. The maximum.' },
  round: { value: '9999px', note: 'Avatars, status dots, progress tracks ONLY.' },
} as const;

/* ── TYPOGRAPHY ─────────────────────────────────────────────────────────── */
export const font = {
  sans: "'Open Sauce Two', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  serifExam: "'Times New Roman', Times, serif",
} as const;

/** Type scale. Big and small are far apart on purpose. Each → Tailwind `text-<name>` (size + leading + tracking + weight). */
export const type = {
  price: { size: '3.2rem', line: '1', track: '-0.05em', weight: 700, use: 'Prices on the Pass card.' },
  display: { size: '2.6rem', line: '1.05', track: '-0.035em', weight: 700, use: 'Page title (one per page).' },
  value: { size: '2.4rem', line: '1', track: '-0.045em', weight: 700, use: 'Metric numbers.' },
  heading: { size: '1.35rem', line: '1.25', track: '-0.02em', weight: 600, use: 'Section headings.' },
  title: { size: '1.2rem', line: '1.3', track: '-0.015em', weight: 600, use: 'Card titles.' },
  'body-lg': { size: '1.15rem', line: '1.6', track: '0', weight: 500, use: 'Question text.' },
  body: { size: '1rem', line: '1.55', track: '0', weight: 400, use: 'Default body.' },
  'body-sm': { size: '0.9rem', line: '1.5', track: '0', weight: 400, use: 'Dense body, list rows.' },
  label: { size: '0.85rem', line: '1.4', track: '0', weight: 500, use: 'Metric labels, card eyebrows, small buttons.' },
  meta: { size: '0.8rem', line: '1.4', track: '0', weight: 500, use: 'Meta lines, helper text.' },
  caption: { size: '0.75rem', line: '1.35', track: '0.01em', weight: 600, use: 'Tags, chips, axis labels. Never smaller.' },
} as const;

/* ── ELEVATION ──────────────────────────────────────────────────────────── */
export const shadow = {
  none: { value: 'none', note: 'Default: cards use a 1px subtle ring, not a shadow.' },
  hover: { value: '0 10px 30px -18px rgba(46,46,46,.28)', note: 'Card hover lift.' },
  raised: { value: '0 12px 32px -12px rgba(20,22,27,.18)', note: 'Popovers, menus, sign-up card.' },
  float: { value: '0 10px 30px -10px rgba(46,46,46,.25)', note: 'Floating mobile nav, sticky bars.' },
  sale: { value: '0 4px 14px -4px rgba(255,79,123,.7)', note: 'Sale tag glow.' },
} as const;

/* ── MOTION ─────────────────────────────────────────────────────────────── */
export const motion = {
  duration: { instant: '100ms', fast: '150ms', base: '300ms', slow: '500ms', lazy: '700ms' },
  ease: {
    standard: { value: 'cubic-bezier(.2,.7,.2,1)', note: 'Default for everything.' },
    emphasized: { value: 'cubic-bezier(.3,.7,.2,1)', note: 'Flip clock, page entrances.' },
    exit: { value: 'cubic-bezier(.4,0,1,1)', note: 'Leaving elements.' },
  },
} as const;

/* ── LAYERS · LAYOUT · BREAKPOINTS · ICONS ──────────────────────────────── */
export const z = { base: 0, raised: 10, sticky: 30, nav: 40, overlay: 50, toast: 60 } as const;

export const layout = {
  content: { value: '1180px', note: 'Max width of dashboard & landing content.' },
  focus: { value: '880px', note: 'Max width of focus screens (question, test hall).' },
  prose: { value: '42rem', note: 'Max line length for paragraphs.' },
  sidebar: { value: '16rem', note: 'Expanded sidebar.' },
  topbar: { value: 'calc(3.5rem + 4px)', note: 'Top bar height.' },
  salebar: { value: '3rem', note: 'Sticky sale bar height.' },
} as const;

export const breakpoints = { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' } as const;

export const icon = {
  size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 },
  stroke: { regular: 1.75, bold: 2 },
  library: 'lucide-react',
} as const;

/** Component recipes (documentation + used by primitives). */
export const components = {
  button: {
    heights: { xs: '1.75rem', sm: '2rem', md: '2.5rem', lg: '2.75rem', xl: '3.25rem' },
    radius: 'control',
  },
  input: { height: '2.75rem', radius: 'control' },
  card: { padding: 'card', radius: 'card', ring: 'border.subtle' },
  chip: { height: '2rem', radius: 'control' },
} as const;

export const tokens = { palette, semantic, gradients, medals, space, spacing, radius, font, type, shadow, motion, z, layout, breakpoints, icon, components } as const;
export type Tokens = typeof tokens;
export default tokens;
