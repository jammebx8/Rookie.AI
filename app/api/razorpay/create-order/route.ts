// app/api/razorpay/create-order/route.ts
// Server-side proxy: authenticates the user, then asks the FastAPI backend
// to create a Razorpay order. The user_id is NEVER taken from the request
// body — it is read from the Supabase session token.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BACKEND = 'https://rookie-backend.vercel.app'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rzcizwacjexolkjjczbt.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_service_role_key',
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function getUserFromToken(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.replace('Bearer ', '').trim()
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user ?? null
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── Check if phone number exists for the user in Supabase users table ───
    let userPhone: string | null = null
    try {
      const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('phone')
        .eq('id', user.id)
        .maybeSingle()
      if (dbUser?.phone && typeof dbUser.phone === 'string' && dbUser.phone.trim().length > 0) {
        userPhone = dbUser.phone.trim()
      } else if (user.phone && typeof user.phone === 'string' && user.phone.trim().length > 0) {
        userPhone = user.phone.trim()
      }
    } catch (e) {
      console.warn('[create-order] error checking user phone in users table:', e)
    }

    const body = await req.json().catch(() => ({}))
    const plan_id = body.plan_id ?? 'rookie_pass_yearly'

    // ── Dynamic price resolution for rookie_pass_yearly ─────────────────────
    let custom_price_paise: number | undefined

    if (plan_id === 'rookie_pass_yearly') {
      const now = new Date()

      // 1. Check user app_metadata custom sale
      const appMetaSale = (user.app_metadata as Record<string, unknown> | undefined)?.custom_sale as
        | { is_active?: boolean; expires_at: string; custom_price_paise: number }
        | undefined
      if (
        appMetaSale &&
        appMetaSale.is_active !== false &&
        new Date(appMetaSale.expires_at) > now &&
        Number(appMetaSale.custom_price_paise) > 0
      ) {
        custom_price_paise = Number(appMetaSale.custom_price_paise)
      }

      // 2. Check user_custom_sales table in Supabase
      if (!custom_price_paise) {
        try {
          const { data: sales } = await supabaseAdmin
            .from('user_custom_sales')
            .select('custom_price_paise, expires_at, is_active')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .gt('expires_at', now.toISOString())
            .order('created_at', { ascending: false })
            .limit(1)

          if (sales && sales.length > 0 && sales[0].custom_price_paise) {
            custom_price_paise = Number(sales[0].custom_price_paise)
          }
        } catch {
          // table might not exist yet, app_metadata already checked
        }
      }

      // 3. Standard price ₹399 (39900 paise)
      if (!custom_price_paise) {
        custom_price_paise = 39900
      }
    }

    const res = await fetch(`${BACKEND}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id,
        user_id: user.id,
        email: user.email,
        custom_price_paise,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[create-order] backend error:', text)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({
      ...data,
      phone: userPhone || undefined,
    })
  } catch (err) {
    console.error('[create-order] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
