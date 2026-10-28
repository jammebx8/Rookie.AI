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

function getTodayKey(): string {
  const d = new Date();
  return `rookie_doubts_today_${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}`;
}

export function getDoubtsUsedToday(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(getTodayKey());
    return raw ? parseInt(raw, 10) || 0 : 0;
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

export function checkDoubtQuota(hasPass: boolean | null | undefined): DoubtQuotaStatus {
  const isPaid = hasPass === true;
  if (isPaid) {
    return {
      allowed: true,
      remaining: Infinity,
      used: 0,
      isPaid: true,
    };
  }

  const used = getDoubtsUsedToday();
  const remaining = Math.max(0, FREE_DAILY_DOUBTS_LIMIT - used);

  return {
    allowed: remaining > 0,
    remaining,
    used,
    isPaid: false,
  };
}

export async function recordDoubtAsked(
  feature: 'home_snap' | 'question_viewer',
  questionId?: string | null,
  subject?: string | null
): Promise<number> {
  let newCount = 1;
  if (typeof window !== 'undefined') {
    try {
      const key = getTodayKey();
      const current = parseInt(localStorage.getItem(key) || '0', 10) || 0;
      newCount = current + 1;
      localStorage.setItem(key, String(newCount));
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
