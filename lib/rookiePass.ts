/**
 * lib/rookiePass.ts
 * ------------------
 * Client-side utilities for the Rookie Pass payment flow.
 *
 * Public surface:
 *   hasRookiePass(userId?)  — true if the user has an active entitlement in DB
 *   getPassExpiry(userId?)  — returns the ISO expiry string from DB, or null
 *   triggerCheckout(opts)   — opens Razorpay checkout, polls until paid, resolves
 *   bustPassCache(userId?)  — clears pass cache
 */

import { supabase } from '../public/src/utils/supabase'

const PLAN_ID   = 'rookie_pass_yearly'
const CACHE_KEY = 'rookie_pass_cache'   // base sessionStorage key

// ── Types ──────────────────────────────────────────────────────────────────────
interface PassCache {
  user_id:      string
  has_pass:     boolean
  access_until: string | null
  fetched_at:   number   // ms epoch
}

interface CheckoutOptions {
  /** JWT from supabase.auth.getSession() — required for the /create-order route */
  token:    string
  userId:   string
  email?:   string | null
  name?:    string | null
  /** Called when the user closes the modal without paying */
  onDismiss?: () => void
  /** Called when payment is confirmed in DB */
  onSuccess?: (accessUntil: string) => void
  /** Called on unrecoverable error */
  onError?: (msg: string) => void
}

// Declare Razorpay global injected by the CDN script
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (opts: any) => { open(): void }
  }
}

// ── User ID Resolver ───────────────────────────────────────────────────────────
async function resolveUserId(passedId?: string | null): Promise<string | null> {
  if (passedId && typeof passedId === 'string' && passedId.trim().length > 0) {
    return passedId.trim()
  }
  // Primary source of truth: Supabase Auth Session
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* no-op */ }

  // Fallback: local storage @user
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('@user') : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.id) return parsed.id
    }
  } catch { /* no-op */ }

  return null
}

// ── Cache helpers ──────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000   // 5 minutes

function readCache(userId: string): PassCache | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = sessionStorage.getItem(`${CACHE_KEY}_${userId}`)
    if (!raw) return null
    const c: PassCache = JSON.parse(raw)
    if (c.user_id !== userId) return null
    if (Date.now() - c.fetched_at > CACHE_TTL_MS) return null
    return c
  } catch { return null }
}

function writeCache(userId: string, c: PassCache) {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify(c))
    }
  } catch { /* no-op */ }
}

export function bustPassCache(userId?: string) {
  try {
    if (typeof window === 'undefined') return
    if (userId) {
      sessionStorage.removeItem(`${CACHE_KEY}_${userId}`)
    }
    sessionStorage.removeItem(CACHE_KEY)
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith(CACHE_KEY)) {
        sessionStorage.removeItem(key)
      }
    }
  } catch { /* no-op */ }
}

// ── Core check against Supabase DB ─────────────────────────────────────────────
async function _fetchPass(userId: string): Promise<PassCache> {
  try {
    const { data, error } = await supabase
      .from('entitlements')
      .select('access_until')
      .eq('user_id', userId)
      .eq('plan_id', PLAN_ID)
      .gt('access_until', new Date().toISOString())
      .maybeSingle()

    if (error) {
      console.warn('[rookiePass] Database entitlements check warning:', error.message)
    }

    const cache: PassCache = {
      user_id:      userId,
      has_pass:     !!data,
      access_until: data?.access_until ?? null,
      fetched_at:   Date.now(),
    }
    writeCache(userId, cache)
    return cache
  } catch (err) {
    console.error('[rookiePass] Failed to query entitlements DB:', err)
    return {
      user_id:      userId,
      has_pass:     false,
      access_until: null,
      fetched_at:   0,
    }
  }
}

export async function hasRookiePass(userId?: string): Promise<boolean> {
  const uid = await resolveUserId(userId)
  if (!uid) return false

  const cached = readCache(uid)
  if (cached) return cached.has_pass

  const c = await _fetchPass(uid)
  return c.has_pass
}

export async function getPassExpiry(userId?: string): Promise<string | null> {
  const uid = await resolveUserId(userId)
  if (!uid) return null

  const cached = readCache(uid)
  if (cached) return cached.access_until

  const c = await _fetchPass(uid)
  return c.access_until
}

// ── Checkout ───────────────────────────────────────────────────────────────────
/**
 * Full checkout flow:
 *  1. POST /api/razorpay/create-order  → order_id, key_id, amount
 *  2. Open Razorpay modal
 *  3. Poll GET /api/razorpay/status/{order_id} every 2.5 s
 *  4. On paid → bust cache, call onSuccess
 */
export async function triggerCheckout(opts: CheckoutOptions): Promise<void> {
  const { token, userId, email, name, onDismiss, onSuccess, onError } = opts

  // 1. Create order server-side
  let orderData: { order_id: string; key_id: string; amount: number; currency: string }
  try {
    const res = await fetch('/api/razorpay/create-order', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ plan_id: PLAN_ID }),
    })
    if (!res.ok) throw new Error(await res.text())
    orderData = await res.json()
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    onError?.(`Could not initiate payment. Please try again. (${msg})`)
    return
  }

  // 2. Open Razorpay checkout
  if (typeof window === 'undefined' || !window.Razorpay) {
    onError?.('Razorpay SDK not loaded. Please refresh the page.')
    return
  }

  let pollInterval: ReturnType<typeof setInterval> | null = null
  let pollCount = 0
  const MAX_POLLS = 48   // ~2 min at 2.5 s

  const stopPoll = () => { if (pollInterval) clearInterval(pollInterval) }

  // 3. Polling function
  const startPolling = () => {
    pollInterval = setInterval(async () => {
      pollCount++
      if (pollCount > MAX_POLLS) { stopPoll(); return }

      try {
        const r = await fetch(`/api/razorpay/status/${orderData.order_id}`)
        const d = await r.json()
        if (d.status === 'paid') {
          stopPoll()
          bustPassCache(userId)
          // Re-fetch to get access_until directly from DB
          const expiry = await getPassExpiry(userId)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('rookiePassUpdated'))
          }
          onSuccess?.(expiry ?? '')
        }
      } catch { /* keep polling */ }
    }, 2500)
  }

  const rzp = new window.Razorpay({
    key:         orderData.key_id,
    amount:      orderData.amount,
    currency:    orderData.currency,
    order_id:    orderData.order_id,
    name:        'Rookie.AI',
    description: 'Rookie Pass — JEE Advanced PYQs (1 Year)',
    image:       '/lg.png',
    prefill: {
      email: email ?? '',
      name:  name  ?? '',
    },
    theme: { color: '#6366F1' },
    config: {
      display: {
        // UPI first
        preferences: { show_default_blocks: false },
        blocks: {
          upi:   { name: 'UPI',    instruments: [{ method: 'upi' }] },
          cards: { name: 'Cards',  instruments: [{ method: 'card' }] },
          nb:    { name: 'Net Banking', instruments: [{ method: 'netbanking' }] },
        },
        sequence: ['block.upi', 'block.cards', 'block.nb'],
      },
    },
    handler() {
      // payment.captured fires here — webhook is the source of truth for DB,
      // but we also start polling so the UI updates promptly.
      startPolling()
    },
    modal: {
      ondismiss() {
        stopPoll()
        onDismiss?.()
      },
    },
  })

  rzp.open()
  // Also start polling as a safety net in case handler fires before modal closes
  startPolling()
}
