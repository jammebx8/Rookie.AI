'use client';
import React, { useState } from 'react';
import { ArrowRight, BookOpen, Check, Loader2, UserRound } from 'lucide-react';
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
