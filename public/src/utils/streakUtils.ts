import { supabase } from '../utils/supabase';

export const STREAK_KEY = 'rookie_streak_data';

export type StreakData = {
  current_streak: number;
  longest_streak: number;
  last_attempt_date: string | null;
  streak_days: string[];
};

// ─────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────

function toDateKey(date: Date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function getPreviousDate(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

// ─────────────────────────────────────────────
// Calculate current streak FROM active days
// ─────────────────────────────────────────────

function calculateCurrentStreak(activeDays: string[]) {
  const active = new Set(activeDays);
  const date = new Date();

  // Today not done yet? Streak is still alive if yesterday was active.
  if (!active.has(toDateKey(date))) {
    date.setDate(date.getDate() - 1);
    if (!active.has(toDateKey(date))) return 0; // missed yesterday → broken
  }

  let streak = 0;
  while (active.has(toDateKey(date))) {
    streak++;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}
// ─────────────────────────────────────────────
// Calculate longest streak FROM active days
// ─────────────────────────────────────────────

function calculateLongestStreak(activeDays: string[]) {
  if (activeDays.length === 0) return 0;

  const uniqueDays = [...new Set(activeDays)];

  const dates = uniqueDays
    .map(key => {
      const [year, month, day] = key.split('-').map(Number);
      return new Date(year, month - 1, day);
    })
    .sort((a, b) => a.getTime() - b.getTime());

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const previous = dates[i - 1];
    const currentDate = dates[i];

    const previousNextDay = new Date(previous);
    previousNextDay.setDate(previousNextDay.getDate() + 1);

    if (toDateKey(previousNextDay) === toDateKey(currentDate)) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

// ─────────────────────────────────────────────
// Build consistent streak object
// ─────────────────────────────────────────────

function buildStreakData(activeDays: string[]): StreakData {
  const uniqueDays = [...new Set(activeDays)].sort();

  const current = calculateCurrentStreak(uniqueDays);
  const longest = calculateLongestStreak(uniqueDays);

  const lastAttempt =
    uniqueDays.length > 0
      ? uniqueDays[uniqueDays.length - 1]
      : null;

  return {
    current_streak: current,
    longest_streak: longest,
    last_attempt_date: lastAttempt,
    streak_days: uniqueDays,
  };
}

// ─────────────────────────────────────────────
// LocalStorage
// ─────────────────────────────────────────────

export function saveStreakToLocal(data: StreakData) {
  try {
    localStorage.setItem(
      STREAK_KEY,
      JSON.stringify({
        current: data.current_streak,
        longest: data.longest_streak,
        activeDays: data.streak_days,
      })
    );
  } catch {}
}

export function readStreakFromLocal(): {
  current: number;
  longest: number;
  activeDays: string[];
} {
  try {
    const raw = localStorage.getItem(STREAK_KEY);

    if (!raw) {
      return {
        current: 0,
        longest: 0,
        activeDays: [],
      };
    }

    const parsed = JSON.parse(raw);

    const activeDays: string[] = Array.isArray(parsed.activeDays)
      ? parsed.activeDays
      : [];

    // IMPORTANT:
    // Never trust stored `current` / `longest`.
    // Recalculate them from activeDays.
    const calculated = buildStreakData(activeDays);

    return {
      current: calculated.current_streak,
      longest: calculated.longest_streak,
      activeDays: calculated.streak_days,
    };
  } catch {
    return {
      current: 0,
      longest: 0,
      activeDays: [],
    };
  }
}

// ─────────────────────────────────────────────
// Update streak when question is attempted
// ─────────────────────────────────────────────

export async function updateStreak() {
  const todayKey = toDateKey();
  const yesterdayKey = toDateKey(getPreviousDate(new Date()));

  // ── Get user ID ──
  let userId: string | null = null;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userId = user?.id ?? null;
  } catch {}

  if (!userId) {
    try {
      const cached = localStorage.getItem('@user');

      if (cached) {
        userId = JSON.parse(cached)?.id ?? null;
      }
    } catch {}
  }

  if (!userId) return;

  // ── Fetch existing row ──
  const { data: existing } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  const previousDays: string[] =
    existing && Array.isArray(existing.streak_days)
      ? existing.streak_days
      : [];

  // Already counted today.
  // Still repair/recalculate the streak values.
  if (previousDays.includes(todayKey)) {
    const fixed = buildStreakData(previousDays);

    await supabase
      .from('user_streaks')
      .upsert(
        {
          user_id: userId,
          current_streak: fixed.current_streak,
          longest_streak: fixed.longest_streak,
          last_attempt_date: fixed.last_attempt_date,
          streak_days: fixed.streak_days,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    saveStreakToLocal(fixed);

    window.dispatchEvent(
      new CustomEvent('streakUpdated', {
        detail: fixed,
      })
    );

    return;
  }

  // Add today.
  const newDays = [...previousDays, todayKey];

  // Calculate EVERYTHING from the days.
  const updated = buildStreakData(newDays);

  // ── Save to Supabase ──
  await supabase
    .from('user_streaks')
    .upsert(
      {
        user_id: userId,
        current_streak: updated.current_streak,
        longest_streak: updated.longest_streak,
        last_attempt_date: updated.last_attempt_date,
        streak_days: updated.streak_days,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  // ── Save locally ──
  saveStreakToLocal(updated);

  window.dispatchEvent(
    new CustomEvent('streakUpdated', {
      detail: updated,
    })
  );
}

// ─────────────────────────────────────────────
// Sync Supabase → Local
// ─────────────────────────────────────────────

export async function syncStreakFromSupabase() {
  syncStreakInBackground();
}

async function syncStreakInBackground() {
  let userId: string | null = null;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userId = user?.id ?? null;
  } catch {}

  if (!userId) {
    try {
      const cached = localStorage.getItem('@user');

      if (cached) {
        userId = JSON.parse(cached)?.id ?? null;
      }
    } catch {}
  }

  if (!userId) return;

  try {
    const { data } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) return;

    const remoteDays: string[] = Array.isArray(data.streak_days)
      ? data.streak_days
      : [];

    const local = readStreakFromLocal();

    // Streak days are append-only.
    // Merge local + remote instead of blindly overwriting local.
    const mergedDays = [
      ...new Set([
        ...local.activeDays,
        ...remoteDays,
      ]),
    ];

    const fixed = buildStreakData(mergedDays);

    // Save corrected data locally.
    saveStreakToLocal(fixed);

    // Repair Supabase if its stored streak numbers were stale.
    await supabase
      .from('user_streaks')
      .upsert(
        {
          user_id: userId,
          current_streak: fixed.current_streak,
          longest_streak: fixed.longest_streak,
          last_attempt_date: fixed.last_attempt_date,
          streak_days: fixed.streak_days,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    window.dispatchEvent(
      new CustomEvent('streakUpdated', {
        detail: fixed,
      })
    );
  } catch (err) {
    console.warn(
      'Failed to sync streak from Supabase:',
      err
    );
  }
}