import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarDays } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import AppShell from "../../components/layout/AppShell";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../constants/supabase";

// ── Types ──────────────────────────────────────────────────────

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  venue: string | null;
  location: string | null;
  event_type: string;
  registration_type: "open" | "exclusive";
  registration_url: string | null;
  report_url: string | null;
  cover_image: string | null;
  is_featured: boolean;
  is_past: boolean;
  attendee_count?: number;
  speaker_count?: number;
  sponsor_count?: number;
  user_status?: "confirmed" | "pending" | null;
}

// ── Constants ──────────────────────────────────────────────────

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  convention:  { bg: "#312FB8", text: "#fff" },
  meetup:      { bg: "#0F6E56", text: "#fff" },
  workshop:    { bg: "#854F0B", text: "#fff" },
  webinar:     { bg: "#185FA5", text: "#fff" },
  conference:  { bg: "#993556", text: "#fff" },
};

type FilterType = "All" | "This Week" | "This Month" | "Upcoming" | "Past";

const FILTERS: FilterType[] = ["All", "This Week", "This Month", "Upcoming", "Past"];

// ── Helpers ────────────────────────────────────────────────────

function formatDateRange(start: string, end: string | null) {
  const s = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  if (!end) return s.toLocaleDateString("en-GB", opts);
  const e = new Date(end);
  if (s.toDateString() === e.toDateString()) return s.toLocaleDateString("en-GB", opts);
  const sStr = s.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const eStr = e.toLocaleDateString("en-GB", opts);
  return `${sStr} – ${eStr}`;
}

