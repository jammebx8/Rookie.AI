'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Popover } from '@base-ui/react/popover';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Flame, Share2, Target, Trophy, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Bar, Chip, ListRow, Meta, Tag } from '@/components/rookie/ui';
import { Define, type DefTerm } from '@/components/rookie/define';
import { cn } from '@/lib/utils';
import { DAILY_GOAL_OPTIONS, DAYS, getDayOfWeek } from './constants';
import type { StreakData } from './hooks';

/** Metric card with an action slot (the shared `Metric` has none). Same look as `Metric`. */
function MetricCard({ icon: Icon, label, term, text, value, action, children }: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; term?: DefTerm; text?: string;
  value: React.ReactNode; action?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[164px] flex-col rounded-card bg-card p-6 ring-1 ring-black/[.05] transition duration-300 hover:-translate-y-0.5 hover:ring-black/[.10] hover:shadow-[0_10px_30px_-18px_rgba(46,46,46,.28)] dark:ring-white/[.06] dark:hover:ring-white/[.12]">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-label font-medium text-muted-foreground">
          <Icon className="size-[15px]" strokeWidth={2} /> <Define term={term} text={text}>{label}</Define>
        </span>
        {action && <span className="-my-1.5 -mr-2 flex items-center">{action}</span>}
      </div>
      <div className="mt-3 text-value font-bold leading-none tracking-[-0.045em] tabular-nums text-foreground">{value}</div>
      <div className="mt-auto pt-4">{children}</div>
    </div>
  );
}

const unit = (s: string) => <span className="ml-1 text-body font-semibold tracking-normal text-muted-foreground">{s}</span>;

