"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, Coins, Crown, Sparkles, Trophy, Users } from "lucide-react";
import { supabase } from "../../../public/src/utils/supabase";
import { Button } from "@/components/ui/button";
import { Chip, EmptyState, Page, PageHeader, Skeleton } from "@/components/rookie/ui";
import { Define } from "@/components/rookie/define";
import { MEDAL, MedalAvatar, STAGE_BG, Spotlight, initialsOf, useConfetti } from "@/components/rookie/stage";
import { cn } from "@/lib/utils";

type UserRow = {
  id: string;
  name?: string | null;
  exam?: string | null;
  avatar_url?: string | null;
  rookieCoinsEarned?: number | null;
  email?: string | null;
  isPaid?: boolean;
};

const fmt = (n: number) => n.toLocaleString("en-IN");

// ─── Row avatar (photo, or initials on neutral) ─────────────────────────────
function RowAvatar({ src, name }: { src?: string | null; name?: string | null }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-meta font-semibold text-muted-foreground">
        {initialsOf(name ?? "?")}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setErrored(true)}
      className="size-9 shrink-0 rounded-full object-cover" />
  );
}

function PassMark() {
  return (
    <Define text="Rookie Pass holder" className="inline-flex shrink-0">
      <Sparkles className="size-3.5 text-[#e0a800] dark:text-[#ffd84d]" aria-label="Rookie Pass" />
    </Define>
  );
}

