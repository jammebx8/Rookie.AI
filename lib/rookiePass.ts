/**
 * lib/rookiePass.ts
 * ------------------
 * Client-side utilities for the Rookie Pass payment and access flow.
 *
 * Public surface:
 *   hasRookiePass(userId?, forceDirect?)  — checks if user has active entitlement in DB (with background SWR)
 *   checkUserPaidDirectFromDB(userId?)    — directly queries DB bypassing cache & updates state
 *   getPassExpiry(userId?, forceDirect?)  — returns ISO expiry string from DB or cache, or null
 *   triggerCheckout(opts)                 — opens Razorpay checkout, polls until paid, resolves
 *   bustPassCache(userId?)                — clears local/session pass cache & notifies
 *   notifyPassUpdated(detail?)            — broadcasts pass update to all components and open tabs
 *   subscribeToPassUpdates(userId?)       — realtime subscription on entitlements table
 *   initPassAutoSync(userId?)             — sets up focus, visibility, heartbeat, and cross-tab sync
 */

import { supabase } from '../public/src/utils/supabase'

const PLAN_ID      = 'rookie_pass_yearly'
const CACHE_KEY    = 'rookie_pass_cache'   // base sessionStorage key
const STALE_TTL_MS = 15 * 1000             // 15s stale-while-revalidate threshold

// ── Types ──────────────────────────────────────────────────────────────────────
export interface PassCache {
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
  // Primary fast source: Supabase Auth Session (cached locally in memory/storage)
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) return session.user.id
  } catch { /* no-op */ }

  // Fallback 1: Supabase getUser()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* no-op */ }

  // Fallback 2: local storage @user
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
function readCache(userId: string): PassCache | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = sessionStorage.getItem(`${CACHE_KEY}_${userId}`)
    if (!raw) return null
    const c: PassCache = JSON.parse(raw)
    if (c.user_id !== userId) return null
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

// ── Event Broadcast (Single Tab + Cross-Tab) ───────────────────────────────────
export function notifyPassUpdated(cache?: PassCache, broadcast = true) {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent('rookiePassUpdated', { detail: cache }))
  } catch { /* no-op */ }

  if (!broadcast) return

  try {
    const bc = new BroadcastChannel('rookie_pass_sync')
    bc.postMessage({ type: 'ROOKIE_PASS_UPDATED', cache, timestamp: Date.now() })
    bc.close()
  } catch { /* no-op */ }

  try {
    localStorage.setItem('rookie_pass_sync_ts', String(Date.now()))
  } catch { /* no-op */ }
}

// ── Background In-flight Deduplication ─────────────────────────────────────────
const inFlightRequests = new Map<string, Promise<PassCache>>()