function isThisWeek(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diff = day === 0 ? 6 : day - 1;
  startOfWeek.setDate(startOfWeek.getDate() - diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  return date >= startOfWeek && date < endOfWeek;
}

function isThisMonth(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function publicFetch(path: string) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
}

// ── Event Card ─────────────────────────────────────────────────

function EventCard({ event, onPress }: { event: Event; onPress: () => void }) {
  const typeColor = TYPE_COLORS[event.event_type] ?? TYPE_COLORS.convention;
  const isPast = event.is_past;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={s.card}>
      {/* Banner */}
      <View style={[s.banner, isPast && s.bannerPast, { backgroundColor: isPast ? "#444441" : typeColor.bg }]}>
        <View style={s.bannerBadges}>
          <View style={s.typePill}>
            <Text style={s.typePillTxt}>{event.event_type.toUpperCase()}</Text>
          </View>
          {isPast ? (
            <View style={s.pastBadge}>
              <Text style={s.pastBadgeTxt}>POST EVENT</Text>
            </View>
          ) : (
            <View style={[s.regPill, event.registration_type === "exclusive" && s.regPillExcl]}>
              <Text style={[s.regPillTxt, event.registration_type === "exclusive" && s.regPillTxtExcl]}>
                {event.registration_type === "open" ? "OPEN" : "EXCLUSIVE"}
              </Text>
            </View>
          )}
        </View>
        {event.is_featured && !isPast && (
          <View style={s.featuredBadge}>
            <Text style={s.featuredTxt}>⭐ FEATURED</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={2}>{event.title}</Text>
        <Text style={s.cardMeta}>
          📅 {formatDateRange(event.event_date, event.end_date)}
          {event.venue ? `  📍 ${event.venue}` : event.location ? `  📍 ${event.location}` : ""}
        </Text>

        <View style={s.statsRow}>
          {(event.attendee_count ?? 0) > 0 && (
            <Text style={s.statTxt}><Text style={s.statVal}>{event.attendee_count}</Text> {isPast ? "attended" : "attending"}</Text>
          )}
          {(event.speaker_count ?? 0) > 0 && (
            <Text style={s.statTxt}><Text style={s.statVal}>{event.speaker_count}</Text> speakers</Text>
          )}
          {(event.sponsor_count ?? 0) > 0 && (
            <Text style={s.statTxt}><Text style={s.statVal}>{event.sponsor_count}</Text> sponsors</Text>
          )}
        </View>

        <View style={s.cardFooter}>
          {/* Attendee avatars */}
          <View style={s.attRow}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[s.attDot, { marginLeft: i > 0 ? -6 : 0, zIndex: 3 - i, backgroundColor: isPast ? "#888" : "#312FB8" }]}>
                <Text style={{ color: "#fff", fontSize: 7, fontWeight: "700" }}>{String.fromCharCode(65 + i)}</Text>
              </View>
            ))}
            {(event.attendee_count ?? 0) > 3 && (
              <Text style={s.attCount}>+{(event.attendee_count ?? 0) - 3} more</Text>
            )}
          </View>

          {/* Action button */}
          {isPast ? (
            event.report_url ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(event.report_url!)}
                style={s.reportBtn}
                activeOpacity={0.8}
              >
                <Text style={s.reportBtnTxt}>📄 Download Report</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.viewBtn}>
                <Text style={s.viewBtnTxt}>View Details</Text>
              </View>
            )
          ) : event.user_status === "confirmed" ? (
            <View style={s.attendingBadge}>
              <Text style={s.attendingTxt}>✓ Attending</Text>
            </View>
          ) : event.user_status === "pending" ? (
            <View style={s.pendingBadge}>
              <Text style={s.pendingTxt}>⏳ Pending</Text>
            </View>
          ) : event.registration_type === "open" ? (
            <View style={s.rsvpBtn}>
              <Text style={s.rsvpTxt}>RSVP Free →</Text>
            </View>
          ) : (
            <View style={s.exclBtn}>
              <Text style={s.exclTxt}>Request Access</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────

export default function EventsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user, apiFetch, isAuthenticated } = useAuth();

  const [events,    setEvents]    = useState<Event[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [filter,    setFilter]    = useState<FilterType>("All");

  const load = useCallback(async () => {
    try {
      const res = await publicFetch(
        `/events?is_published=eq.true&order=is_past.asc,is_featured.desc,event_date.asc&select=id,title,description,event_date,end_date,venue,location,event_type,registration_type,registration_url,report_url,cover_image,is_featured,is_past`
      );
      if (!res.ok) return;
      const raw: Event[] = await res.json();

      // Get counts for each event
      const withCounts = await Promise.all(raw.map(async e => {
        const [attRes, spkRes, spsRes] = await Promise.all([
          publicFetch(`/event_attendees?event_id=eq.${e.id}&status=eq.confirmed&select=id`),
          publicFetch(`/event_speakers?event_id=eq.${e.id}&select=id`),
          publicFetch(`/event_sponsors?event_id=eq.${e.id}&select=id`),
        ]);
        const att = attRes.ok ? (await attRes.json()).length : 0;
        const spk = spkRes.ok ? (await spkRes.json()).length : 0;
        const sps = spsRes.ok ? (await spsRes.json()).length : 0;

        // Get user's attendance status if logged in
        let userStatus: Event["user_status"] = null;
        if (isAuthenticated && user) {
          const uRes = await apiFetch(`/event_attendees?event_id=eq.${e.id}&user_id=eq.${user.id}&select=status`);
          if (uRes.ok) {
            const rows = await uRes.json();
            userStatus = rows[0]?.status ?? null;
          }
        }

        return { ...e, attendee_count: att, speaker_count: spk, sponsor_count: sps, user_status: userStatus };
      }));

      setEvents(withCounts);
    } catch (err) {
      console.warn("[Events] load error", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const filtered = events.filter((event) => {
    if (filter === "All") return true;
    if (filter === "This Week") return isThisWeek(event.event_date);
    if (filter === "This Month") return isThisMonth(event.event_date);
    if (filter === "Upcoming") return !event.is_past;
    return event.is_past;
  });

  const upcoming = filtered.filter(e => !e.is_past);
  const past     = filtered.filter(e => e.is_past);

  const renderSection = (items: Event[], label: string) => {
    if (items.length === 0) return null;
    return (
      <>
        <Text style={s.sectionLabel}>{label}</Text>
        {items.map(e => (
          <EventCard
            key={e.id}
            event={e}
            onPress={() => router.push(`/events/${e.id}` as any)}
          />
        ))}
      </>
    );
  };

  return (
    <AppShell>
      <View style={s.container}>
        {/* Header */}
        <View style={s.stickyHead}>
          {/* Filter chips */}
          <FlatList
            data={FILTERS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={f => f}
            contentContainerStyle={s.filterList}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setFilter(item)}
                style={[s.filterChip, filter === item && s.filterChipOn]}
                activeOpacity={0.8}
              >
                <Text style={[s.filterChipTxt, filter === item && s.filterChipTxtOn]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {loading ? (
          <View style={s.loader}><ActivityIndicator color="#312FB8" size="large" /></View>
        ) : (
          <FlatList
            data={[]}
            renderItem={null}
            keyExtractor={() => "dummy"}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); load(); }}
                tintColor="#312FB8"
              />
            }
            ListHeaderComponent={
              <View style={{ paddingBottom: 24 }}>
                {upcoming.length === 0 && past.length === 0 ? (
                  <View style={s.empty}>
                    <View style={s.emptyIconWrap}>
                      <View style={s.emptyIconCircleLg} />
                      <View style={s.emptyIconCircleSm} />
                      <View style={s.emptyIconInner}>
                        <CalendarDays size={20} color="#312FB8" strokeWidth={2.1} />
                      </View>
                    </View>
                    <Text style={s.emptyTitle}>No events found</Text>
                    <Text style={s.emptySub}>Try a different filter</Text>
                  </View>
                ) : (
                  <>
                    {renderSection(upcoming, "Upcoming")}
                    {renderSection(past, "Past Events")}
                  </>
                )}
              </View>
            }
          />
        )}
      </View>
    </AppShell>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#F8F8FC" },
  stickyHead:      { backgroundColor: "#FFF", borderBottomWidth: 0.5, borderBottomColor: "rgba(49,47,184,0.08)" },
  filterList:      { paddingHorizontal: 16, gap: 8, paddingTop: 10, paddingBottom: 12 },
  filterChip:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(49,47,184,0.15)", backgroundColor: "#FFF" },
  filterChipOn:    { backgroundColor: "#312FB8", borderColor: "#312FB8" },
  filterChipTxt:   { fontSize: 12, fontFamily: "Outfit_400Regular", letterSpacing: 0, color: "#555" },
  filterChipTxtOn: { color: "#FFF", fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  sectionLabel:    { fontSize: 11, fontFamily: "Outfit_600SemiBold", color: "#9BA3B8", letterSpacing: 0.5, textTransform: "uppercase", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  card:            { backgroundColor: "#FFF", borderRadius: 16, borderWidth: 0.5, borderColor: "rgba(49,47,184,0.08)", overflow: "hidden", marginHorizontal: 16, marginBottom: 10 },
  banner:          { height: 88, justifyContent: "space-between", padding: 12, flexDirection: "row", alignItems: "flex-start" },
  bannerPast:      { backgroundColor: "#444441" },
  bannerBadges:    { flexDirection: "row", gap: 6 },
  typePill:        { backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  typePillTxt:     { color: "#FFF", fontSize: 9, fontFamily: "Outfit_600SemiBold", letterSpacing: 0.3 },
  pastBadge:       { backgroundColor: "#EF9F27", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  pastBadgeTxt:    { color: "#412402", fontSize: 9, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  regPill:         { backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  regPillExcl:     { backgroundColor: "rgba(212,83,126,0.25)", borderColor: "rgba(212,83,126,0.4)" },
  regPillTxt:      { color: "#FFF", fontSize: 9, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  regPillTxtExcl:  { color: "#F4C0D1" },
  featuredBadge:   { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  featuredTxt:     { color: "#FFF", fontSize: 9, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  cardBody:        { padding: 13 },
  cardTitle:       { fontSize: 14, fontFamily: "Outfit_700Bold", letterSpacing: 0, color: "#1A1A2E", marginBottom: 4 },
  cardMeta:        { fontSize: 11, color: "#888", marginBottom: 8, fontFamily: "Outfit_400Regular", letterSpacing: 0 },
  statsRow:        { flexDirection: "row", gap: 12, marginBottom: 8 },
  statTxt:         { fontSize: 10, color: "#555", fontFamily: "Outfit_400Regular", letterSpacing: 0 },
  statVal:         { fontFamily: "Outfit_700Bold", color: "#312FB8" },
  cardFooter:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTopWidth: 0.5, borderTopColor: "rgba(49,47,184,0.06)" },
  attRow:          { flexDirection: "row", alignItems: "center" },
  attDot:          { width: 20, height: 20, borderRadius: 6, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#FFF" },
  attCount:        { fontSize: 10, color: "#555", fontFamily: "Outfit_600SemiBold", letterSpacing: 0, marginLeft: 8 },
  rsvpBtn:         { backgroundColor: "#312FB8", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  rsvpTxt:         { color: "#FFF", fontSize: 10, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  exclBtn:         { backgroundColor: "#FBEAF0", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "rgba(153,53,86,0.2)" },
  exclTxt:         { color: "#72243E", fontSize: 10, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  reportBtn:       { backgroundColor: "#FAEEDA", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  reportBtnTxt:    { color: "#633806", fontSize: 10, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  viewBtn:         { backgroundColor: "#EEEDFE", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  viewBtnTxt:      { color: "#312FB8", fontSize: 10, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  attendingBadge:  { backgroundColor: "#E1F5EE", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  attendingTxt:    { color: "#085041", fontSize: 10, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  pendingBadge:    { backgroundColor: "#FAEEDA", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  pendingTxt:      { color: "#633806", fontSize: 10, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  loader:          { flex: 1, alignItems: "center", justifyContent: "center" },
  empty:           { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#EEEDFE",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.10)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  emptyIconCircleLg: {
    position: "absolute",
    right: -12,
    top: -12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(49,47,184,0.08)",
  },
  emptyIconCircleSm: {
    position: "absolute",
    right: 10,
    top: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(49,47,184,0.06)",
  },
  emptyIconInner: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle:      { fontSize: 16, fontFamily: "Outfit_700Bold", letterSpacing: 0, color: "#1A1A2E" },
  emptySub:        { fontSize: 13, color: "#AAA", fontFamily: "Outfit_400Regular", letterSpacing: 0 },
});
