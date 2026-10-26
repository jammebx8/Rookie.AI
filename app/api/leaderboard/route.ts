import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const examFilter = searchParams.get('exam') || 'All';

    const now = new Date().toISOString();

    // 1. Fetch all active Rookie Pass entitlements from Supabase
    const { data: entitlements, error: entError } = await supabaseAdmin
      .from('entitlements')
      .select('user_id, access_until')
      .eq('plan_id', 'rookie_pass_yearly')
      .gt('access_until', now);

    if (entError) {
      console.warn('[Leaderboard API] Entitlements query warning:', entError.message);
    }

    const paidUserIds = new Set((entitlements || []).map((e: { user_id: string }) => e.user_id));

    // 2. Fetch users ordered by rookieCoinsEarned descending
    let query = supabaseAdmin
      .from('users')
      .select('id, name, email, avatar_url, rookieCoinsEarned, exam')
      .order('rookieCoinsEarned', { ascending: false });

    if (examFilter !== 'All') {
      query = query.eq('exam', examFilter);
    }

    const { data: users, error: userError } = await query;

    if (userError) {
      console.error('[Leaderboard API] Users query error:', userError.message);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // 3. Map sanitized users with verified database isPaid status
    const sanitized = (users || []).map((d: any) => {
      const name = d.name ?? d.email ?? '-';
      return {
        id: d.id,
        name,
        email: d.email ?? null,
        avatar_url: d.avatar_url ?? null,
        rookieCoinsEarned:
          typeof d.rookieCoinsEarned === 'number'
            ? d.rookieCoinsEarned
            : Number(d.rookieCoinsEarned) || 0,
        exam: d.exam ?? null,
        isPaid: paidUserIds.has(d.id),
      };
    });

    // 4. Return all unique exams when requested for 'All'
    let allExams: string[] | undefined = undefined;
    if (examFilter === 'All') {
      const examsSet = new Set<string>();
      sanitized.forEach((u) => {
        if (u.exam) examsSet.add(u.exam);
      });
      allExams = ['All', ...Array.from(examsSet).sort()];
    }

    return NextResponse.json(
      {
        users: sanitized,
        paidCount: paidUserIds.size,
        allExams,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err: any) {
    console.error('[Leaderboard API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
