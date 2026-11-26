'use client';

import React, { useState } from 'react';
import { ArrowRight, Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/public/src/utils/supabase';

const dialogCls = 'z-[101] gap-0 rounded-card bg-card p-0 sm:max-w-md';
const labelCls = 'mb-2 block text-meta font-semibold uppercase tracking-[0.06em] text-muted-foreground';

/**
 * Mandatory phone collection modal.
 * Cannot be minimized or dismissed without submitting and verifying persistence in Supabase.
 */
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
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      const targetUserId = authUser?.id || userId;
      if (authError || !targetUserId) {
        throw new Error('Unable to verify your session. Please sign in again.');
      }

      const { data: updatedRow, error: dbError } = await supabase
        .from('users')
        .update({ phone: cleanPhone })
        .eq('id', targetUserId)
        .select('id, phone')
        .maybeSingle();

      if (dbError) {
        throw new Error(dbError.message || 'Failed to save phone number to database.');
      }

      let persistedPhone = updatedRow?.phone ?? null;

      if (persistedPhone !== cleanPhone) {
        // Re-check directly in Supabase in case update matched 0 rows
        const { data: existingRow, error: checkError } = await supabase
          .from('users')
          .select('id, phone')
          .eq('id', targetUserId)
          .maybeSingle();

        if (checkError) {
          throw new Error(checkError.message || 'Failed to verify phone number in database.');
        }

        if (!existingRow) {
          if (!authUser) {
            throw new Error('User profile not found in database. Please sign in again.');
          }
          const { data: insertedRow, error: upsertError } = await supabase
            .from('users')
            .upsert(
              {
                id: targetUserId,
                email: authUser.email ?? null,
                name:
                  authUser.user_metadata?.full_name ||
                  authUser.user_metadata?.name ||
                  authUser.email?.split('@')[0] ||
                  '',
                avatar_url:
                  authUser.user_metadata?.avatar_url ||
                  authUser.user_metadata?.picture ||
                  null,
                phone: cleanPhone,
              },
              { onConflict: 'id' }
            )
            .select('id, phone')
            .single();

          if (upsertError) {
            throw new Error(upsertError.message || 'Failed to save phone number to database.');
          }
          persistedPhone = insertedRow?.phone ?? null;
        } else {
          persistedPhone = existingRow.phone ?? null;
        }
      }

      if (persistedPhone !== cleanPhone) {
        throw new Error('Phone number could not be verified in the database. Please try again.');
      }

      // Sync local cache only after Supabase persistence is verified
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
    <Dialog
      open={open}
      onOpenChange={() => {
        /* mandatory modal: cannot dismiss or minimize without submitting */
      }}
      disablePointerDismissal
    >
      <DialogContent
        className={dialogCls}
        overlayClassName="z-[100] bg-black/50 backdrop-blur-sm"
        showCloseButton={false}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
          }
        }}
      >
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
                  inputMode="numeric"
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
                <p className="mt-1.5 text-meta text-destructive font-medium" role="alert">
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