// ─── Podium (matches the approved /demo widget) ──────────────────────────────
function Podium({ top, currentUserId, meRef, onCelebrate }: {
  top: UserRow[]; currentUserId: string | null; meRef: React.RefObject<HTMLDivElement | null>; onCelebrate: () => void;
}) {
  const order = [
    { data: top[1], rank: 2 as const, delay: 0.15 },
    { data: top[0], rank: 1 as const, delay: 0 },
    { data: top[2], rank: 3 as const, delay: 0.3 },
  ];
  const block: Record<number, string> = { 1: "h-24", 2: "h-16", 3: "h-11" };
  return (
    <div className="relative grid grid-cols-3 items-end gap-3 pt-10">
      <span aria-hidden className="pointer-events-none absolute bottom-6 left-1/2 h-16 w-48 -translate-x-1/2 rounded-full bg-[#ffce00]/25 blur-2xl" />
      {order.map(({ data, rank, delay }) => (
        <motion.div key={rank} ref={data && data.id === currentUserId ? meRef : undefined}
          className="relative flex scroll-mt-28 flex-col items-center"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay, duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}>
          {data ? (
            <>
              <button onClick={onCelebrate} className="relative rounded-full outline-none transition hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-white" aria-label={`Celebrate ${data.name ?? "topper"}`}>
                {rank === 1 && (
                  <motion.span className="absolute -top-6 left-1/2 -translate-x-1/2" animate={{ y: [0, -3, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
                    <Crown className="size-6 text-[#ffce00] drop-shadow-[0_0_10px_rgba(255,206,0,.8)]" fill="#ffce00" />
                  </motion.span>
                )}
                <MedalAvatar rank={rank} name={data.name ?? "?"} src={data.avatar_url} size={rank === 1 ? "lg" : "md"} />
              </button>
              <span className="mt-2.5 flex max-w-full items-center gap-1 text-body-sm font-semibold text-white">
                <span className="truncate">{(data.name ?? "-").split(" ")[0]}</span>
                {data.isPaid && <Sparkles className="size-3 shrink-0 text-[#ffd84d]" aria-label="Rookie Pass" />}
              </span>
              <span className="text-caption tabular-nums text-white/60">
                {fmt(data.rookieCoinsEarned ?? 0)} coins{data.id === currentUserId ? " · you" : ""}
              </span>
            </>
          ) : (
            <span className="text-meta text-white/40">—</span>
          )}
          <div className={cn("mt-3 grid w-full place-items-center rounded-t-control bg-white/[.07] backdrop-blur-sm", block[rank])}
            style={{ boxShadow: `inset 0 2px 0 ${MEDAL[rank].text}` }}>
            <span className="text-heading font-bold" style={{ color: MEDAL[rank].text }}>{rank}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function PodiumSkeleton() {
  return (
    <div className="grid grid-cols-3 items-end gap-3 pt-10">
      {[2, 1, 3].map(r => (
        <div key={r} className="flex animate-pulse flex-col items-center">
          <span className={cn("rounded-full bg-white/10", r === 1 ? "size-[70px]" : "size-[54px]")} />
          <span className="mt-3 h-3 w-16 rounded-tag bg-white/10" />
          <div className={cn("mt-3 w-full rounded-t-control bg-white/[.06]", r === 1 ? "h-24" : r === 2 ? "h-16" : "h-11")} />
        </div>
      ))}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filterExam, setFilterExam] = useState("All");
  const [examOptions, setExamOptions] = useState<string[]>(["All"]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const currentUserRowRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("@user") : null;
      if (raw) { const p = JSON.parse(raw); if (p?.id) setCurrentUserId(p.id); }
    } catch {}
  }, []);

  const fetchLeaderboard = async (examFilter = filterExam) => {
    try {
      if (users.length === 0) {
        setLoading(true);
      }

      // 1. Primary: Fetch leaderboard with verified paid status from Supabase entitlements
      const res = await fetch(`/api/leaderboard?exam=${encodeURIComponent(examFilter)}`, {
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.users)) {
          setUsers(json.users);
          if (json.allExams && Array.isArray(json.allExams)) {
            setExamOptions(json.allExams);
          }
          return;
        }
      }

      // 2. Fallback: Direct query to Supabase users table
      let query: any = supabase
        .from("users")
        .select("id, name, email, avatar_url, rookieCoinsEarned, exam")
        .order("rookieCoinsEarned", { ascending: false });

      if (examFilter !== "All") {
        query = query.eq("exam", examFilter);
      }

      const { data, error } = await query;
      if (error) {
        setUsers([]);
        return;
      }

      // Attempt reading active entitlements directly if RLS policy permits
      let activePaidIds = new Set<string>();
      try {
        const { data: entData } = await supabase
          .from("entitlements")
          .select("user_id")
          .eq("plan_id", "rookie_pass_yearly")
          .gt("access_until", new Date().toISOString());
        if (entData) {
          activePaidIds = new Set(entData.map((e: any) => e.user_id));
        }
      } catch {
        /* no-op fallback */
      }

      const sanitized: UserRow[] = (data || []).map((d: any) => {
        const name = d.name ?? d.email ?? "-";
        return {
          id: d.id,
          name,
          email: d.email ?? null,
          avatar_url: d.avatar_url ?? null,
          rookieCoinsEarned:
            typeof d.rookieCoinsEarned === "number"
              ? d.rookieCoinsEarned
              : Number(d.rookieCoinsEarned) || 0,
          exam: d.exam ?? null,
          isPaid: activePaidIds.has(d.id),
        };
      });

      setUsers(sanitized);

      if (examFilter === "All") {
        const examsSet = new Set<string>();
        sanitized.forEach((u) => {
          if (u.exam) examsSet.add(u.exam);
        });
        setExamOptions(["All", ...Array.from(examsSet).sort()]);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(filterExam).catch(() => {});
  }, [filterExam]);

  const topThree = useMemo(() => users.slice(0, 3), [users]);
  const rest = useMemo(() => users.slice(3), [users]);
  const currentUserEntry = useMemo(() => {
    if (!currentUserId || !users.length) return null;
    const idx = users.findIndex(u => u.id === currentUserId);
    return idx === -1 ? null : { rank: idx + 1, user: users[idx] };
  }, [users, currentUserId]);

  const { canvas, burst, burstOnView } = useConfetti();
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  useEffect(() => burstOnView(stageRef.current), [burstOnView]);

  const maxCoins = Math.max(1, users[0]?.rookieCoinsEarned ?? 0);

  return (
    <Page>
      <PageHeader
        title={<Define term="leaderboard">Leaderboard</Define>}
        sub={<>Ranked by <Define term="coins">coins</Define> · {fmt(users.length)} students</>}
      />

      {/* Exam filter */}
      <div className="no-scrollbar -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {examOptions.map(ex => (
          <Chip key={ex} active={ex === filterExam} onClick={() => setFilterExam(ex)} className="shrink-0">
            {ex}
          </Chip>
        ))}
      </div>

      {/* Stage: top 3 */}
      <div ref={stageRef} className="relative isolate mt-6 flex flex-col overflow-hidden rounded-card p-6 text-white" style={{ background: STAGE_BG }}>
        <Spotlight />
        <canvas ref={canvas} className="pointer-events-none absolute inset-0 z-20 size-full" aria-hidden />
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div>
            <span className="flex items-center gap-2 text-label font-medium text-white/70">
              <Trophy className="size-[15px] text-[#ffd84d]" /> Top 3{filterExam !== "All" ? ` · ${filterExam}` : ""}
            </span>
            <p className="mt-1 text-title font-semibold tracking-[-0.015em]">Toppers</p>
          </div>
          <span className="text-meta tabular-nums text-white/50">{fmt(users.length)} ranked</span>
        </div>
        <div className="relative z-10 mx-auto w-full max-w-[520px]">
          {loading ? <PodiumSkeleton /> : topThree.length === 0 ? (
            <p className="py-14 text-center text-body-sm text-white/60">No toppers yet. Pehla rank aapka ho sakta hai.</p>
          ) : (
            <Podium top={topThree} currentUserId={currentUserId} meRef={currentUserRowRef} onCelebrate={burst} />
          )}
        </div>
      </div>

      {/* Rest of the ranking */}
      <div className="mt-6 rounded-card bg-card p-3 ring-1 ring-black/[.05] dark:ring-white/[.06] sm:p-4">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1"><Skeleton className="h-3 w-32" /><Skeleton className="mt-2 h-1.5 w-full" /></div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </motion.div>
          ) : users.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <EmptyState icon={Users} title="No students here yet" sub="No users found for this filter." />
            </motion.div>
          ) : rest.length === 0 ? (
            <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 py-8 text-center text-body-sm text-muted-foreground">
              Only the top 3 so far.
            </motion.p>
          ) : (
            <motion.ol key="rows" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-1">
              {rest.map((item, i) => {
                const rank = i + 4;
                const isCurrent = item.id === currentUserId;
                const coins = item.rookieCoinsEarned ?? 0;
                return (
                  <motion.li key={item.id}
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: Math.min(i * 0.02, 0.25) }}>
                    <div ref={isCurrent ? currentUserRowRef : null}
                      className={cn(
                        "flex scroll-mt-28 items-center gap-3 rounded-control px-3 py-2.5 transition",
                        isCurrent ? "bg-secondary text-secondary-foreground ring-1 ring-[var(--rk-sky-300)] dark:ring-transparent" : "hover:bg-muted",
                      )}>
                      <span className={cn("w-7 text-center text-body-sm font-bold tabular-nums", isCurrent ? "text-primary" : "text-muted-foreground")}>{rank}</span>
                      <RowAvatar src={item.avatar_url} name={item.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-body font-medium text-foreground">
                          <span className="truncate">{item.name ?? "-"}</span>
                          {item.isPaid && <PassMark />}
                          {isCurrent && <span className="text-caption font-semibold text-primary">You</span>}
                          {item.exam && <span className="ml-1 hidden shrink-0 text-caption font-medium text-muted-foreground sm:inline">{item.exam}</span>}
                        </div>
                        <div className="mt-1.5 h-1 max-w-[420px] overflow-hidden rounded-full bg-muted">
                          <motion.div className="h-full rounded-full bg-primary"
                            initial={{ width: 0 }} animate={{ width: `${Math.min(100, (coins / maxCoins) * 100)}%` }}
                            transition={{ duration: 0.8, delay: Math.min(i * 0.02, 0.25) }} />
                        </div>
                      </div>
                      <span className="flex w-20 shrink-0 items-center justify-end gap-1 text-body-sm font-semibold tabular-nums text-foreground">
                        <Coins className="size-3.5 text-muted-foreground" />{fmt(coins)}
                      </span>
                    </div>
                  </motion.li>
                );
              })}
            </motion.ol>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky "you" bar (above the mobile nav) */}
      <AnimatePresence>
        {currentUserEntry && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.25 }}
            className="sticky bottom-[88px] z-30 mt-6 md:bottom-6">
            <div className="flex items-center gap-3 rounded-card bg-card/95 px-4 py-3 shadow-[0_10px_30px_-12px_rgba(46,46,46,.3)] ring-1 ring-border backdrop-blur-md">
              <span className="text-title font-bold tabular-nums text-primary">#{currentUserEntry.rank}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-foreground">You</span>
                <span className="block text-meta tabular-nums text-muted-foreground">
                  {fmt(currentUserEntry.user.rookieCoinsEarned ?? 0)} <Define term="coins">coins</Define>
                </span>
              </span>
              <Button variant="secondary" className="h-9 rounded-control px-3"
                onClick={() => currentUserRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                Jump to me <ArrowDown />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}