// ── Core check against Supabase DB ─────────────────────────────────────────────
async function _fetchPass(userId: string): Promise<PassCache> {
  if (inFlightRequests.has(userId)) {
    return inFlightRequests.get(userId)!
  }

  const p = (async () => {
    try {
      const { data, error } = await supabase
        .from('entitlements')
        .select('access_until, plan_id')
        .eq('user_id', userId)
        .gt('access_until', new Date().toISOString())
        .limit(1)
        .maybeSingle()

      if (error) {
        console.warn('[rookiePass] Database entitlements check warning:', error.message)
      }

      const has_pass = !!data
      const cache: PassCache = {
        user_id:      userId,
        has_pass,
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
    } finally {
      inFlightRequests.delete(userId)
    }
  })()

  inFlightRequests.set(userId, p)
  return p
}

function _revalidateInBackground(userId: string, cached: PassCache) {
  _fetchPass(userId).then((fresh) => {
    if (cached.has_pass !== fresh.has_pass || cached.access_until !== fresh.access_until) {
      notifyPassUpdated(fresh)
    }
  }).catch(() => {})
}

/**
 * Directly queries the database to check if the user has an active Rookie Pass.
 * Bypasses client-side sessionStorage cache completely, updates cache, and triggers UI updates if changed.
 */
export async function checkUserPaidDirectFromDB(userId?: string): Promise<boolean> {
  const uid = await resolveUserId(userId)
  if (!uid) return false

  const prev = readCache(uid)
  const c = await _fetchPass(uid)
  if (!prev || prev.has_pass !== c.has_pass || prev.access_until !== c.access_until) {
    notifyPassUpdated(c)
  }
  return c.has_pass
}

export async function hasRookiePass(userId?: string, forceDirect = false): Promise<boolean> {
  const uid = await resolveUserId(userId)
  if (!uid) return false

  if (!forceDirect) {
    const cached = readCache(uid)
    if (cached) {
      // If stale (> 15s), revalidate in background without blocking current call
      if (Date.now() - cached.fetched_at > STALE_TTL_MS) {
        _revalidateInBackground(uid, cached)
      }
      return cached.has_pass
    }
  }

  const c = await _fetchPass(uid)
  return c.has_pass
}

export async function getPassExpiry(userId?: string, forceDirect = false): Promise<string | null> {
  const uid = await resolveUserId(userId)
  if (!uid) return null

  if (!forceDirect) {
    const cached = readCache(uid)
    if (cached) {
      if (Date.now() - cached.fetched_at > STALE_TTL_MS) {
        _revalidateInBackground(uid, cached)
      }
      return cached.access_until
    }
  }

  const c = await _fetchPass(uid)
  return c.access_until
}

// ── Supabase Realtime Subscription ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let realtimeChannel: any = null

export function subscribeToPassUpdates(userId?: string): () => void {
  if (typeof window === 'undefined') return () => {}

  let active = true
  resolveUserId(userId).then((uid) => {
    if (!active || !uid) return

    if (realtimeChannel) {
      try { supabase.removeChannel(realtimeChannel) } catch {}
      realtimeChannel = null
    }

    try {
      realtimeChannel = supabase
        .channel(`rookie-entitlements-live-${uid}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'entitlements',
            filter: `user_id=eq.${uid}`,
          },
          async (payload: unknown) => {
            console.log('[rookiePass] Realtime entitlement update received:', payload)
            bustPassCache(uid)
            const fresh = await _fetchPass(uid)
            notifyPassUpdated(fresh)
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('[rookiePass] Realtime entitlements channel active for user', uid)
          }
        })
    } catch (err) {
      console.warn('[rookiePass] Could not subscribe to Realtime entitlements:', err)
    }
  })

  return () => {
    active = false
    if (realtimeChannel) {
      try { supabase.removeChannel(realtimeChannel) } catch {}
      realtimeChannel = null
    }
  }
}

// ── Auto-Sync Heartbeat & Window Focus / Visibility Sync ───────────────────────
let autoSyncActive = false
let autoSyncCleanup: (() => void) | null = null

export function initPassAutoSync(userId?: string): () => void {
  if (typeof window === 'undefined') return () => {}
  if (autoSyncActive && autoSyncCleanup) return autoSyncCleanup

  autoSyncActive = true
  let lastCheck = 0

  const revalidate = async (force = false) => {
    const now = Date.now()
    if (!force && now - lastCheck < 10000) return // Throttle
    lastCheck = now

    const uid = await resolveUserId(userId)
    if (!uid) return

    const prev = readCache(uid)
    const fresh = await _fetchPass(uid)
    // Only fire update event if there was an existing cached state that CHANGED
    if (prev && (prev.has_pass !== fresh.has_pass || prev.access_until !== fresh.access_until)) {
      notifyPassUpdated(fresh)
    }
  }

  // Check on tab focus
  const onFocus = () => { revalidate(true) }
  window.addEventListener('focus', onFocus)

  // Check when tab becomes visible
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      revalidate(true)
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  // Periodic heartbeat check every 20 seconds
  const interval = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      revalidate(false)
    }
  }, 20000)

  // Start Realtime subscription
  const unsubRealtime = subscribeToPassUpdates(userId)

  // Initial check
  revalidate(false)

  autoSyncCleanup = () => {
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    clearInterval(interval)
    unsubRealtime()
    autoSyncActive = false
    autoSyncCleanup = null
  }

  return autoSyncCleanup
}

// ── Global Cross-Tab & Auth State Listeners (in-browser) ───────────────────────
if (typeof window !== 'undefined') {
  try {
    const bc = new BroadcastChannel('rookie_pass_sync')
    bc.onmessage = async (event) => {
      const data = event.data
      if (data?.type === 'ROOKIE_PASS_UPDATED' || data?.type === 'ROOKIE_PASS_CHANGED') {
        bustPassCache(data.userId)
        const uid = await resolveUserId()
        if (uid && (!data.userId || data.userId === uid)) {
          const fresh = await _fetchPass(uid)
          // Pass broadcast = false so we do not echo back onto BroadcastChannel or localStorage
          notifyPassUpdated(fresh, false)
        } else if (data.cache) {
          notifyPassUpdated(data.cache, false)
        }
      }
    }
  } catch { /* BroadcastChannel not supported in environment */ }

  window.addEventListener('storage', async (e) => {
    if (e.key === 'rookie_pass_sync_ts') {
      bustPassCache()
      const uid = await resolveUserId()
      if (uid) {
        const fresh = await _fetchPass(uid)
        // Pass broadcast = false so we do not echo back onto localStorage
        notifyPassUpdated(fresh, false)
      } else {
        notifyPassUpdated(undefined, false)
      }
    }
  })

  try {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        bustPassCache()
        if (session?.user?.id) {
          _fetchPass(session.user.id).then((fresh) => notifyPassUpdated(fresh))
          subscribeToPassUpdates(session.user.id)
        }
      } else if (event === 'SIGNED_OUT') {
        bustPassCache()
        notifyPassUpdated()
      }
    })
  } catch { /* no-op */ }
}

// ── Checkout ───────────────────────────────────────────────────────────────────
/**
 * Full checkout flow:
 *  1. POST /api/razorpay/create-order  → order_id, key_id, amount
 *  2. Open Razorpay modal
 *  3. Poll GET /api/razorpay/status/{order_id} every 2.5 s
 *  4. On paid → bust cache, notify, call onSuccess
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

  // 2. Open Razorpay checkout (ensure script loaded)
  if (typeof window !== 'undefined' && !window.Razorpay) {
    await new Promise<void>((resolve) => {
      const existing = document.querySelector('script[src*="checkout.razorpay.com"]')
      if (existing) {
        existing.addEventListener('load', () => resolve())
        setTimeout(resolve, 2000)
      } else {
        const s = document.createElement('script')
        s.src = 'https://checkout.razorpay.com/v1/checkout.js'
        s.onload = () => resolve()
        s.onerror = () => resolve()
        document.body.appendChild(s)
      }
    })
  }

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
          const expiry = await getPassExpiry(userId, true)
          notifyPassUpdated()
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
    description: 'Rookie Pass — JEE Advanced & Mains Full Access (1 Year)',
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
