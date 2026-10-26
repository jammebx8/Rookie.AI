// app/api/razorpay/create-order/route.ts
// Server-side proxy: authenticates the user, then asks the FastAPI backend
// to create a Razorpay order. The user_id is NEVER taken from the request
// body — it is read from the Supabase session token.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BACKEND = 'https://rookie-backend.vercel.app'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

    const body = await req.json().catch(() => ({}))
    const plan_id = body.plan_id ?? 'rookie_pass_yearly'

    const res = await fetch(`${BACKEND}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id, user_id: user.id, email: user.email }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[create-order] backend error:', text)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[create-order] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
