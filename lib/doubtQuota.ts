/**
 * lib/doubtQuota.ts
 * ─────────────────
 * Handles usage limits and tracking for the AI Voice Tutor across
 * Snap & Solve (Home) and QuestionViewer.
 *
 * Rules:
 *   • Free users: 3 doubts per day
 *   • Paid users (Rookie Pass): unlimited doubts
 *   • Resets daily at midnight local time
 *   • Tracks analytics events for rookie-dash
 */

import { track } from './analytics';

export const FREE_DAILY_DOUBTS_LIMIT = 3;

export function getTodayKey(userId?: string | null): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
  return userId ? `rookie_doubts_${userId}_${dateStr}` : `rookie_doubts_today_${dateStr}`;
}

export function getDoubtsUsedToday(userId?: string | null): number {
  if (typeof window === 'undefined') return 0;
  try {
    const d = new Date();
    const dateStr = `${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
    const userKey = userId ? `rookie_doubts_${userId}_${dateStr}` : null;
    const globalKey = `rookie_doubts_today_${dateStr}`;

    const userCount = userKey ? parseInt(localStorage.getItem(userKey) || '0', 10) || 0 : 0;
    const globalCount = parseInt(localStorage.getItem(globalKey) || '0', 10) || 0;

    return Math.max(userCount, globalCount);
  } catch {
    return 0;
  }
}

export interface DoubtQuotaStatus {
  allowed: boolean;
  remaining: number;
  used: number;
  isPaid: boolean;
}

export function checkDoubtQuota(
  hasPass: boolean | null | undefined,
  userId?: string | null
): DoubtQuotaStatus {
  const isPaid = hasPass === true;
  if (isPaid) {
    return {
      allowed: true,
      remaining: Infinity,
      used: 0,
      isPaid: true,
    };
  }

  const used = getDoubtsUsedToday(userId);
  const remaining = Math.max(0, FREE_DAILY_DOUBTS_LIMIT - used);

  return {
    allowed: remaining > 0,
    remaining,
    used,
    isPaid: false,
  };
}

/**
 * Syncs and verifies the daily doubt quota directly against Supabase database.
 * Updates local storage cache with verified database values.
 */
export async function syncDoubtQuotaWithServer(
  userId?: string | null
): Promise<DoubtQuotaStatus> {
  if (typeof window === 'undefined') {
    return { allowed: true, remaining: FREE_DAILY_DOUBTS_LIMIT, used: 0, isPaid: false };
  }

  try {
    const params = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await fetch(`/api/doubts/usage${params}`, {
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (data.isPaid) {
        return {
          allowed: true,
          remaining: Infinity,
          used: 0,
          isPaid: true,
        };
      }

      if (typeof data.used === 'number') {
        const d = new Date();
        const dateStr = `${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
        const userKey = userId ? `rookie_doubts_${userId}_${dateStr}` : null;
        const globalKey = `rookie_doubts_today_${dateStr}`;

        const currentLocal = Math.max(
          userKey ? parseInt(localStorage.getItem(userKey) || '0', 10) || 0 : 0,
          parseInt(localStorage.getItem(globalKey) || '0', 10) || 0
        );

        const verifiedUsed = Math.max(currentLocal, data.used);
        localStorage.setItem(globalKey, String(verifiedUsed));
        if (userKey) {
          localStorage.setItem(userKey, String(verifiedUsed));
        }

        const remaining = Math.max(0, FREE_DAILY_DOUBTS_LIMIT - verifiedUsed);
        return {
          allowed: remaining > 0,
          remaining,
          used: verifiedUsed,
          isPaid: false,
        };
      }
    }
  } catch (err) {
    console.warn('[doubtQuota] Server sync error, using local fallback:', err);
  }

  return checkDoubtQuota(undefined, userId);
}

export async function recordDoubtAsked(
  feature: 'home_snap' | 'question_viewer',
  questionId?: string | null,
  subject?: string | null,
  userId?: string | null
): Promise<number> {
  let newCount = 1;
  if (typeof window !== 'undefined') {
    try {
      const d = new Date();
      const dateStr = `${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
      const userKey = userId ? `rookie_doubts_${userId}_${dateStr}` : null;
      const globalKey = `rookie_doubts_today_${dateStr}`;

      const current = Math.max(
        userKey ? parseInt(localStorage.getItem(userKey) || '0', 10) || 0 : 0,
        parseInt(localStorage.getItem(globalKey) || '0', 10) || 0
      );
      newCount = current + 1;
      localStorage.setItem(globalKey, String(newCount));
      if (userKey) {
        localStorage.setItem(userKey, String(newCount));
      }
    } catch {
      // ignore
    }
  }

  // Non-blocking fire-and-forget analytics event for rookie-dash
  try {
    await track('doubt_asked', {
      feature,
      question_id: questionId || undefined,
      subject: subject || undefined,
      metadata: { doubts_used_today: newCount },
    });
  } catch {
    // ignore
  }

  return newCount;
}

export async function recordAskAIClicked(
  feature: 'home_snap' | 'question_viewer',
  questionId?: string | null,
  subject?: string | null
): Promise<void> {
  try {
    await track('ask_ai_clicked', {
      feature,
      question_id: questionId || undefined,
      subject: subject || undefined,
    });
  } catch {
    // ignore
  }
}
