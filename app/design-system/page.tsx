'use client';
/**
 * /design-system — the living reference for the Dropper Design System.
 * Everything here renders from dropper/tokens/tokens.ts and the real components, so it never drifts.
 */
import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight, Bookmark, Check, ChevronRight, Coins, Copy, Flame, Inbox, Moon, Plus, Search, Sparkles, Sun, Target, Trash2, Trophy,
} from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Button, Text, Display, Heading, Title, Meta, Caption, PageHeader, Row, Stack, Inline, Card, CardHead, Modal,
  Chip, SegmentedControl, Input, Field, OmrOption, OmrCheck, Tag, Dot, Bar, Ring, RingStat, Metric, ListRow, ListButton, Kbd,
  Hint, EmptyState, Skeleton, Spinner, Callout,
  palette, semantic, gradients, medals, space, spacing, radius, type as typeScale, shadow, motion, z, layout, breakpoints, icon as iconTokens,
} from '@/dropper';
import { useNightOwl } from '@/components/rookie/theme';
import { Toaster, notify } from '@/components/rookie/toast';
import { FlipCountdown, OffTag, PassCard } from '@/components/rookie/sale';
import { MedalAvatar, useConfetti } from '@/components/rookie/stage';
import { cn } from '@/lib/utils';
import '@/components/rookie/rookie.css';

const NAV = [
  ['overview', 'Overview'], ['principles', 'Principles'], ['color', 'Colour'], ['semantic', 'Semantic colour'], ['gradients', 'Gradients'],
  ['type', 'Typography'], ['spacing', 'Spacing'], ['radius', 'Radius'], ['elevation', 'Elevation'], ['motion', 'Motion'],
  ['layout', 'Layout & layers'], ['icons', 'Icons'], ['buttons', 'Buttons'], ['text', 'Text'], ['tags', 'Tags & status'],
  ['controls', 'Controls'], ['answers', 'Answer options'], ['progress', 'Progress'], ['cards', 'Cards & metrics'], ['lists', 'Lists'],
  ['feedback', 'Feedback'], ['overlays', 'Overlays'], ['patterns', 'Rookie patterns'], ['rules', 'Do & don’t'],
] as const;

function copy(text: string) {
  try { navigator.clipboard.writeText(text); notify(`Copied ${text}`); } catch {}
}

function Token({ name }: { name: string }) {
  return (
    <button onClick={() => copy(name)} title="Copy"
      className="inline-flex items-center gap-1 rounded-tag bg-sunken px-1.5 py-0.5 font-mono text-[0.72rem] text-fg-secondary transition hover:bg-action-secondary hover:text-on-secondary">
      {name}<Copy className="size-3 opacity-60" />
    </button>
  );
}

function Block({ id, title, intro, children }: { id: string; title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 pt-section">
      <h2 className="text-heading text-fg">{title}</h2>
      {intro && <p className="mt-1.5 max-w-prose text-body-sm text-fg-muted">{intro}</p>}
      <div className="mt-stack-lg">{children}</div>
    </section>
  );
}

function Specimen({ label, children, className }: { label?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-card bg-surface p-card ring-1 ring-line-subtle', className)}>
      {label && <p className="mb-stack text-label text-fg-muted">{label}</p>}
      {children}
    </div>
  );
}

const isLight = (hex: string) => {
  const h = hex.replace('#', ''); if (h.length !== 6) return true;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
};

/* ───────────────────────────────────────────────────────────────────────── */

