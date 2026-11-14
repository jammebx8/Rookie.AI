// app/api/razorpay/status/[orderId]/route.ts
// Polls the FastAPI backend for the DB status of a Razorpay order.
// The client polls this every 2-3 s after checkout closes.

import { NextRequest, NextResponse } from 'next/server'

const BACKEND = 'https://rookie-backend.vercel.app'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params
  try {
    const res = await fetch(`${BACKEND}/orders/${orderId}/status`, {
      // 8-second timeout via AbortController
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      return NextResponse.json({ status: 'unknown' }, { status: 200 })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[status] fetch error:', err)
    return NextResponse.json({ status: 'unknown' }, { status: 200 })
  }
}
