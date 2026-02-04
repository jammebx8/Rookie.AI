"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../../public/src/utils/supabase";
import Image from 'next/image';

type UserRow = {
  id: string;
  name?: string | null;
  exam?: string | null;
  avatar_url?: string | null;
  rookieCoinsEarned?: number | null;
  email?: string | null;
};

const FALLBACK_AVATAR = "/default.jpg"; // put image in public/assets/images/default.jpg

export default function LeaderboardPage()  {
  const [loading, setLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filterExam, setFilterExam] = useState<string>("All");
  const [examOptions, setExamOptions] = useState<string[]>(["All"]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState<boolean>(false);

  // Load current logged in user id from localStorage (web)
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("@user") : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id) setCurrentUserId(parsed.id);
      }
    } catch (e) {
      // ignore parse errors
      // console.warn("reading @user from localStorage failed", e);
    }
  }, []);

  const fetchLeaderboard = async (examFilter = filterExam) => {
    try {
      setLoading(true);

      let query: any = supabase
        .from("users")
        .select("id, name, email, avatar_url, rookieCoinsEarned, exam")
        .not("rookieCoinsEarned", "is", null)
        .order("rookieCoinsEarned", { ascending: false });

      if (examFilter && examFilter !== "All") {
        query = query.eq("exam", examFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.warn("Leaderboard fetch error:", error);
        setUsers([]);
        return;
      }

      const sanitized: UserRow[] = (data || []).map((d: any) => ({
        id: d.id,
        name: d.name ?? d.email ?? "-",
        email: d.email ?? null,
        avatar_url: d.avatar_url ?? null,
        rookieCoinsEarned:
          typeof d.rookieCoinsEarned === "number"
            ? d.rookieCoinsEarned
            : Number(d.rookieCoinsEarned) || 0,
        exam: d.exam ?? null,
      }));

      setUsers(sanitized);

      const examsSet = new Set<string>();
      sanitized.forEach((u) => {
        if (u.exam) examsSet.add(u.exam);
      });
      const examsArr = ["All", ...Array.from(examsSet).sort()];
      setExamOptions(examsArr);
    } catch (err) {
      console.warn("fetchLeaderboard error:", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  

  // Re-fetch when exam filter changes
  useEffect(() => {
    fetchLeaderboard(filterExam).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterExam]);

  const topThree = useMemo(() => users.slice(0, 3), [users]);
  const rest = useMemo(() => users.slice(3), [users]);

  const currentUserEntry = useMemo(() => {
    if (!currentUserId || users.length === 0) return null;
    const idx = users.findIndex((u) => u.id === currentUserId);
    if (idx === -1) return null;
    const rank = idx + 1;
    const user = users[idx];
    return { rank, user };
  }, [users, currentUserId]);

  return (
    <main className="min-h-screen bg-[#000] text-white px-4 sm:px-6 lg:px-8 py-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="max-w-4xl mx-auto"
      >
        <header className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-semibold">Leaderboard</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Top performers, filters and live updates.
            <span className="ml-3 inline-block text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">
              {subscribed ? "Live" : "Not subscribed"}
            </span>
          </p>
        </header>

        {/* Top performers */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.06, duration: 0.45 }}
          className="bg-gradient-to-r from-[#47006A] to-[#0031D0] rounded-xl p-4 mb-6 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Top performers</h2>
            <div className="hidden sm:flex text-sm text-slate-300">{users.length} users</div>
          </div>

          <div className="flex gap-3 items-end">
            {/* 2 */}
            <motion.div
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 flex flex-col items-center relative"
            >
              <div className="absolute -top-2 left-3 bg-white/12 px-2 py-1 rounded-full text-xs font-semibold">
                2
              </div>
              <div className="relative w-16 h-16 sm:w-20 sm:h-20">
  <Image
    src={topThree[1]?.avatar_url || FALLBACK_AVATAR}
    alt={topThree[1]?.name || "avatar"}
    fill
    sizes="(max-width: 640px) 64px, 80px"
    className="rounded-full border-[3px] border-white/20 object-cover"
    unoptimized={true} // Add this if you want to bypass Next.js processing and hit the URL directly
    onError={(e) => {
       // Note: Next.js Image handles errors differently than standard img tags
       // It's often better to use a state variable for the src
    }}
  />
</div>
              <div className="mt-3 text-center">
                <div className="font-semibold text-sm max-w-[110px] truncate">{topThree[1]?.name ?? "-"}</div>
                <div className="text-xs text-slate-200 mt-1">{topThree[1]?.rookieCoinsEarned ?? 0} coins</div>
              </div>
            </motion.div>

            {/* 1 */}
            <motion.div
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.99 }}
              className="flex-1.25 flex flex-col items-center relative"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white/16 px-3 py-1 rounded-full text-sm font-extrabold">
                1
              </div>
              <img
                src={topThree[0]?.avatar_url ?? FALLBACK_AVATAR}
                alt={topThree[0]?.name ?? "avatar"}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[3px] border-white/16 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_AVATAR;
                }}
              />
              <div className="mt-4 text-center">
                <div className="font-extrabold text-base sm:text-lg max-w-[220px] truncate">{topThree[0]?.name ?? "-"}</div>
                <div className="text-sm text-slate-200 mt-1">{topThree[0]?.rookieCoinsEarned ?? 0} coins</div>
              </div>
            </motion.div>

            {/* 3 */}
            <motion.div
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 flex flex-col items-center relative"
            >
              <div className="absolute -top-2 left-3 bg-white/12 px-2 py-1 rounded-full text-xs font-semibold">
                3
              </div>
              <img
                src={topThree[2]?.avatar_url ?? FALLBACK_AVATAR}
                alt={topThree[2]?.name ?? "avatar"}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] border-white/16 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_AVATAR;
                }}
              />
              <div className="mt-3 text-center">
                <div className="font-semibold text-sm max-w-[110px] truncate">{topThree[2]?.name ?? "-"}</div>
                <div className="text-xs text-slate-200 mt-1">{topThree[2]?.rookieCoinsEarned ?? 0} coins</div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Filters */}
        <div className="mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {examOptions.map((ex) => {
              const active = ex === filterExam;
              return (
                <motion.button
                  key={ex}
                  onClick={() => setFilterExam(ex)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border ${
                    active ? "bg-white text-[#181f2b] border-white" : "bg-[#101827] text-white border-[#1D2939]"
                  }`}
                >
                  {ex}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* List header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Leaderboard</h3>
          <div className="text-sm text-slate-300">{users.length} users</div>
        </div>

        {/* Loading / Empty */}
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="flex flex-col items-center">
              <div className="h-10 w-10 border-4 border-t-transparent border-white rounded-full animate-spin" />
              <div className="text-slate-300 mt-2">Loading leaderboard…</div>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-300">No users with coins found</div>
        ) : (
          <>
            {/* Rest list */}
            <div className="space-y-3">
              {rest.map((item, idx) => {
                const globalRank = idx + 4; // rest starts after top 3
                const isCurrent = item.id === currentUserId;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: idx * 0.02 }}
                    whileHover={{ scale: 1.01 }}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      isCurrent ? "border-yellow-400 bg-[#071024]" : "border-[#121826] bg-[#071024]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-[#0F1724] flex items-center justify-center text-sm font-bold border border-[#1D2939]">
                        <span>{globalRank}</span>
                      </div>
                      <img
                        src={item.avatar_url ?? FALLBACK_AVATAR}
                        alt={item.name ?? "avatar"}
                        className="w-12 h-12 rounded-full object-cover border border-[#222]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_AVATAR;
                        }}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{item.name ?? "-"}</div>
                        <div className="text-xs text-slate-300 truncate">{item.exam ?? "-"}</div>
                      </div>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <div className="font-extrabold text-white">{item.rookieCoinsEarned ?? "-"}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        {/* Small spacer so bottom sticky does not overlap */}
        <div className="h-28" />
      </motion.div>

      {/* Sticky current user (show only if rank > 3 and present) */}
      {currentUserEntry && currentUserEntry.rank > 3 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed left-4 right-4 bottom-6 bg-[#0E1622] rounded-xl p-3 flex items-center justify-between border border-[#1D2939] shadow-lg max-w-4xl mx-auto"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#0F1724] flex items-center justify-center text-sm font-bold border border-[#1D2939]">
              {currentUserEntry.rank}
            </div>
            <img
              src={currentUserEntry.user.avatar_url ?? FALLBACK_AVATAR}
              alt={currentUserEntry.user.name ?? "avatar"}
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_AVATAR;
              }}
            />
            <div className="min-w-0">
              <div className="font-bold truncate">{currentUserEntry.user.name ?? "-"}</div>
              <div className="text-xs text-slate-300 truncate">{currentUserEntry.user.exam ?? "-"}</div>
            </div>
          </div>

          <div className="font-extrabold text-white">{currentUserEntry.user.rookieCoinsEarned ?? "-"}</div>
        </motion.div>
      )}
    </main>
  );
}