function Swatches() {
  return (
    <Stack gap="stack-lg">
      {Object.entries(palette).map(([fam, steps]) => (
        <div key={fam}>
          <p className="mb-2 text-label capitalize text-fg">{fam}</p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:grid-cols-12">
            {Object.entries(steps).map(([step, hex]) => (
              <button key={step} onClick={() => copy(`--dp-${fam}-${step}`)} title={`--dp-${fam}-${step}`}
                className="group flex h-20 flex-col justify-end rounded-control p-2 text-left ring-1 ring-black/5 transition hover:-translate-y-0.5"
                style={{ background: hex, color: isLight(hex) ? '#2e2e2e' : '#fff' }}>
                <span className="text-caption">{step}</span>
                <span className="font-mono text-[0.68rem] opacity-80">{hex}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </Stack>
  );
}

function SemanticTable() {
  return (
    <Stack gap="stack-lg">
      {Object.entries(semantic).map(([group, items]) => (
        <Specimen key={group} label={<span className="capitalize">{group}</span>}>
          <div className="flex flex-col gap-stack-xs">
            {Object.entries(items).map(([name, pair]) => (
              <div key={name} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-control bg-sunken px-3 py-2.5 sm:grid-cols-[220px_1fr_auto]">
                <Token name={`--dp-${group}-${name}`} />
                <span className="hidden text-meta text-fg-muted sm:block">{pair.note}</span>
                <span className="flex items-center gap-1.5">
                  <span title={`light ${pair.light}`} className="size-7 rounded-tag ring-1 ring-black/10" style={{ background: pair.light }} />
                  <span title={`dark ${pair.dark}`} className="size-7 rounded-tag ring-1 ring-white/10" style={{ background: pair.dark, boxShadow: 'inset 0 0 0 999px rgba(18,20,23,.0)' }} />
                </span>
              </div>
            ))}
          </div>
        </Specimen>
      ))}
    </Stack>
  );
}

function ButtonsShowcase() {
  const variants = ['primary', 'secondary', 'neutral', 'outline', 'ghost', 'link', 'danger'] as const;
  const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
  const [loading, setLoading] = React.useState(false);
  return (
    <Stack gap="stack-lg">
      <Specimen label="Types — one primary per screen; secondary beside it; neutral/outline/ghost for everything quieter">
        <div className="flex flex-wrap items-center gap-stack">
          {variants.map(v => <Button key={v} variant={v}>{v[0].toUpperCase() + v.slice(1)}</Button>)}
        </div>
      </Specimen>
      <Row cols={2}>
        <Card variant="pass" padding="card">
          <p className="mb-stack text-label text-white/70">inverse — on Pass / stage surfaces</p>
          <Button variant="inverse" iconEnd={<ArrowRight />}>Get 1 year · ₹399</Button>
        </Card>
        <Specimen label="sale — sale-only CTA, never more than one on screen">
          <Button variant="sale" iconEnd={<ArrowRight />}>Grab it</Button>
        </Specimen>
      </Row>
      <Specimen label="Sizes — xs 28 · sm 32 · md 40 (default) · lg 44 · xl 52 px @16 root">
        <div className="flex flex-wrap items-end gap-stack">
          {sizes.map(s => <Button key={s} size={s}>Size {s}</Button>)}
        </div>
      </Specimen>
      <Specimen label="Icon buttons — icon-xs · icon-sm · icon-md · icon-lg (always give aria-label)">
        <div className="flex flex-wrap items-end gap-stack">
          {(['icon-xs', 'icon-sm', 'icon-md', 'icon-lg'] as const).map(s => (
            <Button key={s} size={s} variant="ghost" aria-label="Bookmark"><Bookmark /></Button>
          ))}
          <Button size="icon-md" variant="secondary" aria-label="Add"><Plus /></Button>
          <Button size="icon-md" aria-label="Next"><ArrowRight /></Button>
        </div>
      </Specimen>
      <Specimen label="States & options — iconStart / iconEnd · loading · disabled · block · as a link">
        <div className="flex flex-wrap items-center gap-stack">
          <Button iconStart={<Sparkles />}>With icon</Button>
          <Button variant="secondary" iconEnd={<ChevronRight />}>Trailing icon</Button>
          <Button loading={loading} onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1500); }}>
            {loading ? 'Opening…' : 'Click for loading'}
          </Button>
          <Button disabled>Disabled</Button>
          <Button variant="outline" render={<Link href="/home" />}>Link button</Button>
        </div>
        <Button block className="mt-stack" variant="neutral">Block (full width)</Button>
      </Specimen>
      <CodeLine>{`<Button variant="primary" size="md" iconEnd={<ArrowRight />} loading={busy}>Continue</Button>`}</CodeLine>
    </Stack>
  );
}

function CodeLine({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-control bg-sunken px-4 py-3 font-mono text-[0.8rem] leading-relaxed text-fg-secondary">
      <code>{children}</code>
    </pre>
  );
}

function ConfettiDemo() {
  const { canvas, burst } = useConfetti();
  return (
    <Card variant="stage" padding="card" className="min-h-[220px]">
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 z-20 size-full" aria-hidden />
      <p className="text-label text-white/70">Stage · medals · confetti</p>
      <div className="mt-6 flex items-end justify-center gap-8">
        <MedalAvatar rank={2} name="Rohan Mehta" />
        <MedalAvatar rank={1} name="Ishita Rao" size="lg" />
        <MedalAvatar rank={3} name="Kabir Singh" />
      </div>
      <div className="mt-6 flex justify-center"><Button variant="inverse" size="sm" onClick={burst}>Celebrate</Button></div>
    </Card>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */

export default function DesignSystemPage() {
  const { dark, toggle } = useNightOwl();
  const [seg, setSeg] = React.useState<'top3' | 'top10'>('top3');
  const [chip, setChip] = React.useState('JEE Main');
  const [omr, setOmr] = React.useState<number | null>(null);
  const [checks, setChecks] = React.useState<Record<string, boolean>>({ Kinematics: true });
  const [modal, setModal] = React.useState(false);

  return (
    <TooltipProvider>
      <div className="rk-app min-h-svh bg-canvas font-sans text-fg">
        {/* top bar */}
        <header className="sticky top-0 z-30 bg-canvas/85 px-gutter backdrop-blur-md md:px-gutter-lg">
          <div className="mx-auto flex h-14 max-w-content items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/rookie-owl.png" alt="" className="size-8 rounded-control" />
            <span className="text-title text-fg">Dropper</span>
            <Tag tone="info">v1.0</Tag>
            <span className="hidden text-meta text-fg-muted sm:inline">Rookie’s design system</span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" render={<Link href="/home" />}>Open the app</Button>
              <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={dark ? 'Day mode' : 'Night owl mode'}>{dark ? <Sun /> : <Moon />}</Button>
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-content gap-10 px-gutter md:px-gutter-lg">
          {/* side nav */}
          <nav aria-label="Sections" className="sticky top-20 hidden h-[calc(100svh-6rem)] w-48 shrink-0 overflow-y-auto pb-10 lg:block">
            <ul className="flex flex-col gap-0.5 pt-section-sm">
              {NAV.map(([id, label]) => (
                <li key={id}><a href={`#${id}`} className="block rounded-control px-3 py-1.5 text-body-sm text-fg-muted transition hover:bg-sunken hover:text-fg">{label}</a></li>
              ))}
            </ul>
          </nav>

          <main className="min-w-0 flex-1 pb-24">
            {/* OVERVIEW */}
            <section id="overview" className="scroll-mt-24">
              <PageHeader title="Dropper Design System" sub="The tokens, primitives and patterns behind Rookie. Built on shadcn/ui + Tailwind v4, Open Sauce Two and Lucide." />
              <Row cols={3} className="mt-stack-lg">
                <Specimen label="Source of truth"><p className="text-body-sm text-fg">Edit <Token name="dropper/tokens/tokens.ts" /> then run <Token name="npm run tokens" />.</p></Specimen>
                <Specimen label="Use in code"><p className="text-body-sm text-fg"><Token name="import { Button } from '@/dropper'" /></p></Specimen>
                <Specimen label="Docs"><p className="text-body-sm text-fg"><Token name="dropper/README.md" /> · this page at <Token name="/design-system" /></p></Specimen>
              </Row>
            </section>

            <Block id="principles" title="Principles" intro="Six rules every screen follows. If something breaks one, it isn’t Dropper.">
              <Row cols={3}>
                {[
                  ['Gray by default', 'White cards on a #F8F8F7 canvas. Colour is never decoration.'],
                  ['Colour means something', 'Blue = action, progress, you. Mint = right. Red = wrong. Gold = medals. Navy = Pass.'],
                  ['Calm corners', '8px for controls, 16px for cards. Nothing rounder (except avatars and dots).'],
                ].map(([t, d]) => <Specimen key={t}><Title>{t}</Title><p className="mt-1 text-body-sm text-fg-muted">{d}</p></Specimen>)}
              </Row>
              <Row cols={3} className="mt-stack">
                {[
                  ['One row of cards', 'Groups sit side by side; on mobile they swipe. No 2×2 grids, no stacks of cards.'],
                  ['Big vs small', 'Display 2.6rem down to caption 0.75rem. Hierarchy comes from contrast, not colour.'],
                  ['Explain every number', 'Each metric or data heading has a hover definition (Hint).'],
                ].map(([t, d]) => <Specimen key={t}><Title>{t}</Title><p className="mt-1 text-body-sm text-fg-muted">{d}</p></Specimen>)}
              </Row>
            </Block>

            {/* TOKENS */}
            <Block id="color" title="Colour · palette" intro="Primitives from the owl logo. Click a swatch to copy its variable. Components never use these directly — they use semantic colours.">
              <Swatches />
            </Block>

            <Block id="semantic" title="Semantic colour" intro="What components use. Each token has a light and a Night-owl value (left / right swatch). Tailwind: bg-canvas, bg-surface, text-fg-muted, bg-action-primary, bg-success-surface…">
              <SemanticTable />
            </Block>

            <Block id="gradients" title="Gradients" intro="Each gradient has exactly one job.">
              <Row cols={4}>
                {Object.entries({ pass: 'Rookie Pass card, sale bar', sale: '% off tag, sale CTA', stage: 'Leaderboard stage', brand: 'Landing footer only' }).map(([k, job]) => (
                  <div key={k} className="flex h-36 flex-col justify-end rounded-card p-4 ring-1 ring-black/5" style={{ background: gradients[k as keyof typeof gradients] }}>
                    <span className={cn('text-label', k === 'brand' ? 'text-fg' : 'text-white')}>{k}</span>
                    <span className={cn('text-meta', k === 'brand' ? 'text-fg-secondary' : 'text-white/75')}>{job}</span>
                  </div>
                ))}
              </Row>
              <div className="mt-stack flex flex-wrap gap-stack">
                {Object.entries(medals).map(([k, m]) => (
                  <span key={k} className="flex items-center gap-2 text-label capitalize text-fg-muted">
                    <span className="size-6 rounded-round" style={{ background: m.ring }} /> {k}
                  </span>
                ))}
              </div>
            </Block>

            <Block id="type" title="Typography" intro="Open Sauce Two. Dashboard root is 14px (landing 16px), so everything is in rem and scales together. Tailwind: text-<name> sets size, line-height, tracking and default weight.">
              <Stack gap="stack-xs">
                {Object.entries(typeScale).map(([k, t]) => (
                  <div key={k} className="grid items-baseline gap-3 rounded-control bg-surface px-4 py-4 ring-1 ring-line-subtle md:grid-cols-[150px_1fr_220px]">
                    <Token name={`text-${k}`} />
                    <span className="truncate text-fg" style={{ fontSize: t.size, lineHeight: t.line, letterSpacing: t.track, fontWeight: t.weight }}>
                      {k === 'price' ? '₹399' : k === 'value' ? '1,240' : 'Ratto mat, samjho.'}
                    </span>
                    <span className="text-meta text-fg-muted">{t.size} / {t.line} · {t.weight} — {t.use}</span>
                  </div>
                ))}
              </Stack>
            </Block>

            <Block id="spacing" title="Spacing" intro="A 4-point grid. Tailwind’s numeric scale is the grid (p-4 = 1rem). Prefer the named tokens — they encode intent.">
              <Row cols={2}>
                <Specimen label="Scale">
                  <Stack gap="stack-xs">
                    {Object.entries(space).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-3">
                        <span className="w-10 font-mono text-meta text-fg-muted">{k}</span>
                        <span className="h-3 rounded-tag bg-action-primary/70" style={{ width: v }} />
                        <span className="font-mono text-meta text-fg-muted">{v}</span>
                      </div>
                    ))}
                  </Stack>
                </Specimen>
                <Specimen label="Named spacing → p-card, gap-stack, mt-section, px-gutter…">
                  <Stack gap="stack-xs">
                    {Object.entries(spacing).map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[110px_60px_1fr] items-center gap-3 rounded-control bg-sunken px-3 py-2">
                        <Token name={k} />
                        <span className="font-mono text-meta text-fg">{v.value}</span>
                        <span className="text-meta text-fg-muted">{v.note}</span>
                      </div>
                    ))}
                  </Stack>
                </Specimen>
              </Row>
            </Block>

            <Block id="radius" title="Radius" intro="Two working values: 8px (controls) and 16px (cards). 16px is the maximum.">
              <Row cols={5}>
                {Object.entries(radius).map(([k, v]) => (
                  <Specimen key={k} label={<Token name={`rounded-${k}`} />}>
                    <div className="h-20 bg-action-secondary ring-1 ring-dp-sky-300" style={{ borderRadius: v.value }} />
                    <p className="mt-3 text-meta text-fg-muted">{v.value} — {v.note}</p>
                  </Specimen>
                ))}
              </Row>
            </Block>

            <Block id="elevation" title="Elevation" intro="Cards sit on a 1px subtle ring, not a shadow. Shadows only appear on interaction or floating layers.">
              <Row cols={5}>
                {Object.entries(shadow).map(([k, v]) => (
                  <div key={k} className="flex h-32 flex-col justify-end rounded-card bg-surface p-4 ring-1 ring-line-subtle" style={{ boxShadow: v.value === 'none' ? undefined : v.value }}>
                    <Token name={`shadow-${k}`} />
                    <span className="mt-1 text-meta text-fg-muted">{v.note}</span>
                  </div>
                ))}
              </Row>
            </Block>

            <Block id="motion" title="Motion" intro="Quick and calm. Hover the tiles. Everything respects prefers-reduced-motion.">
              <Row cols={2}>
                <Specimen label="Durations">
                  <div className="flex flex-wrap gap-stack-xs">
                    {Object.entries(motion.duration).map(([k, v]) => (
                      <div key={k} className="group flex w-28 flex-col gap-2 rounded-control bg-sunken p-3">
                        <span className="h-2 w-6 rounded-round bg-action-primary transition-all group-hover:w-20" style={{ transitionDuration: v }} />
                        <span className="text-meta text-fg">{k}</span><span className="font-mono text-caption text-fg-muted">{v}</span>
                      </div>
                    ))}
                  </div>
                </Specimen>
                <Specimen label="Easing">
                  <Stack gap="stack-xs">
                    {Object.entries(motion.ease).map(([k, v]) => (
                      <div key={k} className="group rounded-control bg-sunken p-3">
                        <div className="flex items-center justify-between"><Token name={`ease-${k}`} /><span className="text-meta text-fg-muted">{v.note}</span></div>
                        <span className="mt-2 block size-3 rounded-round bg-action-primary transition-transform duration-700 group-hover:translate-x-48" style={{ transitionTimingFunction: v.value }} />
                      </div>
                    ))}
                  </Stack>
                </Specimen>
              </Row>
            </Block>

            <Block id="layout" title="Layout & layers">
              <Row cols={3}>
                <Specimen label="Layout">
                  <Stack gap="stack-xs">{Object.entries(layout).map(([k, v]) => <div key={k} className="flex justify-between gap-3 text-meta"><span className="text-fg">{k}</span><span className="font-mono text-fg-muted">{v.value}</span></div>)}</Stack>
                </Specimen>
                <Specimen label="Breakpoints">
                  <Stack gap="stack-xs">{Object.entries(breakpoints).map(([k, v]) => <div key={k} className="flex justify-between text-meta"><span className="text-fg">{k}</span><span className="font-mono text-fg-muted">{v}</span></div>)}</Stack>
                </Specimen>
                <Specimen label="Z-index">
                  <Stack gap="stack-xs">{Object.entries(z).map(([k, v]) => <div key={k} className="flex justify-between text-meta"><span className="text-fg">{k}</span><span className="font-mono text-fg-muted">{v}</span></div>)}</Stack>
                </Specimen>
              </Row>
            </Block>

            <Block id="icons" title="Icons" intro={<>Lucide only, sitting bare next to labels — never inside a frame. Stroke {iconTokens.stroke.regular} (2 at small sizes).</>}>
              <Specimen>
                <div className="flex flex-wrap items-end gap-8">
                  {Object.entries(iconTokens.size).map(([k, px]) => (
                    <div key={k} className="flex flex-col items-center gap-2 text-fg"><Trophy style={{ width: px, height: px }} strokeWidth={px <= 14 ? 2 : 1.75} /><span className="text-caption text-fg-muted">{k} · {px}</span></div>
                  ))}
                  <span className="flex items-center gap-inline text-label text-fg-muted"><Flame className="size-[15px]" /> Streak</span>
                  <span className="flex items-center gap-inline text-label text-fg-muted"><Coins className="size-[15px]" /> Coins</span>
                </div>
              </Specimen>
            </Block>

            {/* COMPONENTS */}
            <Block id="buttons" title="Buttons" intro="Nine types, five sizes, four icon sizes. One primary action per screen.">
              <ButtonsShowcase />
            </Block>

            <Block id="text" title="Text">
              <Specimen>
                <Stack gap="stack-xs">
                  <Display>Display</Display><Heading>Heading</Heading><Title>Title</Title>
                  <Text variant="body-lg">Body large — question text.</Text><Text>Body — default copy.</Text>
                  <Text variant="body-sm" tone="secondary">Body small · secondary</Text>
                  <Meta>Meta · muted</Meta><Caption uppercase>Caption · uppercase</Caption>
                  <Inline><Text tone="success" variant="label">Success</Text><Text tone="danger" variant="label">Danger</Text><Text tone="link" variant="label">Link</Text></Inline>
                </Stack>
              </Specimen>
              <CodeLine>{`<Text variant="heading" tone="default">…</Text>  ·  <Meta>Q14 of 46</Meta>`}</CodeLine>
            </Block>

            <Block id="tags" title="Tags & status">
              <Specimen>
                <Inline wrap>
                  <Tag>Neutral</Tag><Tag tone="info">Info</Tag><Tag tone="success"><Check className="size-3" /> Correct</Tag>
                  <Tag tone="danger">Got wrong</Tag><Tag tone="warning">Marked</Tag><Tag tone="sale">60% off</Tag>
                  <span className="flex items-center gap-2 text-meta text-fg-muted"><Dot pulse /> Live</span>
                  <span className="flex items-center gap-2 text-meta text-fg-muted"><Dot tone="danger" /> Offline</span>
                  <Kbd>⌘K</Kbd>
                </Inline>
              </Specimen>
            </Block>

            <Block id="controls" title="Controls">
              <Row cols={2}>
                <Specimen label="Chip · SegmentedControl">
                  <Inline wrap>{['JEE Main', 'JEE Advanced', 'NEET'].map(c => <Chip key={c} active={chip === c} onClick={() => setChip(c)}>{c}</Chip>)}</Inline>
                  <div className="mt-stack"><SegmentedControl label="Leaderboard view" value={seg} onChange={setSeg} options={[{ value: 'top3', label: 'Top 3' }, { value: 'top10', label: 'Top 10' }]} /></div>
                </Specimen>
                <Specimen label="Input · Field">
                  <Stack gap="stack">
                    <Field label="Your name" hint="Shown on the leaderboard." htmlFor="ds-name"><Input id="ds-name" placeholder="Aarav" /></Field>
                    <Field label="Daily goal" error="Pick a number between 1 and 500." htmlFor="ds-goal"><Input id="ds-goal" defaultValue="0" invalid /></Field>
                  </Stack>
                </Specimen>
              </Row>
            </Block>

            <Block id="answers" title="Answer options (OMR)" intro="Every aspirant has filled thousands of OMR bubbles. Single choice = OmrOption, multi-select = OmrCheck.">
              <Row cols={2}>
                <Specimen label="OmrOption — click one">
                  <Stack gap="stack-xs">
                    {['10 m', '20 m', '30 m', '40 m'].map((o, i) => (
                      <OmrOption key={o} letter={'ABCD'[i]} disabled={omr !== null}
                        state={omr === null ? 'idle' : i === 1 ? 'right' : i === omr ? 'wrong' : 'idle'} onClick={() => setOmr(i)}>{o}</OmrOption>
                    ))}
                    {omr !== null && <Button variant="ghost" size="sm" onClick={() => setOmr(null)}>Reset</Button>}
                  </Stack>
                </Specimen>
                <Specimen label="All states · OmrCheck">
                  <Stack gap="stack-xs">
                    <OmrOption letter="A" state="idle">Idle</OmrOption>
                    <OmrOption letter="B" state="selected">Selected</OmrOption>
                    <OmrOption letter="C" state="right" disabled>Right</OmrOption>
                    <OmrOption letter="D" state="wrong" disabled>Wrong</OmrOption>
                    <div className="mt-2 flex flex-wrap gap-stack-xs">
                      {['Kinematics', 'Electrostatics', 'Optics'].map(c => <OmrCheck key={c} checked={!!checks[c]} onChange={v => setChecks(s => ({ ...s, [c]: v }))}>{c}</OmrCheck>)}
                    </div>
                  </Stack>
                </Specimen>
              </Row>
            </Block>

            <Block id="progress" title="Progress">
              <Row cols={2}>
                <Specimen label="Bar — primary · success · danger · warning">
                  <Stack gap="stack">
                    <Bar value={62} /><Bar value={80} tone="success" /><Bar value={35} tone="danger" /><Bar value={50} tone="warning" />
                  </Stack>
                </Specimen>
                <Specimen label="Ring · RingStat">
                  <Inline gap="stack-lg"><Ring value={30} /><RingStat value={48} /><RingStat value={78} size={84} stroke={8} /></Inline>
                </Specimen>
              </Row>
            </Block>

            <Block id="cards" title="Cards & metrics" intro="Card variants: default · static · interactive · sunken · pass · stage. Metric = bare icon + defined label + big value.">
              <Row cols={4}>
                <Metric icon={Flame} label="Streak" hint="Days in a row you’ve solved at least one question." value={<>7<span className="ml-1 text-body font-semibold text-fg-muted">days</span></>}><Bar value={70} /></Metric>
                <Metric icon={Target} label="Today" hint="Questions solved today against your daily target." value="12 / 20" action={<Button variant="ghost" size="xs">Change</Button>}><Bar value={60} /></Metric>
                <Card variant="interactive" className="flex min-h-[164px] flex-col justify-between">
                  <Meta className="uppercase tracking-[0.08em]">Physics</Meta><div><Title>Electrostatics</Title><span className="mt-1 flex items-center gap-1 text-label text-link">Fix it · 62 PYQs <ArrowRight className="size-3.5" /></span></div>
                </Card>
                <Card variant="sunken" className="min-h-[164px]"><CardHead icon={Bookmark} label="Sunken" title="Inside a card" hint="Gray surface for grouping inside a white card." /></Card>
              </Row>
            </Block>

            <Block id="lists" title="Lists" intro="No divider lines. Each item is an 8px gray tile.">
              <Specimen>
                <Stack gap="stack-xs">
                  <ListRow><span className="w-6 text-center text-label text-fg-muted">4</span><span className="flex-1 text-body-sm text-fg">Ankit</span><span className="text-label tabular-nums text-fg">590</span></ListRow>
                  <ListRow interactive><span className="w-6 text-center text-label text-fg-muted">5</span><span className="flex-1 text-body-sm text-fg">Interactive row</span><ChevronRight className="size-4 text-fg-muted" /></ListRow>
                  <ListButton><Search className="size-4 text-fg-muted" /><span className="flex-1 text-body-sm text-fg">ListButton (a real button)</span><Kbd>↵</Kbd></ListButton>
                </Stack>
              </Specimen>
            </Block>

            <Block id="feedback" title="Feedback">
              <Row cols={2}>
                <Stack gap="stack-xs">
                  <Callout tone="info" title="Heads up">Your test autosaves every few seconds.</Callout>
                  <Callout tone="success" title="Sahi jawab!">+12 coins.</Callout>
                  <Callout tone="warning" title="5 minutes left">Review your marked questions.</Callout>
                  <Callout tone="danger" title="Couldn’t save" action={<Button size="xs" variant="danger">Retry</Button>}>Check your connection.</Callout>
                </Stack>
                <Stack gap="stack">
                  <EmptyState icon={Inbox} title="No bookmarks yet" sub="Save questions to solve them again later." action={<Button variant="secondary" size="sm">Browse chapters</Button>} />
                  <Specimen label="Skeleton · Spinner · Hint">
                    <Stack gap="stack-xs"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /></Stack>
                    <Inline className="mt-stack"><Spinner /><Hint text="Share of your answers that were correct over the last 7 days."><span className="text-label text-fg">Accuracy (hover me)</span></Hint></Inline>
                  </Specimen>
                </Stack>
              </Row>
            </Block>

            <Block id="overlays" title="Overlays" intro="Modal (16px), toasts instead of alert(), tooltips for definitions.">
              <Specimen>
                <Inline wrap>
                  <Button variant="secondary" onClick={() => setModal(true)}>Open modal</Button>
                  <Button variant="neutral" onClick={() => notify('Saved. Keep going!')}>Toast</Button>
                  <Button variant="neutral" onClick={() => notify.success('Rookie Pass activated.')}>Success toast</Button>
                  <Button variant="danger" onClick={() => notify.error('Please sign in to purchase.')}>Error toast</Button>
                </Inline>
              </Specimen>
              <Modal open={modal} onOpenChange={setModal} title="Delete this bookmark?" description="You can bookmark it again any time."
                footer={<><Button variant="ghost" onClick={() => setModal(false)}>Keep it</Button><Button variant="danger" iconStart={<Trash2 />} onClick={() => setModal(false)}>Delete</Button></>} />
            </Block>

            <Block id="patterns" title="Rookie patterns" intro="Product compositions built from Dropper: Rookie Pass, sale timer, leaderboard stage.">
              <Row className="md:grid-cols-[1fr_1fr]">
                <PassCard />
                <Stack gap="stack">
                  <Specimen label="Sale tag · flip countdown (numbers only)">
                    <Inline wrap><OffTag /><FlipCountdown tile="bg-action-secondary text-on-secondary" /></Inline>
                  </Specimen>
                  <ConfettiDemo />
                </Stack>
              </Row>
            </Block>

            <Block id="rules" title="Do & don’t">
              <Row cols={2}>
                <Specimen label={<span className="text-success">Do</span>}>
                  <ul className="flex flex-col gap-2 text-body-sm text-fg">
                    {['Use semantic tokens (bg-surface, text-fg-muted, bg-action-primary).', 'One primary button per screen.', 'Put card groups in a <Row>.', 'Give every metric a Hint.', 'Use rounded-control / rounded-card.', 'Use toasts (notify) for feedback.'].map(t => <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" />{t}</li>)}
                  </ul>
                </Specimen>
                <Specimen label={<span className="text-danger">Don’t</span>}>
                  <ul className="flex flex-col gap-2 text-body-sm text-fg">
                    {['Hex colours or palette steps in components.', 'Coloured section backgrounds.', 'Radius above 16px or pills on buttons.', 'Frames/backgrounds behind icons.', 'Divider lines between list items.', 'Text smaller than 0.75rem.'].map(t => <li key={t} className="flex gap-2"><span className="mt-0.5 grid size-4 shrink-0 place-items-center text-danger">✕</span>{t}</li>)}
                  </ul>
                </Specimen>
              </Row>
            </Block>
          </main>
        </div>
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
