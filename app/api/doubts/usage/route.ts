import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (token) {
    try {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user?.id) return user.id;
    } catch {
      // ignore
    }
  }
  const url = new URL(req.url);
  const paramId = url.searchParams.get('userId');
  return paramId || null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    if (!userId) {
      return NextResponse.json({
        isPaid: false,
        isGuest: true,
        used: 0,
        remaining: 3,
        allowed: true,
      });
    }

    // 1. Verify active paid entitlement directly from Supabase DB
    const { data: entitlement } = await supabaseAdmin
      .from('entitlements')
      .select('access_until')
      .eq('user_id', userId)
      .eq('plan_id', 'rookie_pass_yearly')
      .gt('access_until', new Date().toISOString())
      .maybeSingle();

    if (entitlement) {
      return NextResponse.json({
        isPaid: true,
        isGuest: false,
        used: 0,
        remaining: null, // unlimited
        allowed: true,
        access_until: entitlement.access_until,
      });
    }

    // 2. Free user: count doubts asked today directly in Supabase analytics_events
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', userId)
      .eq('event_name', 'doubt_asked')
      .gte('ts', today.toISOString());

    const used = count ?? 0;
    const remaining = Math.max(0, 3 - used);
    const allowed = remaining > 0;

    return NextResponse.json({
      isPaid: false,
      isGuest: false,
      used,
      remaining,
      allowed,
    });
  } catch (err) {
    console.error('[doubts/usage] Error verifying doubt quota from Supabase:', err);
    return NextResponse.json(
      { error: 'Failed to verify quota from database' },
      { status: 500 }
    );
  }
}
