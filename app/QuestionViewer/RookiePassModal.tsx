'use client'

import React, { useState } from 'react'
import { ArrowRight, Check, Loader2, ShieldCheck } from 'lucide-react'
import { triggerCheckout, bustPassCache, checkUserPaidDirectFromDB } from '../../lib/rookiePass'
import { supabase } from '../../public/src/utils/supabase'
import { sale, saleMoney, salePerMonth } from '@/lib/sale'
import { Define } from '@/components/rookie/define'
import { FlipCountdown, OffTag, PASS_BG, STARS } from '@/components/rookie/sale'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { ToastType } from './QuestionViewerClient'

interface RookiePassModalProps {
  isOpen: boolean
  onClose: () => void
  isDark: boolean
  onSuccess: () => void
  addToast: (msg: string, type?: ToastType, dur?: number) => void
  limit?: number
}

export default function RookiePassModal({
  isOpen,
  onClose,
  isDark,
  onSuccess,
  addToast,
  limit = 3,
}: RookiePassModalProps) {
  const [loading, setLoading] = useState(false)

  const handlePurchase = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        addToast('Please sign in to purchase Rookie Pass.', 'warning')
        setLoading(false)
        return
      }

      const raw = typeof window !== 'undefined' ? localStorage.getItem('@user') : null
      const user = raw ? JSON.parse(raw) : null

      await triggerCheckout({
        token: session.access_token,
        userId: session.user.id,
        email: session.user.email,
        name: user?.name ?? null,
        onSuccess: async () => {
          bustPassCache(session.user.id)
          // Direct check from database to ensure status is confirmed in Postgres
          await checkUserPaidDirectFromDB(session.user.id)
          setLoading(false)
          onSuccess()
          onClose()
          addToast('🎉 Rookie Pass activated! Unlimited questions unlocked.', 'coin', 4000)
        },
        onError: (msg: string) => {
          setLoading(false)
          addToast(msg, 'error', 4000)
        },
        onDismiss: () => {
          setLoading(false)
        },
      })
    } catch (err: unknown) {
      setLoading(false)
      const message = err instanceof Error ? err.message : 'Payment initialization failed.'
      addToast(message, 'error')
    }
  }

  // Same look as <PassPitch>/<PassCard>, but the Buy button runs this modal's own
  // checkout (handlePurchase) so toasts, onSuccess and onClose behave exactly as before.
  return (
    // While checkout runs, drop the focus trap so Razorpay's iframe can take input, and don't auto-dismiss.
    <Dialog open={isOpen} modal={!loading} disablePointerDismissal={loading} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-card bg-card p-0 sm:max-w-[440px]">
        <div className="px-6 pt-6 pb-4 pr-12">
          <DialogTitle className="text-title font-semibold tracking-[-0.015em] text-foreground">
            You&apos;ve hit today&apos;s free limit
          </DialogTitle>
          <DialogDescription className="mt-1 text-body-sm text-muted-foreground">
            <Define term="solutionsLeft">{limit} free solutions</Define> a day. Get Rookie Pass to keep solving.
          </DialogDescription>
        </div>

        <div className="px-6">
          <div className="relative flex flex-col overflow-hidden rounded-card p-6 text-white" style={{ background: PASS_BG }}>
            <span className="pointer-events-none absolute inset-0 opacity-50" aria-hidden style={{ backgroundImage: STARS }} />
            <div className="relative flex items-center justify-between">
              <span className="flex items-center gap-2 text-body-sm font-semibold">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/rookie-owl.png" alt="" className="size-6 rounded-full" /> Rookie Pass
                <Define term="yearly" className="rounded-tag bg-white/12 px-1.5 py-0.5 text-caption font-semibold text-white/85">Yearly</Define>
              </span>
              <OffTag />
            </div>
            <div className="relative mt-6 flex items-baseline gap-2">
              <span className="text-display font-bold leading-none tracking-[-0.05em]">{saleMoney(sale.price)}</span>
              <span className="text-body font-medium text-white/50 line-through decoration-2">{saleMoney(sale.original)}</span>
              <span className="text-label text-white/60">/ {sale.per}</span>
            </div>
            <p className="relative mt-2 text-body-sm text-white/75">One payment for 12 months. Just ₹{salePerMonth} a month.</p>
            <ul className="relative mt-5 flex flex-col gap-2.5">
              {sale.perks.map(p => (
                <li key={p} className="flex items-center gap-2 text-body-sm text-white/90"><Check className="size-4 text-[#ffd84d]" strokeWidth={2.5} />{p}</li>
              ))}
            </ul>
            <div className="relative mt-6 mb-3 flex flex-wrap items-center justify-between gap-2">
              <Define term="timer" className="text-meta font-medium text-white/70">Price goes up in</Define>
              <FlipCountdown tile="bg-white/12 text-white" />
            </div>
            <button type="button" onClick={handlePurchase} disabled={loading}
              className="relative inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-white text-body font-semibold text-[#14295f] transition hover:bg-white/90 active:translate-y-px disabled:opacity-80">
              {loading
                ? <><Loader2 className="size-4 animate-spin" /> Connecting…</>
                : <>Get 1 year · {saleMoney(sale.price)} <ArrowRight className="size-4" /></>}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4">
          <span className="flex items-center gap-1.5 text-meta text-muted-foreground">
            <ShieldCheck className="size-4" /> Secure checkout by Razorpay
          </span>
          <Button variant="ghost" onClick={onClose} disabled={loading} className="h-9 rounded-control px-3 text-muted-foreground">
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
