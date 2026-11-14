'use client';
/**
 * Rookie product primitives = Dropper Design System + Rookie's definitions (DEFS).
 * Kept as a compatibility layer: screens import from here; everything renders through `@/dropper`.
 * New code can import straight from '@/dropper'.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Container, PageHeader as DbPageHeader, Section as DbSection, Row as DbRow, Card as DbCard, cardCls as dbCardCls,
  CardHead as DbCardHead, Chip as DbChip, Tag as DbTag, Ring as DbRing, RingStat as DbRingStat, Bar as DbBar,
  Metric as DbMetric, ListRow as DbListRow, OmrOption as DbOmrOption, EmptyState as DbEmptyState, Skeleton as DbSkeleton,
} from '@/dropper';
import { Define, DEFS, type DefTerm } from './define';

const defText = (term?: DefTerm, text?: string) => text ?? (term ? DEFS[term] : undefined);

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Container className={className}>{children}</Container>;
}

export const PageHeader = DbPageHeader;

export const Row = DbRow;

export function Section({ title, action, children, id, term, text, className }: {
  title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; id?: string; term?: DefTerm; text?: string; className?: string;
}) {
  return <DbSection title={title} hint={defText(term, text)} action={action} id={id} className={className}>{children}</DbSection>;
}

export const cardCls = dbCardCls;

export function Card({ className, children, ...rest }: React.ComponentProps<'div'>) {
  return <DbCard className={className} {...rest}>{children}</DbCard>;
}

export function CardHead({ icon, label, title, term, text, action }: {
  icon?: React.ComponentType<{ className?: string }>; label: React.ReactNode; title?: React.ReactNode; term?: DefTerm; text?: string; action?: React.ReactNode;
}) {
  return <DbCardHead icon={icon} label={label} title={title} hint={defText(term, text)} action={action} />;
}

export function Meta({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('text-meta text-fg-muted', className)}>{children}</span>;
}

export const Chip = DbChip;

const TONE = { neutral: 'neutral', blue: 'info', right: 'success', wrong: 'danger' } as const;
export function Tag({ className, children, tone = 'neutral' }: { className?: string; children: React.ReactNode; tone?: keyof typeof TONE }) {
  return <DbTag tone={TONE[tone]} className={className}>{children}</DbTag>;
}

export const Ring = DbRing;
export const RingStat = DbRingStat;
export const Bar = DbBar;

export function Metric({ icon, label, term, text, value, children, className }: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; term?: DefTerm; text?: string;
  value: React.ReactNode; children?: React.ReactNode; className?: string;
}) {
  return <DbMetric icon={icon} label={label} hint={defText(term, text)} value={value} className={className}>{children}</DbMetric>;
}

export function ListRow({ className, children, ...rest }: React.ComponentProps<'div'>) {
  return <DbListRow interactive className={className} {...rest}>{children}</DbListRow>;
}

export const OmrOption = DbOmrOption;
export const EmptyState = DbEmptyState;
export const Skeleton = DbSkeleton;

export { Define };
