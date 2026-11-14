// app/api/razorpay/webhook/route.ts
// Thin proxy: forwards the raw body + signature header to the FastAPI backend.
// The FastAPI backend verifies the HMAC and calls grant_access().
// This route exists so Razorpay can POST to a *.vercel.app domain (Next.js),
// while the actual verification logic stays in one place (FastAPI).

import { NextRequest, NextResponse } from 'next/server'

const BACKEND = 'https://rookie-backend.vercel.app'

export async function POST(req: NextRequest) {
  try {
    const raw = await req.arrayBuffer()
    const sig = req.headers.get('X-Razorpay-Signature') ?? ''

    const res = await fetch(`${BACKEND}/webhooks/razorpay`, {
      method: 'POST',
      headers: {
        'Content-Type':          'application/json',
        'X-Razorpay-Signature':  sig,
      },
      body: raw,
    })

    // Always return 200 to Razorpay — it will retry on non-2xx
    if (!res.ok) {
      const txt = await res.text()
      console.error('[webhook] backend rejected:', txt)
      return NextResponse.json({ ok: false }, { status: 200 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook] unexpected:', err)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
