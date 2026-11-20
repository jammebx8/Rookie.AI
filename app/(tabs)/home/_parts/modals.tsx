'use client';
import React, { useState } from 'react';
import { ArrowRight, BookOpen, Check, Loader2, UserRound, Smartphone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Chip, Meta } from '@/components/rookie/ui';
import { saveSurvey, ALL_SURVEY_CHAPTERS } from '../../../../lib/adaptivePractice';
import { CLASS_OPTIONS, EXAM_OPTIONS } from './constants';

const dialogCls = 'gap-0 rounded-card bg-card p-0 sm:max-w-md';
const labelCls = 'mb-2 block text-meta font-semibold uppercase tracking-[0.06em] text-muted-foreground';

/* ── Profile completion (class + exam) ── */
export function ProfileModal({ open, cl, setcl, exam, setExam, saving, onSave, onSkip }: {
  open: boolean; cl: string; setcl: (v: string) => void; exam: string; setExam: (v: string) => void;
  saving: boolean; onSave: () => void; onSkip: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onSkip(); }} disablePointerDismissal>
      <DialogContent className={dialogCls} showCloseButton={false}>
        <div className="p-6">
          <DialogHeader className="gap-1">
            <span className="flex items-center gap-2 text-muted-foreground"><UserRound className="size-[18px]" /></span>
            <DialogTitle className="text-heading font-semibold tracking-[-0.02em] text-foreground">Complete your profile</DialogTitle>
            <DialogDescription className="text-body-sm">Two quick details so we can set things up for you.</DialogDescription>
          </DialogHeader>

          <span className={`${labelCls} mt-6`}>Class</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Class">
            {CLASS_OPTIONS.map((g) => (
              <Chip key={g} active={cl === g} onClick={() => setcl(g)} className="h-9 px-4">{g}</Chip>
            ))}
          </div>

          <span className={`${labelCls} mt-5`}>Target exam</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Target exam">
            {EXAM_OPTIONS.map((e) => (
              <Chip key={e} active={exam === e} onClick={() => setExam(e)} className="h-9 px-4">{e}</Chip>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 rounded-b-[16px] bg-muted px-6 py-4">
          <Button variant="ghost" className="h-10 rounded-control px-4" onClick={onSkip}>Skip</Button>
          <Button className="h-10 rounded-control px-5" onClick={onSave} disabled={saving}>
            {saving ? <><Loader2 className="animate-spin" /> Saving…</> : <>Continue <ArrowRight /></>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Chapter survey (home page version, same logic as PracticeClient) ── */
export function HomeSurveyModal({ open, userId, onDone }: {
  open: boolean; userId: string | null; onDone: () => void
}) {
  const subjects = ['physics', 'chemistry', 'maths'] as const
  const [activeSubject, setActiveSubject] = useState<string>('physics')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const subjectLabel: Record<string, string> = { physics: 'Physics', chemistry: 'Chemistry', maths: 'Maths' }
  const chaptersForSubject = ALL_SURVEY_CHAPTERS.filter(c => c.subject === activeSubject)

  const toggle = (ch: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(ch)) { n.delete(ch) } else { n.add(ch) } return n })
  }

  const handleSave = async () => {
    setSaving(true)
    await saveSurvey(userId, [...selected])
    setSaving(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDone(); }} disablePointerDismissal>
      <DialogContent className={`${dialogCls} flex max-h-[88vh] flex-col overflow-hidden`} showCloseButton={false}>
        <div className="p-6 pb-4">
          <DialogHeader className="gap-1">
            <span className="flex items-center gap-2 text-muted-foreground"><BookOpen className="size-[18px]" /></span>
            <DialogTitle className="text-heading font-semibold tracking-[-0.02em] text-foreground">Chapters you’ve studied</DialogTitle>
            <DialogDescription className="text-body-sm">Pick what you’ve covered. We’ll focus your practice there.</DialogDescription>
          </DialogHeader>

          <span className={`${labelCls} mt-5`}>Subject</span>
          <div className="flex flex-wrap gap-2" role="tablist">
            {subjects.map(s => (
              <Chip key={s} active={activeSubject === s} onClick={() => setActiveSubject(s)} className="h-9 px-4">{subjectLabel[s]}</Chip>
            ))}
          </div>
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-4">
          <span className={labelCls}>Chapters</span>
          <div className="grid grid-cols-2 gap-2">
            {chaptersForSubject.map(c => {
              const active = selected.has(c.chapter)
              return (
                <Chip key={c.chapter} active={active} onClick={() => toggle(c.chapter)}
                  className="h-auto min-h-9 justify-start py-2 text-left text-meta leading-tight">
                  <span className={`grid size-4 shrink-0 place-items-center rounded-full border-[1.5px] transition ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50'}`}>
                    {active && <Check className="size-2.5" strokeWidth={3.5} />}
                  </span>
                  <span className="flex-1">{c.chapter}</span>
                </Chip>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-b-[16px] bg-muted px-6 py-4">
          <Meta>{selected.size} chapter{selected.size !== 1 ? 's' : ''} selected</Meta>
          <Button variant="ghost" className="ml-auto h-10 rounded-control px-4" onClick={onDone}>Skip</Button>
          <Button className="h-10 rounded-control px-5" onClick={handleSave} disabled={saving || selected.size === 0}>
            {saving ? <><Loader2 className="animate-spin" /> Saving</> : <>Save <ArrowRight /></>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Required Phone Number Modal (Dropper design system) ── */
export function PhoneRequiredModal({
  open,
  userId,
  onSuccess,
}: {
  open: boolean;
  userId: string;
  onSuccess: (phone: string) => void;
}) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const cleanPhone = phone.replace(/\D/g, '');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { supabase } = await import('../../../../public/src/utils/supabase');
      const { error: dbError } = await supabase
        .from('users')
        .update({ phone: cleanPhone })
        .eq('id', userId);

      if (dbError) {
        // If column error or schema error, log and continue safely
        console.warn('Phone update warning:', dbError.message);
      }

      // Update local cache
      try {
        const cached = localStorage.getItem('@user');
        if (cached) {
          const parsed = JSON.parse(cached);
          localStorage.setItem('@user', JSON.stringify({ ...parsed, phone: cleanPhone }));
        }
      } catch {}

      onSuccess(cleanPhone);
    } catch (err: any) {
      setError(err?.message || 'Failed to save phone number. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {/* mandatory modal: cannot dismiss without submitting */}} disablePointerDismissal>
      <DialogContent className={dialogCls} showCloseButton={false}>
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6">
            <DialogHeader className="gap-1.5">
              <div className="flex size-10 items-center justify-center rounded-control bg-primary/10 text-primary">
                <Smartphone className="size-5" />
              </div>
              <DialogTitle className="mt-2 text-heading font-bold tracking-[-0.02em] text-foreground">
                Enter your mobile number
              </DialogTitle>
              <DialogDescription className="text-body-sm leading-relaxed text-muted-foreground">
                You’ve completed your first practice questions! Add your mobile number to keep your progress, streak, and rank safe.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6">
              <label className={labelCls} htmlFor="rookie-phone-input">
                Mobile Number
              </label>
              <div className="flex rounded-control border border-input bg-card shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary">
                <span className="flex items-center border-r border-input bg-muted/50 px-3.5 text-body-sm font-medium text-foreground">
                  +91
                </span>
                <input
                  id="rookie-phone-input"
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setPhone(digits);
                    if (error) setError('');
                  }}
                  placeholder="98765 43210"
                  className="w-full bg-transparent px-3 py-2 text-body text-foreground outline-none placeholder:text-muted-foreground/50"
                  autoFocus
                />
              </div>

              {error && (
                <p className="mt-1.5 text-meta text-destructive font-medium">
                  {error}
                </p>
              )}

              <div className="mt-4 flex items-center gap-1.5 text-meta text-muted-foreground">
                <ShieldCheck className="size-4 shrink-0 text-primary" />
                <span>No OTP required. We will never spam or share your number.</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 rounded-b-[16px] bg-muted px-6 py-4">
            <Button
              type="submit"
              className="h-10 w-full rounded-control px-5 font-semibold shadow-sm sm:w-auto"
              disabled={saving || cleanPhone.length !== 10}
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  Continue to Rookie <ArrowRight />
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
