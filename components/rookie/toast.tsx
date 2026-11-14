'use client';
import * as React from 'react';
import { Toaster as Sonner, toast } from 'sonner';
import { useIsDark } from './theme';

/** Mounted once in the app shell. */
export function Toaster() {
  const dark = useIsDark();
  return (
    <Sonner
      theme={dark ? 'dark' : 'light'}
      position="top-center"
      toastOptions={{
        classNames: {
          toast: '!rounded-control !font-sans !text-body-sm !bg-popover !text-popover-foreground !ring-1 !ring-border !border-0',
        },
      }}
    />
  );
}

/**
 * Use instead of alert(). Same messages, same moments — just not a browser dialog.
 *   notify('Saved') · notify.success(...) · notify.error(...) · notify.coin('+12 coins')
 */
export const notify = Object.assign((msg: string) => toast(msg), {
  success: (msg: string) => toast.success(msg),
  error: (msg: string) => toast.error(msg),
  info: (msg: string) => toast(msg),
  coin: (msg: string) => toast(msg, { icon: '🪙' }),
});