/* ── Monthly calendar (logic unchanged; restyled: neutral, blue for active days) ── */
function MonthlyCalendar({ activeDays }: { activeDays: string[] }) {
  const [viewDate, setViewDate] = useState(new Date());
  const today = new Date();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('default', { month: 'long' });

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { day: number; current: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - daysInMonth - firstDay + 1, current: false });
  }

  const isActive = (day: number) => {
    const key = `${year}-${month + 1}-${day}`;
    return activeDays.includes(key);
  };

  const isToday = (day: number) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  return (
    <div className="rounded-card bg-muted p-4">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" className="rounded-control" aria-label="Previous month"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}>
          <ChevronLeft />
        </Button>
        <span className="text-body font-semibold text-foreground">{monthName} {year}</span>
        <Button variant="ghost" size="icon-sm" className="rounded-control" aria-label="Next month"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}>
          <ChevronRight />
        </Button>
      </div>

      <div className="mb-2 grid grid-cols-7">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-caption font-medium text-muted-foreground">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1.5">
        {cells.map((cell, i) => {
          const active = cell.current && isActive(cell.day);
          const tod = cell.current && isToday(cell.day);
          return (
            <div key={i} className="flex items-center justify-center">
              <div className={cn(
                'grid size-8 place-items-center rounded-full text-meta font-medium tabular-nums transition',
                !cell.current && 'text-muted-foreground/40',
                cell.current && !active && 'text-foreground',
                active && 'bg-primary text-primary-foreground',
                tod && 'ring-2 ring-primary ring-offset-2 ring-offset-muted',
              )}>
                {cell.day}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Streak ── */
export function StreakMetric({ streakData }: { streakData: StreakData }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [copied, setCopied] = useState(false);
  const todayIndex = getDayOfWeek();

  const handleShare = async () => {
    const text = `🔥 I'm on a ${streakData.current}-day streak on Rookie! Join me at https://rookie-ai.vercel.app`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  return (
    <>
      <MetricCard icon={Flame} label="Streak" term="streak"
        value={<>{streakData.current}{unit(`day${streakData.current !== 1 ? 's' : ''}`)}</>}
        action={
          <>
            <Button variant="ghost" size="icon-sm" className="rounded-control text-muted-foreground" onClick={() => setShowCalendar(true)}
              aria-label="View monthly streak" title="View monthly streak">
              <CalendarDays />
            </Button>
            <Button variant="ghost" size="icon-sm" className="rounded-control text-muted-foreground" onClick={handleShare}
              aria-label={copied ? 'Copied!' : 'Share streak'} title={copied ? 'Copied!' : 'Share streak'}>
              {copied ? <Check className="text-[var(--rk-mint-600)]" /> : <Share2 />}
            </Button>
          </>
        }>
        <div className="flex gap-1.5" aria-label="This week">
          {DAYS.map((day, i) => {
            // Calculate actual calendar date for this dot (Mon=0 ... Sun=6)
            const today = new Date();
            const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1; // Mon=0
            const diff = i - todayDow;
            const dotDate = new Date(today);
            dotDate.setDate(today.getDate() + diff);
            const dotKey = `${dotDate.getFullYear()}-${dotDate.getMonth() + 1}-${dotDate.getDate()}`;
            const isActive = streakData.activeDays.includes(dotKey);
            const isCurrent = i === todayIndex;
            return (
              <span key={i} className={cn(
                'grid size-[22px] place-items-center rounded-full text-[10px] font-semibold',
                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                isCurrent && !isActive && 'text-primary ring-1 ring-primary',
              )}>{day}</span>
            );
          })}
        </div>
      </MetricCard>

      <Sheet open={showCalendar} onOpenChange={setShowCalendar}>
        <SheetContent className="w-full gap-0 sm:max-w-md">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-title"><Define term="streak">Monthly streak</Define></SheetTitle>
            <SheetDescription>Blue days are days you practised.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-4 pb-6">
            <MonthlyCalendar activeDays={streakData.activeDays} />
            <ListRow className="justify-between">
              <span className="flex items-center gap-2 text-body-sm font-medium text-muted-foreground"><Flame className="size-4" /> Current streak</span>
              <span className="text-body font-semibold tabular-nums text-foreground">{streakData.current} day{streakData.current !== 1 ? 's' : ''}</span>
            </ListRow>
            <ListRow className="justify-between">
              <span className="flex items-center gap-2 text-body-sm font-medium text-muted-foreground"><Trophy className="size-4" /> Longest streak</span>
              <span className="text-body font-semibold tabular-nums text-foreground">{streakData.longest} day{streakData.longest !== 1 ? 's' : ''}</span>
            </ListRow>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ── Today vs daily goal (goal picker logic unchanged; now a small popover) ── */
export function TodayMetric({ goal, solved, pct, persistGoal }: {
  goal: number | null; solved: number; pct: number; persistGoal: (g: number) => void;
}) {
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customError, setCustomError] = useState('');

  const saveGoal = (g: number) => {
    persistGoal(g);
    setShowGoalPicker(false);
    setCustomInput('');
    setCustomError('');
  };

  const handleCustomSubmit = () => {
    const val = parseInt(customInput, 10);
    if (isNaN(val) || val < 1) { setCustomError('Enter a number ≥ 1'); return; }
    if (val > 500) { setCustomError('Max 500 questions'); return; }
    saveGoal(val);
  };

  const isCustomGoal = goal !== null && !DAILY_GOAL_OPTIONS.includes(goal);

  const picker = (
    <Popover.Root open={showGoalPicker} onOpenChange={(o) => { setShowGoalPicker(o); setCustomError(''); }}>
      <Popover.Trigger render={<Button variant="ghost" size="sm" className="rounded-control text-muted-foreground" />}>
        {goal ? 'Change' : 'Set goal'} <ChevronDown className={cn('transition-transform', showGoalPicker && 'rotate-180')} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="end" className="z-50">
          <Popover.Popup className="w-[260px] rounded-card bg-popover p-4 text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 transition-opacity duration-150">
            <p className="text-meta font-medium text-muted-foreground"><Define term="dailyGoal">Questions per day</Define></p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {DAILY_GOAL_OPTIONS.map((g) => (
                <Chip key={g} active={goal === g} onClick={() => saveGoal(g)}>{g} Qs</Chip>
              ))}
            </div>
            <p className="mt-4 text-meta font-medium text-muted-foreground">Custom goal</p>
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="number" min={1} max={500} placeholder="e.g. 15"
                value={customInput}
                onChange={(e) => { setCustomInput(e.target.value); setCustomError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSubmit(); }}
                className="h-8 flex-1 rounded-control"
              />
              <Button size="sm" className="h-8 rounded-control px-3" onClick={handleCustomSubmit}>Set</Button>
            </div>
            {customError && <p className="mt-1.5 text-caption font-medium text-[#d9473a]">{customError}</p>}
            {isCustomGoal && <p className="mt-1.5 text-caption text-muted-foreground">Current custom goal: {goal} Qs</p>}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );

  return (
    <MetricCard icon={Target} label="Today" term="today" action={picker}
      value={goal ? <>{solved}<span className="text-body font-semibold tracking-normal text-muted-foreground"> / {goal}</span></> : <>{solved}{unit('solved')}</>}>
      {goal ? (
        <>
          <Bar value={pct} />
          <div className="mt-2.5 flex items-center justify-between">
            {pct >= 100
              ? <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}><Tag tone="right"><Check className="size-3" strokeWidth={3} /> Daily goal complete</Tag></motion.span>
              : <Meta>{pct}% of today’s target</Meta>}
          </div>
        </>
      ) : (
        <Meta>Set a daily goal to track progress.</Meta>
      )}
    </MetricCard>
  );
}

/* ── Longest streak ── */
export function LongestMetric({ longest }: { longest: number }) {
  return (
    <MetricCard icon={Trophy} label="Longest streak" text="Your best run of days in a row with at least one question solved."
      value={<>{longest}{unit(`day${longest !== 1 ? 's' : ''}`)}</>}>
      <Meta>Your best run so far</Meta>
    </MetricCard>
  );
}

/* ── Active days this month (count of the same activeDays the calendar shows) ── */
export function MonthDaysMetric({ activeDays }: { activeDays: string[] }) {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${now.getMonth() + 1}-`;
  const count = activeDays.filter((k) => k.startsWith(prefix)).length;
  const sofar = now.getDate();
  return (
    <MetricCard icon={CalendarCheck} label="This month" text="Days this month on which you solved at least one question."
      value={<>{count}{unit(`day${count !== 1 ? 's' : ''}`)}</>}>
      <Bar value={(count / sofar) * 100} />
      <Meta className="mt-2.5 block">Active on {count} of {sofar} days</Meta>
    </MetricCard>
  );
}
