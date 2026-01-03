import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../src/utils/supabase";

const { width: windowWidth } = Dimensions.get("window");

// Fallback avatar (use an existing shipped asset). Adjust path if needed in your project.
const FALLBACK_AVATAR = require("../../src/assets/images/default.jpg");

type UserRow = {
  id: string;
  name?: string | null;
  exam?: string | null;
  avatar_url?: string | null;
  rookieCoinsEarned?: number | null;
  email?: string | null;
};

export default function Leaderboard() {
  const [loading, setLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filterExam, setFilterExam] = useState<string>("All");
  const [examOptions, setExamOptions] = useState<string[]>(["All"]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState<boolean>(false);

  // Load current logged in user id from local storage
  useEffect(() => {
    (async () => {
      try {
        const u = await AsyncStorage.getItem("@user");
        if (u) {
          const parsed = JSON.parse(u);
          if (parsed?.id) setCurrentUserId(parsed.id);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Fetch leaderboard from Supabase
  const fetchLeaderboard = async (examFilter = filterExam) => {
    try {
      setLoading(true);

      // Base query: select only users who have rookieCoinsEarned (not null)
      let query = supabase
        .from("users")
        .select("id, name, email, avatar_url, rookieCoinsEarned, exam")
        .not("rookieCoinsEarned", "is", null)
        .order("rookieCoinsEarned", { ascending: false });

      // Apply exam filter if not All
      if (examFilter && examFilter !== "All") {
        query = query.eq("exam", examFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.warn("Leaderboard fetch error:", error);
        setUsers([]);
        setLoading(false);
        return;
      }

      const sanitized = (data || []).map((d: any) => ({
        id: d.id,
        name: d.name ?? d.email ?? "-",
        email: d.email ?? null,
        avatar_url: d.avatar_url ?? null,
        rookieCoinsEarned:
          typeof d.rookieCoinsEarned === "number" ? d.rookieCoinsEarned : Number(d.rookieCoinsEarned) || 0,
        exam: d.exam ?? null,
      }));

      setUsers(sanitized);

      // Build exam options dynamically from results + keep "All" at front
      const examsSet = new Set<string>();
      sanitized.forEach((u: UserRow) => {
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

  // Initial fetch + set up realtime subscription to users table so leaderboard updates as table changes
  useEffect(() => {
    fetchLeaderboard().catch(() => {});

    // Try to use Realtime via channels (Supabase JS client v2)
    // If your supabase client is older/newer adjust accordingly.
    let channel: any = null;
    try {
      channel = supabase
        .channel("public:users")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "users" },
          (payload: any) => {
            // When any change happens in users table, refetch leaderboard with current filter
            // Keeping refetch simple/resilient instead of patching local state
            fetchLeaderboard().catch(() => {});
          }
        )
        .subscribe((status: any) => {
          // optional: you can check subscribe status
          if (status === "SUBSCRIBED") setSubscribed(true);
        });
    } catch (e) {
      // Fallback for older clients: try .from(...).on(...)
      try {
        // @ts-ignore
        channel = supabase
          .from("users")
          .on("*", (payload: any) => {
            fetchLeaderboard().catch(() => {});
          })
          .subscribe();
        setSubscribed(true);
      } catch (err) {
        console.warn("Realtime subscription not available:", err);
      }
    }

    return () => {
      // unsubscribe on unmount
      try {
        if (channel && typeof channel.unsubscribe === "function") {
          channel.unsubscribe();
        } else if (channel && typeof supabase.removeChannel === "function") {
          // supabase.removeChannel(channel) // older API variants
          // attempt best-effort removal
        }
      } catch (e) {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch whenever exam filter changes
  useEffect(() => {
    fetchLeaderboard(filterExam).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterExam]);

  const topThree = useMemo(() => users.slice(0, 3), [users]);
  const rest = useMemo(() => users.slice(3), [users]);

  const renderTopThree = () => {
    // Layout: center top1, left top2, right top3
    const top1 = topThree[0];
    const top2 = topThree[1];
    const top3 = topThree[2];

    return (
      <LinearGradient colors={["#47006A", "#0031D0"]} style={styles.topGradient}>
        <Text style={styles.topTitle}>Top performers</Text>

        <View style={styles.topRow}>
          {/* 2nd place */}
          <View style={styles.topItem}>
            {top2 ? (
              <>
                <View style={styles.topBadge}>
                  <Text style={styles.rankText}>2</Text>
                </View>
                <Image
                  source={top2.avatar_url ? { uri: top2.avatar_url } : FALLBACK_AVATAR}
                  style={[styles.topAvatar, styles.avatarSmall]}
                />
                <Text style={styles.topName} numberOfLines={1}>
                  {top2.name || "-"}
                </Text>
                <Text style={styles.topCoins}>{top2.rookieCoinsEarned ?? 0} coins</Text>
              </>
            ) : (
              <>
                <View style={styles.topBadge}>
                  <Text style={styles.rankText}>2</Text>
                </View>
                <Image source={FALLBACK_AVATAR} style={[styles.topAvatar, styles.avatarSmall]} />
                <Text style={styles.topName}>-</Text>
                <Text style={styles.topCoins}>-</Text>
              </>
            )}
          </View>

          {/* 1st place (center, larger) */}
          <View style={styles.topItemCenter}>
            {top1 ? (
              <>
                <View style={styles.topBadgeCenter}>
                  <Text style={styles.rankTextCenter}>1</Text>
                </View>
                <Image
                  source={top1.avatar_url ? { uri: top1.avatar_url } : FALLBACK_AVATAR}
                  style={[styles.topAvatar, styles.avatarLarge]}
                />
                <Text style={styles.topNameCenter} numberOfLines={1}>
                  {top1.name || "-"}
                </Text>
                <Text style={styles.topCoinsCenter}>{top1.rookieCoinsEarned ?? 0} coins</Text>
              </>
            ) : (
              <>
                <View style={styles.topBadgeCenter}>
                  <Text style={styles.rankTextCenter}>1</Text>
                </View>
                <Image source={FALLBACK_AVATAR} style={[styles.topAvatar, styles.avatarLarge]} />
                <Text style={styles.topNameCenter}>-</Text>
                <Text style={styles.topCoinsCenter}>-</Text>
              </>
            )}
          </View>

          {/* 3rd place */}
          <View style={styles.topItem}>
            {top3 ? (
              <>
                <View style={styles.topBadge}>
                  <Text style={styles.rankText}>3</Text>
                </View>
                <Image
                  source={top3.avatar_url ? { uri: top3.avatar_url } : FALLBACK_AVATAR}
                  style={[styles.topAvatar, styles.avatarSmall]}
                />
                <Text style={styles.topName} numberOfLines={1}>
                  {top3.name || "-"}
                </Text>
                <Text style={styles.topCoins}>{top3.rookieCoinsEarned ?? 0} coins</Text>
              </>
            ) : (
              <>
                <View style={styles.topBadge}>
                  <Text style={styles.rankText}>3</Text>
                </View>
                <Image source={FALLBACK_AVATAR} style={[styles.topAvatar, styles.avatarSmall]} />
                <Text style={styles.topName}>-</Text>
                <Text style={styles.topCoins}>-</Text>
              </>
            )}
          </View>
        </View>
      </LinearGradient>
    );
  };

  const renderRow = ({ item, index }: { item: UserRow; index: number }) => {
    const globalRank = index + 4; // because this list starts after top 3
    const isCurrent = item.id === currentUserId;
    return (
      <View style={[styles.row, isCurrent && styles.currentUserRow]}>
        <View style={styles.rowLeft}>
          <View style={styles.rankBox}>
            <Text style={styles.rankBoxText}>{globalRank}</Text>
          </View>
          <Image
            source={item.avatar_url ? { uri: item.avatar_url } : FALLBACK_AVATAR}
            style={styles.rowAvatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName} numberOfLines={1}>
              {item.name ?? "-"}
            </Text>
            <Text style={styles.rowSub}>{item.exam ?? "-"}</Text>
          </View>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.rowCoins}>{item.rookieCoinsEarned ?? "-"}</Text>
        </View>
      </View>
    );
  };

  // If current user not in the top list, compute their rank and show at bottom sticky
  const currentUserEntry = useMemo(() => {
    if (!currentUserId || users.length === 0) return null;
    const idx = users.findIndex((u) => u.id === currentUserId);
    if (idx === -1) return null;
    const rank = idx + 1;
    const user = users[idx];
    return { rank, user };
  }, [users, currentUserId]);

  return (
    <View style={styles.container}>
      <ScrollView  showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {renderTopThree()}

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
            {examOptions.map((ex) => {
              const active = ex === filterExam;
              return (
                <TouchableOpacity
                  key={ex}
                  style={[styles.filterBtn, active && styles.filterBtnActive]}
                  onPress={() => setFilterExam(ex)}
                >
                  <Text style={[styles.filterBtnText, active && styles.filterBtnTextActive]}>{ex}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>Leaderboard</Text>
          <Text style={styles.listHeaderSub}>{users.length} users</Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 40 }}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : users.length === 0 ? (
          <View style={{ paddingVertical: 40 }}>
            <Text style={{ color: "#ccc", textAlign: "center" }}>No users with coins found</Text>
          </View>
        ) : (
          <>
            {/* Show top 3 rows separately for better rank numbers */}
            <FlatList
              data={rest}
              keyExtractor={(item) => item.id}
              renderItem={renderRow}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          </>
        )}
      </ScrollView>

      {/* Sticky current user card if present and not visible within the top few rows */}
      {currentUserEntry && (
        <View style={styles.stickyCurrent}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View style={styles.rankBoxSmall}>
              <Text style={styles.rankBoxSmallText}>{currentUserEntry.rank}</Text>
            </View>
            <Image
              source={currentUserEntry.user.avatar_url ? { uri: currentUserEntry.user.avatar_url } : FALLBACK_AVATAR}
              style={styles.rowAvatarSmall}
            />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.rowNameSmall} numberOfLines={1}>
                {currentUserEntry.user.name ?? "-"}
              </Text>
              <Text style={styles.rowSubSmall}>{currentUserEntry.user.exam ?? "-"}</Text>
            </View>
          </View>
          <Text style={styles.rowCoinsSmall}>{currentUserEntry.user.rookieCoinsEarned ?? "-"}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0C111D",
    paddingTop: Platform.OS === "android" ? 22 : 44,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  topGradient: {
    marginHorizontal: 12,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginBottom: 12,
    overflow: "hidden",
  },
  topTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
    fontFamily: "Geist",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  topItem: {
    flex: 1,
    alignItems: "center",
  },
  topItemCenter: {
    flex: 1.15,
    alignItems: "center",
  },
  topBadge: {
    position: "absolute",
    top: -8,
    left: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  topBadgeCenter: {
    position: "absolute",
    top: -10,
    left: "40%",
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    zIndex: 2,
  },
  rankText: {
    color: "#fff",
    fontWeight: "700",
  },
  rankTextCenter: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  topAvatar: {
    borderRadius: 999,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.14)",
  },
  avatarSmall: {
    width: 68,
    height: 68,
  },
  avatarLarge: {
    width: 108,
    height: 108,
  },
  topName: {
    marginTop: 8,
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    maxWidth: windowWidth * 0.22,
    textAlign: "center",
    fontFamily: "Geist",
  },
  topCoins: {
    color: "#E6E6F0",
    fontSize: 12,
    marginTop: 4,
    fontFamily: "Geist",
  },
  topNameCenter: {
    marginTop: 12,
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    maxWidth: windowWidth * 0.36,
    textAlign: "center",
    fontFamily: "Geist",
  },
  topCoinsCenter: {
    color: "#E6E6F0",
    fontSize: 13,
    marginTop: 6,
    fontWeight: "700",
    fontFamily: "Geist",
  },

  filterRow: {
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  filterBtn: {
    backgroundColor: "#101827",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#1D2939",
  },
  filterBtnActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  filterBtnText: {
    color: "#fff",
    fontFamily: "Geist",
  },
  filterBtnTextActive: {
    color: "#181f2b",
    fontWeight: "700",
  },

  listHeader: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listHeaderText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Geist",
  },
  listHeaderSub: {
    color: "#A8A8B3",
    fontSize: 13,
    fontFamily: "Geist",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: "#071024",
    borderWidth: 1,
    borderColor: "#121826",
  },
  currentUserRow: {
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rankBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#0F1724",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#1D2939",
  },
  rankBoxText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "Geist",
  },
  rowAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: "#222",
  },
  rowName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Geist",
  },
  rowSub: {
    color: "#A8A8B3",
    fontSize: 12,
    marginTop: 2,
    fontFamily: "Geist",
  },
  rowRight: {
    marginLeft: 8,
    alignItems: "flex-end",
    minWidth: 90,
  },
  rowCoins: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "Geist",
  },

  // Sticky current user at bottom
  stickyCurrent: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 18,
    backgroundColor: "#0E1622",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1D2939",
  },
  rankBoxSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#0F1724",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#1D2939",
  },
  rankBoxSmallText: {
    color: "#fff",
    fontWeight: "700",
  },
  rowAvatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  rowNameSmall: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    fontFamily: "Geist",
  },
  rowSubSmall: {
    color: "#A8A8B3",
    fontSize: 12,
    marginTop: 2,
    fontFamily: "Geist",
  },
  rowCoinsSmall: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});