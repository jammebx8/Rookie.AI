"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../public/src/utils/supabase";

type UserRow = {
  id: string;
  name?: string | null;
  exam?: string | null;
  avatar_url?: string | null;
  rookieCoinsEarned?: number | null;
  email?: string | null;
};



// ─── Theme hook ──────────────────────────────────────────────────────────────
function useTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    try { setIsDark(localStorage.getItem("theme") !== "light"); } catch {}
    const observer = new MutationObserver(() => {
      try { setIsDark(localStorage.getItem("theme") !== "light"); } catch {}
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const onStorage = () => { try { setIsDark(localStorage.getItem("theme") !== "light"); } catch {} };
    window.addEventListener("storage", onStorage);
    return () => { observer.disconnect(); window.removeEventListener("storage", onStorage); };
  }, []);
  return isDark;
}

// ─── Avatar component ────────────────────────────────────────────────────────
function Avatar({ src, name, size = 48, className = "" }: {
  src?: string | null; name?: string | null; size?: number; className?: string;  style?: React.CSSProperties;
}) {
  const [errored, setErrored] = useState(false);
  const initials = (name ?? "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const palette = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];
  const color = palette[(name?.charCodeAt(0) ?? 0) % palette.length];



  if (!src || errored) {
    return (
      <div
        className={`flex items-center justify-center rounded-full font-bold text-white flex-shrink-0 ${className}`}
        style={{ width: size, height: size, background: color, fontSize: Math.max(size * 0.32, 10) }}
      >
        {initials}
      </div>
    );
  }
  return (
    <img
      src={src} alt={name ?? "avatar"}
      className={`rounded-full object-cover flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      onError={() => setErrored(true)}
    />
  );
}

// ─── Coin icon ───────────────────────────────────────────────────────────────
const CoinIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="10" fill="#F59E0B"/>
    <circle cx="10" cy="10" r="7.5" fill="#FBBF24"/>
    <circle cx="10" cy="10" r="5.5" fill="#FCD34D" opacity="0.6"/>
    <text x="10" y="13.5" textAnchor="middle" fill="#92400E" fontSize="8" fontWeight="800" fontFamily="serif">$</text>
  </svg>
);

// ─── Crown icon ──────────────────────────────────────────────────────────────
const CrownIcon = ({ color = "#F59E0B", size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M2 19h20v2H2v-2zm0-3l3-8 4 4 3-7 3 7 4-4 3 8H2z"/>
  </svg>
);

// ─── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonRow({ isDark }: { isDark: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border animate-pulse
      ${isDark ? "bg-[#0d1117] border-[#1e2538]" : "bg-white border-gray-100"}`}>
      <div className={`w-10 h-10 rounded-lg flex-shrink-0 ${isDark ? "bg-[#1a1f2e]" : "bg-gray-200"}`} />
      <div className={`w-10 h-10 rounded-full flex-shrink-0 ${isDark ? "bg-[#1a1f2e]" : "bg-gray-200"}`} />
      <div className="flex-1 space-y-2">
        <div className={`h-3 rounded-full w-28 ${isDark ? "bg-[#252b3d]" : "bg-gray-200"}`} />
        <div className={`h-2.5 rounded-full w-16 ${isDark ? "bg-[#1a1f2e]" : "bg-gray-100"}`} />
      </div>
      <div className={`h-4 rounded-full w-12 ${isDark ? "bg-[#252b3d]" : "bg-gray-200"}`} />
    </div>
  );
}

function SkeletonPodium({ isDark }: { isDark: boolean }) {
  const base = isDark ? "bg-white/10" : "bg-white/25";
  return (
    <div className="flex items-end justify-center gap-6 animate-pulse">
      {[60, 80, 60].map((sz, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className={`rounded-full ${base}`} style={{ width: sz, height: sz }} />
          <div className={`h-3 w-20 rounded-full ${base}`} />
          <div className={`h-2.5 w-14 rounded-full ${base} opacity-60`} />
        </div>
      ))}
    </div>
  );
}

// ─── Medal config ────────────────────────────────────────────────────────────
const MEDALS = [
  { bg: "#F59E0B", glow: "rgba(245,158,11,0.55)", ringFrom: "#FBBF24", ringTo: "#D97706", label: "1st" },
  { bg: "#94A3B8", glow: "rgba(148,163,184,0.4)", ringFrom: "#CBD5E1", ringTo: "#64748B", label: "2nd" },
  { bg: "#CD7C3A", glow: "rgba(205,124,58,0.45)", ringFrom: "#E59B5A", ringTo: "#92400E", label: "3rd" },
];

// ─── Main ────────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const isDark = useTheme();
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
      setLoading(true);
      let query: any = supabase
        .from("users")
        .select("id, name, email, avatar_url, rookieCoinsEarned, exam")
        .not("rookieCoinsEarned", "is", null)
        .order("rookieCoinsEarned", { ascending: false });
      if (examFilter !== "All") query = query.eq("exam", examFilter);

      const { data, error } = await query;
      if (error) { setUsers([]); return; }

      const sanitized: UserRow[] = (data || []).map((d: any) => ({
        id: d.id,
        name: d.name ?? d.email ?? "-",
        email: d.email ?? null,
        avatar_url: d.avatar_url ?? null,
        rookieCoinsEarned: typeof d.rookieCoinsEarned === "number" ? d.rookieCoinsEarned : Number(d.rookieCoinsEarned) || 0,
        exam: d.exam ?? null,
      }));
      setUsers(sanitized);

      const examsSet = new Set<string>();
      sanitized.forEach(u => { if (u.exam) examsSet.add(u.exam); });
      setExamOptions(["All", ...Array.from(examsSet).sort()]);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLeaderboard(filterExam).catch(() => {}); }, [filterExam]);

  const topThree = useMemo(() => users.slice(0, 3), [users]);
  const rest = useMemo(() => users.slice(3), [users]);
  const currentUserEntry = useMemo(() => {
    if (!currentUserId || !users.length) return null;
    const idx = users.findIndex(u => u.id === currentUserId);
    return idx === -1 ? null : { rank: idx + 1, user: users[idx] };
  }, [users, currentUserId]);

  // ─── Theme tokens ─────────────────────────────────────────────────────────
  const T = {
    page:        isDark ? "bg-[#060912]"           : "bg-[#F0F2FA]",
    text:        isDark ? "text-white"              : "text-[#0f172a]",
    muted:       isDark ? "text-slate-400"          : "text-slate-500",
    card:        isDark ? "bg-[#0d1117]"            : "bg-white",
    border:      isDark ? "border-[#1e2538]"        : "border-[#E5E7EB]",
    rankBox:     isDark ? "bg-[#111827] border-[#1D2939] text-slate-400" : "bg-[#F3F4F6] border-[#E5E7EB] text-slate-500",
    examTag:     isDark ? "bg-[#1e2538] text-slate-300"  : "bg-indigo-50 text-indigo-600",
    filterActive: isDark ? "bg-white text-[#0f172a] border-white"  : "bg-indigo-600 text-white border-indigo-600",
    filterIdle:  isDark ? "bg-[#111827] text-slate-300 border-[#1D2939]" : "bg-white text-slate-600 border-[#E5E7EB]",
    rowHighlight: isDark ? "bg-[#1c160a] border-yellow-500/50" : "bg-[#FFFBEB] border-yellow-400",
    divider:     isDark ? "bg-[#1e2538]"            : "bg-gray-200",
    sticky:      isDark ? "bg-[#0E1622] border-[#1D2939]" : "bg-white border-[#E5E7EB]",
    heroGrad:    isDark ? "from-[#1c0540] via-[#0b0d2e] to-[#04060f]"
                        : "from-[#4338ca] via-[#3730a3] to-[#1e1b4b]",
  };

  // Podium: 2nd left, 1st center (elevated), 3rd right
  const podiumOrder = [
    { data: topThree[1], rank: 2, size: 66, medal: MEDALS[1], lift: 0  },
    { data: topThree[0], rank: 1, size: 88, medal: MEDALS[0], lift: -14 },
    { data: topThree[2], rank: 3, size: 66, medal: MEDALS[2], lift: 0  },
  ];

  return (
    <main className={`min-h-screen ${T.page} ${T.text} transition-colors duration-300`}
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-40">

        {/* Page title */}
        <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }} className="mb-5">
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${T.text}`}
            style={{ fontFamily: "'Sora', sans-serif" }}>
            Leaderboard
          </h1>
          <p className={`text-sm mt-1 ${T.muted}`}>
            Rankings across all aspirants · {users.length} participants
          </p>
        </motion.div>

        {/* ── Hero podium card ── */}
        <motion.section
          initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0.05 }}
          className={`relative rounded-2xl overflow-hidden mb-5 bg-gradient-to-br ${T.heroGrad} shadow-2xl`}
        >
          {/* Grid texture */}
          <div className="absolute inset-0 opacity-[0.085] pointer-events-none"
            style={{ backgroundImage:"linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)", backgroundSize:"28px 28px" }} />
          {/* Glow orbs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 right-10 w-48 h-28 bg-purple-600/20 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 px-5 sm:px-8 pt-6 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-7">
              <div className="flex items-center gap-2">
                <CrownIcon color="#F59E0B" size={18} />
                <span className="text-white/80 text-xs font-bold tracking-widest uppercase">Top Performers</span>
              </div>
              <span className="text-white/40 text-xs">{users.length} ranked</span>
            </div>

            {/* Podium */}
            {loading ? <SkeletonPodium isDark={isDark} /> :
             topThree.length === 0 ? <p className="text-white/50 text-center py-8 text-sm">No data yet</p> : (
              <div className="flex items-end justify-center gap-4 sm:gap-10">
                {podiumOrder.map(({ data, rank, size, medal, lift }) => !data ? null : (
                  <motion.div
                    key={rank}
                    initial={{ opacity:0, y:24 }} animate={{ opacity:1, y: lift }}
                    transition={{ duration:0.55, delay:0.1 + rank * 0.07 }}
                    className="flex flex-col items-center"
                  >
                    {/* Crown animation for #1 */}
                    {rank === 1 && (
                      <motion.div
                        animate={{ y:[0,-5,0] }} transition={{ repeat:Infinity, duration:2.5, ease:"easeInOut" }}
                        className="mb-1"
                      >
                        <CrownIcon color="#F59E0B" size={22} />
                      </motion.div>
                    )}

                    {/* Avatar ring */}
                    <div className="relative">
                      <div className="rounded-full p-[3px]"
                        style={{
                          background: `linear-gradient(135deg, ${medal.ringFrom}, ${medal.ringTo})`,
                          boxShadow: `0 0 ${rank === 1 ? 28 : 16}px ${medal.glow}`,
                        }}
                      >
                        <Avatar src={data?.avatar_url} name={data?.name} size={size}
                          className="border-[3px] border-[#0b0d2e]" />
                      </div>
                      {/* Rank badge */}
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold text-white"
                        style={{ background: medal.bg, boxShadow: `0 2px 10px ${medal.glow}` }}>
                        <CrownIcon color="rgba(255,255,255,0.9)" size={9} />
                        {rank}
                      </div>
                    </div>

                    {/* Name & coins */}
                    <div className="mt-5 text-center">
                      <div className="font-bold text-white text-sm sm:text-base max-w-[90px] sm:max-w-[130px] truncate leading-tight">
                        {data?.name ?? "-"}
                      </div>
                      <div className="flex items-center justify-center gap-1 mt-1.5">
                          <img
                          src="coin (1).svg"
                          alt="Coins"
                          width={16}
                          height={16}
                        />
                        <span className="text-xs text-white/75 font-semibold">
                          {(data?.rookieCoinsEarned ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.section>

        {/* ── Filter chips ── */}
        <motion.div
          initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.18, duration:0.35 }}
          className="flex gap-2 overflow-x-auto pb-1 mb-5"
          style={{ scrollbarWidth:"none" }}
        >
          {examOptions.map(ex => (
            <motion.button key={ex} onClick={() => setFilterExam(ex)}
              whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-all duration-200 ${ex === filterExam ? T.filterActive : T.filterIdle}`}
            >
              {ex}
            </motion.button>
          ))}
        </motion.div>

        {/* ── Column header ── */}
        <div className={`flex items-center gap-3 px-4 mb-2`}>
          <div className={`w-10 text-center text-[10px] font-bold tracking-widest uppercase ${T.muted}`}>AIR</div>
          <div className="w-10 flex-shrink-0" />
          <div className={`flex-1 text-[10px] font-bold tracking-widest uppercase ${T.muted}`}>Name</div>
          <div className={`text-[10px] font-bold tracking-widest uppercase ${T.muted}`}>Coins</div>
        </div>

        {/* ── List ── */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skel" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="space-y-2.5">
              {Array.from({ length:8 }).map((_,i) => <SkeletonRow key={i} isDark={isDark} />)}
            </motion.div>
          ) : users.length === 0 ? (
            <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }}
              className={`py-20 text-center ${T.muted} text-sm`}>
              No users found for this filter.
            </motion.div>
          ) : (
            <motion.div key="rows" initial={{ opacity:0 }} animate={{ opacity:1 }} className="space-y-2">

              {/* All rows (top 3 + rest) */}
              {users.map((item, idx) => {
                const rank = idx + 1;
                const isCurrent = item.id === currentUserId;
                const isTop3 = rank <= 3;
                const medal = isTop3 ? MEDALS[rank - 1] : null;

                return (
                  <>
                    {/* Divider after top 3 */}
                    {rank === 4 && (
                      <div key="divider" className="flex items-center gap-3 py-2">
                        <div className={`flex-1 h-px ${T.divider}`} />
                        <span className={`text-[10px] font-bold tracking-widest uppercase ${T.muted}`}>Others</span>
                        <div className={`flex-1 h-px ${T.divider}`} />
                      </div>
                    )}
<motion.div
  key={item.id}
  ref={isCurrent ? currentUserRowRef : null}
  initial={{ opacity:0, y:5 }}
  animate={{ opacity:1, y:0 }}
  transition={{ duration:0.28, delay: Math.min(idx * 0.02, 0.25) }}
  whileHover={{ scale:1.004 }}
  className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-all duration-200 ${
    isCurrent
      ? `${T.rowHighlight} ${rank <= 3 ? "ring-1 ring-yellow-400/60" : "ring-1 ring-yellow-400/60"}`
      : `${T.card} ${T.border}`
  }`}
>
                      {/* Rank / medal box */}
                      {isTop3 && medal ? (
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: medal.bg, boxShadow: `0 2px 10px ${medal.glow}` }}
                        >
                          <CrownIcon color="white" size={16} />
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold border ${T.rankBox}`}>
                          {rank}
                        </div>
                      )}

                      {/* Avatar */}
                      <Avatar src={item.avatar_url} name={item.name} size={40}
                        className={isTop3 && medal ? `ring-2 ring-offset-1 ${isDark ? "ring-offset-[#0d1117]" : "ring-offset-white"}` : ""}
                        style={isTop3 && medal ? { boxShadow:`0 0 0 2px ${medal.bg}` } as React.CSSProperties : undefined}
                      />

                      {/* Name + exam */}
                      <div className="flex-1 mr-10 min-w-0">
                        <div className={`font-semibold text-sm truncate ${T.text} ${isCurrent ? "font-bold" : ""}`}>
                          {item.name ?? "-"}
                          {isCurrent && (
                            <span className="ml-1.5 text-[9px] font-extrabold text-yellow-500 tracking-wide align-middle uppercase">You</span>
                          )}
                        </div>
                        {item.exam && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 inline-block ${T.examTag}`}>
                            {item.exam}
                          </span>
                        )}
                      </div>

                      {/* Coins */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <img
                         src="coin (1).svg"
                         alt="Coins"
                         width={16}
                         height={16}
                       />
                        <span className={`font-extrabold text-sm ${T.text}`}>
                          {(item.rookieCoinsEarned ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </motion.div>
                  </>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-28" />
      </div>

      {/* ── Sticky current user bar ── */}
      {/* ── Scroll to me button ── */}
<AnimatePresence>
  {currentUserEntry && (
    <motion.button
      initial={{ opacity:0, scale:0.8 }}
      animate={{ opacity:1, scale:1 }}
      exit={{ opacity:0, scale:0.8 }}
      transition={{ duration:0.25 }}
      onClick={() => currentUserRowRef.current?.scrollIntoView({ behavior:"smooth", block:"center" })}
      className={`fixed right-4 bottom-24 lg:bottom-8 z-50 flex items-center gap-2 px-3 py-2 rounded-full border shadow-xl transition-colors duration-200 ${T.sticky}`}
      style={{ boxShadow: isDark ? "0 0 20px rgba(245,158,11,0.15), 0 4px 20px rgba(0,0,0,0.4)" : "0 4px 20px rgba(0,0,0,0.12)" }}
    >
      <span className="text-[11px] font-bold text-yellow-500 uppercase tracking-wide">Me</span>
      <span className={`text-sm ${T.text}`}>#{currentUserEntry.rank}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={T.text}>
        <path d="M12 5v14M5 12l7 7 7-7"/>
      </svg>
    </motion.button>
  )}
</AnimatePresence>
    </main>
  );
}