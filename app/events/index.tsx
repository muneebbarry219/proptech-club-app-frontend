import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { CalendarDays, MapPin, Plus, Users } from "lucide-react-native";
import AppShell from "../../components/layout/AppShell";
import { useAuth } from "../../context/AuthContext";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../../constants/supabase";
import { getEventCoverSource } from "../../utils/eventOverrides";

const ADMIN_USER_ID = "59a93ce0-0570-4f71-897a-162b72decf7e";

type EventRow = {
  id: string; title: string; event_date: string; venue: string | null;
  description: string | null; location: string | null; cover_image: string | null;
  event_type: string; is_past: boolean; member_only: boolean;
  registration_type: "open" | "exclusive"; registration_deadline: string | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-PK", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function EventsScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const canAddEvents = Platform.OS === "android" && isAuthenticated && user?.id === ADMIN_USER_ID;
  const [events, setEvents] = useState<EventRow[]>([]);
  const [attendeeCounts, setAttendeeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());

  const loadEvents = useCallback(async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/events?is_published=eq.true&order=is_past.asc,event_date.asc&select=id,title,description,event_date,venue,location,cover_image,event_type,is_past,member_only,registration_type,registration_deadline`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      if (response.ok) {
        const rows: EventRow[] = await response.json();
        setEvents(rows);
        const counts = await Promise.all(rows.map(async event => {
          const countResponse = await fetch(`${SUPABASE_URL}/rest/v1/event_attendees?event_id=eq.${event.id}&status=eq.confirmed&select=id`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Prefer: "count=exact" } });
          const count = Number(countResponse.headers.get("content-range")?.split("/")[1] ?? 0);
          return [event.id, Number.isFinite(count) ? count : 0] as const;
        }));
        setAttendeeCounts(Object.fromEntries(counts));
      }
    } catch (error) {
      console.warn("[Events] Could not load events", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadEvents(); }, [loadEvents]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <AppShell>
      <View style={s.container}>
        {canAddEvents && (
          <View style={s.header}>
            <View>
              <Text style={s.headerTitle}>Events</Text>
              <Text style={s.headerSubtitle}>Manage club events</Text>
            </View>
            <TouchableOpacity
              style={s.addButton}
              activeOpacity={0.85}
              onPress={() => router.push("/events/create" as any)}
            >
              <Plus size={17} color="#FFF" strokeWidth={2.4} />
              <Text style={s.addButtonText}>Add event</Text>
            </TouchableOpacity>
          </View>
        )}
        {loading ? <View style={s.loader}><ActivityIndicator color="#312FB8" size="large" /></View> : (
          <FlatList
            data={events}
            keyExtractor={(event) => event.id}
            contentContainerStyle={[s.list, events.length === 0 && s.emptyList]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadEvents(); }} colors={["#312FB8"]} />}
            renderItem={({ item }) => {
              const registrationClosed = item.is_past || (!!item.registration_deadline && new Date(item.registration_deadline).getTime() <= now);
              const coverSource = getEventCoverSource(item);
              return <TouchableOpacity style={s.card} activeOpacity={0.88} onPress={() => router.push(`/events/${item.id}` as any)}>
                {coverSource ? <Image source={coverSource} style={s.cardCover} /> : <View style={s.cardCoverFallback}><CalendarDays size={28} color="#FFF" /></View>}
                <View style={s.cardBody}>
                  <View style={s.badgesRow}>
                    {item.registration_type === "exclusive" && (
                      <View style={[s.badge, registrationClosed ? s.closedBadge : s.openBadge]}>
                        <Text style={[s.badgeText, registrationClosed ? s.closedBadgeText : s.openBadgeText]}>{registrationClosed ? "REGISTRATIONS CLOSED" : "REGISTRATIONS OPEN"}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  {!!item.description && <Text style={s.cardDescription} numberOfLines={2} ellipsizeMode="tail">{item.description}</Text>}
                  <View style={s.metaInline}>
                    <View style={s.metaRow}><CalendarDays size={14} color="#312FB8" /><Text style={s.metaText}>{formatDate(item.event_date)}</Text></View>
                    {(item.venue || item.location) && <View style={s.metaRow}><MapPin size={14} color="#312FB8" /><Text style={s.metaText} numberOfLines={1}>{item.venue || item.location}</Text></View>}
                  </View>
                  <View style={s.attendingMeta}><Users size={14} color="#312FB8" /><Text style={s.attendingText}>{attendeeCounts[item.id] ?? 0} member(s) attending</Text></View>
                </View>
              </TouchableOpacity>;
            }}
            ListEmptyComponent={<View style={s.empty}>
          <View style={s.emptyIconWrap}>
            <View style={s.emptyIconCircleLg} />
            <View style={s.emptyIconCircleSm} />
            <View style={s.emptyIconInner}>
              <CalendarDays size={20} color="#312FB8" strokeWidth={2.1} />
            </View>
          </View>
          <Text style={s.emptyTitle}>No upcoming events</Text>
          <Text style={s.emptySub}>
            {canAddEvents
              ? "Tap Add event to publish the first event."
              : "New PropTech Club events will appear here when they are announced."}
          </Text>
        </View>}
          />
        )}
      </View>
    </AppShell>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8FC" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#FFF",
    borderBottomWidth: 0.5, borderBottomColor: "rgba(49,47,184,0.08)",
  },
  headerTitle: { fontSize: 17, fontFamily: "Outfit_800ExtraBold", color: "#1A1A2E" },
  headerSubtitle: { fontSize: 12, fontFamily: "Outfit_400Regular", color: "#999", marginTop: 2 },
  addButton: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#312FB8",
    paddingHorizontal: 13, paddingVertical: 9, borderRadius: 11,
  },
  addButtonText: { color: "#FFF", fontSize: 13, fontFamily: "Outfit_700Bold" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, paddingBottom: 36, gap: 14 }, emptyList: { flexGrow: 1 },
  card: { backgroundColor: "#FFF", borderRadius: 18, overflow: "hidden", borderWidth: 0.5, borderColor: "rgba(49,47,184,0.1)", elevation: 3 },
  cardCover: { width: "100%", height: 220 },
  cardCoverFallback: { width: "100%", height: 220, backgroundColor: "#312FB8", alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 14, gap: 7 }, badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, badge: { alignSelf: "flex-start", borderRadius: 12, backgroundColor: "#EEEDFE", paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 9, color: "#312FB8", fontFamily: "Outfit_700Bold" }, cardTitle: { fontSize: 16, color: "#1A1A2E", fontFamily: "Outfit_700Bold" },
  cardDescription: { fontSize: 13, lineHeight: 18, color: "#66677A", fontFamily: "Outfit_400Regular" },
  metaInline: { gap: 6, paddingHorizontal: 0, marginHorizontal: 0, marginTop: 2 },
  memberBadge: { backgroundColor: "#F4EBFF" }, memberBadgeText: { color: "#6941C6" },
  publicBadge: { backgroundColor: "#EAF7F2" }, publicBadgeText: { color: "#087A5B" },
  openBadge: { backgroundColor: "#E7F8EE" }, openBadgeText: { color: "#087A46" },
  closedBadge: { backgroundColor: "#FEF3F2" }, closedBadgeText: { color: "#B42318" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 0, marginHorizontal: 0 },
  metaText: { flex: 1, fontSize: 12, color: "#312FB8", fontFamily: "Outfit_600SemiBold" },
  attendingMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }, attendingText: { fontSize: 12, color: "#312FB8", fontFamily: "Outfit_600SemiBold" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 80,
    gap: 12,
  },
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
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Outfit_700Bold",
    letterSpacing: 0,
    color: "#1A1A2E",
    textAlign: "center",
  },
  emptySub: {
    maxWidth: 280,
    fontSize: 13,
    color: "#AAA",
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "Outfit_400Regular",
    letterSpacing: 0,
  },
});
