import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Linking, ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import AppShell from "../../components/layout/AppShell";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../constants/supabase";
import { applyCuratedEventOverrides, getEventCoverSource } from "../../utils/eventOverrides";

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
  member_only?: boolean;
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
  const coverSource = getEventCoverSource(event);
  const ctaLabel = isPast
    ? event.report_url ? "Download Report" : "View Details"
    : event.user_status === "confirmed"
      ? "Attending"
      : event.user_status === "pending"
        ? "Pending"
        : event.member_only
          ? "Join Event"
          : event.registration_type === "open"
            ? "Join Event"
            : "Request Access";

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={s.card}>
      {/* Banner */}
      <ImageBackground
        source={coverSource ?? undefined}
        style={[s.banner, isPast && s.bannerPast, { backgroundColor: isPast ? "#444441" : typeColor.bg }]}
        imageStyle={s.bannerImage}
      >
        <View style={s.bannerOverlay}>
          <View style={s.bannerBadges}>
            <View style={s.typePill}>
              <Text style={s.typePillTxt}>PROPTECH CLUB</Text>
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
        </View>
      </ImageBackground>

      {/* Body */}
      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={2}>{event.title}</Text>
        <View style={s.metaStack}>
          <View style={s.metaRow}>
            <CalendarDays size={13} color="#6D7390" strokeWidth={1.9} />
            <Text style={s.cardMeta}>{formatDateRange(event.event_date, event.end_date)}</Text>
          </View>
          {(event.venue || event.location) && (
            <View style={s.metaRow}>
              <MapPin size={13} color="#6D7390" strokeWidth={1.9} />
              <Text style={s.cardMeta}>{event.venue ?? event.location}</Text>
            </View>
          )}
        </View>

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

        <View style={s.cardActionRow}>
          {isPast ? (
            event.report_url ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(event.report_url!)}
                style={s.bannerReportBtn}
                activeOpacity={0.85}
              >
                <Text style={s.bannerReportBtnTxt}>{ctaLabel}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onPress} style={s.bannerViewBtn} activeOpacity={0.85}>
                <Text style={s.bannerViewBtnTxt}>{ctaLabel}</Text>
              </TouchableOpacity>
            )
          ) : event.user_status === "confirmed" ? (
            <View style={s.bannerAttendingBadge}>
              <Text style={s.bannerAttendingTxt}>{ctaLabel}</Text>
            </View>
          ) : event.user_status === "pending" ? (
            <View style={s.bannerPendingBadge}>
              <Text style={s.bannerPendingTxt}>{ctaLabel}</Text>
            </View>
          ) : event.member_only ? (
            <TouchableOpacity onPress={onPress} style={s.bannerJoinBtn} activeOpacity={0.85}>
              <Text style={s.bannerJoinBtnTxt}>{ctaLabel}</Text>
              <ArrowRight size={13} color="#FFF" strokeWidth={2.2} />
            </TouchableOpacity>
          ) : event.registration_type === "open" ? (
            <TouchableOpacity onPress={onPress} style={s.bannerJoinBtn} activeOpacity={0.85}>
              <Text style={s.bannerJoinBtnTxt}>{ctaLabel}</Text>
              <ArrowRight size={13} color="#FFF" strokeWidth={2.2} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onPress} style={s.bannerExclusiveBtn} activeOpacity={0.85}>
              <Text style={s.bannerExclusiveTxt}>{ctaLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────

export default function EventsScreen() {
  const router  = useRouter();
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
      const curated = applyCuratedEventOverrides(raw);

      // Get counts for each event
      const withCounts = await Promise.all(curated.map(async e => {
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

        return {
          ...e,
          attendee_count: att,
          speaker_count: e.member_only ? 0 : spk,
          sponsor_count: e.member_only ? 0 : sps,
          user_status: userStatus,
        };
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
            data={["events-content"]}
            renderItem={() => null}
            keyExtractor={(item) => item}
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
  card:            {
    backgroundColor: "#FFF",
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: "rgba(49,47,184,0.08)",
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 14,
    shadowColor: "#1B196A",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 8,
  },
  banner:          { minHeight: 132, justifyContent: "flex-start", padding: 14, flexDirection: "row", alignItems: "flex-start" },
  bannerImage:     { resizeMode: "cover" },
  bannerOverlay:   { flex: 1, backgroundColor: "rgba(16, 16, 34, 0.32)", margin: -14, padding: 14 },
  bannerPast:      { backgroundColor: "#444441" },
  bannerBadges:    { flexDirection: "row", gap: 6 },
  typePill:        { backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typePillTxt:     { color: "#FFF", fontSize: 9, fontFamily: "Outfit_600SemiBold", letterSpacing: 0.5 },
  pastBadge:       { backgroundColor: "#EF9F27", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  pastBadgeTxt:    { color: "#412402", fontSize: 9, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  regPill:         { backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  regPillExcl:     { backgroundColor: "rgba(212,83,126,0.25)", borderColor: "rgba(212,83,126,0.4)" },
  regPillTxt:      { color: "#FFF", fontSize: 9, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  regPillTxtExcl:  { color: "#F4C0D1" },
  cardBody:        { padding: 13 },
  cardTitle:       { fontSize: 14, fontFamily: "Outfit_700Bold", letterSpacing: 0, color: "#1A1A2E", marginBottom: 4 },
  metaStack:       { gap: 6, marginBottom: 10 },
  metaRow:         { flexDirection: "row", alignItems: "center", gap: 6 },
  cardMeta:        { fontSize: 11, color: "#666D86", fontFamily: "Outfit_400Regular", letterSpacing: 0, flexShrink: 1 },
  statsRow:        { flexDirection: "row", gap: 12, marginBottom: 2 },
  statTxt:         { fontSize: 10, color: "#555", fontFamily: "Outfit_400Regular", letterSpacing: 0 },
  statVal:         { fontFamily: "Outfit_700Bold", color: "#312FB8" },
  cardActionRow:   { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  bannerJoinBtn:   { backgroundColor: "#312FB8", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 6, shadowColor: "#100F34", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 5 },
  bannerJoinBtnTxt:{ color: "#FFF", fontSize: 10, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  bannerExclusiveBtn: { backgroundColor: "#FBEAF0", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "rgba(153,53,86,0.25)" },
  bannerExclusiveTxt: { color: "#72243E", fontSize: 10, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  bannerReportBtn: { backgroundColor: "#FAEEDA", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  bannerReportBtnTxt: { color: "#633806", fontSize: 10, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  bannerViewBtn:   { backgroundColor: "#EEEDFE", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  bannerViewBtnTxt:{ color: "#312FB8", fontSize: 10, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  bannerAttendingBadge: { backgroundColor: "#E1F5EE", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  bannerAttendingTxt: { color: "#085041", fontSize: 10, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  bannerPendingBadge: { backgroundColor: "#FAEEDA", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  bannerPendingTxt: { color: "#633806", fontSize: 10, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
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
