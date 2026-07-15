import { useEffect, useRef, useState } from "react";
import { Animated, View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import {
  connectionNotificationSnapshot,
  getReadNotificationKeys,
  getNotificationsSeenAt,
  getSeenConnectionNotificationSnapshot,
  type ConnectionNotificationSnapshotRecord,
} from "../../app/notifications/notification-read-state";

const EVENT_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

function initials(name: string) {
  return name.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase();
}

export default function AppHeader() {
  const router  = useRouter();
  const pathname = usePathname();
  const insets  = useSafeAreaInsets();
  const { user, profile, isAuthenticated, apiFetch, connectionSyncTick, messageSyncTick } = useAuth();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const bellBuzz = useRef(new Animated.Value(0)).current;

  const avatarUrl    = profile?.avatar_url ?? null;
  const displayName  = profile?.full_name ?? "";

  // Cache-bust using updated_at so image refreshes after upload
  const displayUri = avatarUrl
    ? avatarUrl.includes("?")
      ? avatarUrl
      : `${avatarUrl}?t=${profile?.updated_at ?? ""}`
    : null;

  useEffect(() => {
    if (unreadNotificationCount <= 0) {
      bellBuzz.stopAnimation();
      bellBuzz.setValue(0);
      return;
    }

    const runBuzz = () => {
      bellBuzz.setValue(0);
      Animated.sequence([
        Animated.timing(bellBuzz, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(bellBuzz, { toValue: -1, duration: 70, useNativeDriver: true }),
        Animated.timing(bellBuzz, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(bellBuzz, { toValue: -1, duration: 70, useNativeDriver: true }),
        Animated.timing(bellBuzz, { toValue: 0, duration: 90, useNativeDriver: true }),
      ]).start();
    };

    runBuzz();
    const intervalId = setInterval(runBuzz, 5000);

    return () => {
      clearInterval(intervalId);
      bellBuzz.stopAnimation();
      bellBuzz.setValue(0);
    };
  }, [bellBuzz, unreadNotificationCount]);

  useEffect(() => {
    let active = true;

    const checkUnreadNotifications = async () => {
      if (!isAuthenticated || !user) {
        if (active) setUnreadNotificationCount(0);
        return;
      }

      if (pathname.startsWith("/notifications")) {
        if (active) setUnreadNotificationCount(0);
        return;
      }

      try {
        const [seenAt, seenSnapshot, readNotificationKeys] = await Promise.all([
          getNotificationsSeenAt(user.id),
          getSeenConnectionNotificationSnapshot(user.id),
          getReadNotificationKeys(user.id),
        ]);
        const readKeySet = new Set(readNotificationKeys);
        let res = await apiFetch(
          `/connections?or=(requester_id.eq.${user.id},receiver_id.eq.${user.id})&status=in.(pending,accepted,declined)&select=id,requester_id,receiver_id,status,created_at,updated_at&order=updated_at.desc&limit=20`
        );

        if (!res.ok) {
          res = await apiFetch(
            `/connections?or=(requester_id.eq.${user.id},receiver_id.eq.${user.id})&status=in.(pending,accepted,declined)&select=id,requester_id,receiver_id,status,created_at&order=created_at.desc&limit=20`
          );
        }

        if (!active) return;

        if (!res.ok) {
          setUnreadNotificationCount(0);
          return;
        }

        const rows: Array<ConnectionNotificationSnapshotRecord & {
          requester_id: string;
          receiver_id: string;
          status: "pending" | "accepted" | "declined";
          created_at?: string | null;
          updated_at?: string | null;
        }> = await res.json();
        const relevantRows = rows.filter(
          (row) =>
            (row.status === "pending" && row.receiver_id === user.id) ||
            row.status === "accepted" ||
            (row.status === "declined" && row.requester_id === user.id)
        );
        const latestNotificationAt = relevantRows.reduce((latest, row) => {

          const stamp = row.updated_at ?? row.created_at;
          const time = stamp ? new Date(stamp).getTime() : 0;
          return Number.isFinite(time) && time > latest ? time : latest;
        }, 0);

        const currentSnapshot = connectionNotificationSnapshot(relevantRows);
        const unreadMessagesRes = await apiFetch(
          `/direct_messages?receiver_id=eq.${user.id}&is_read=eq.false&select=sender_id,created_at&order=created_at.desc`
        );
        const unreadMessages: Array<{ sender_id?: string | null; created_at?: string | null }> = unreadMessagesRes.ok
          ? await unreadMessagesRes.json()
          : [];
        const latestUnreadMessageAt = unreadMessages[0]?.created_at
          ? new Date(unreadMessages[0].created_at).getTime()
          : 0;
        const unreadMessageConversationCount = new Set(
          unreadMessages.map((message) => message.sender_id).filter(Boolean)
        ).size;
        const connectionUnreadCount =
          currentSnapshot !== seenSnapshot || latestNotificationAt > seenAt ? 1 : 0;
        const messageUnreadCount = latestUnreadMessageAt > seenAt ? unreadMessageConversationCount : 0;
        let eventUnreadCount = 0;
        let attendeesRes = await apiFetch(
          `/event_attendees?user_id=eq.${user.id}&status=eq.confirmed&select=id,event_id,status,created_at,updated_at&order=updated_at.desc&limit=30`
        );

        if (!attendeesRes.ok) {
          attendeesRes = await apiFetch(
            `/event_attendees?user_id=eq.${user.id}&status=eq.confirmed&select=id,event_id,status,created_at&order=created_at.desc&limit=30`
          );
        }

        if (attendeesRes.ok) {
          const attendees: Array<{
            id: string;
            event_id?: string | null;
            status?: string | null;
            created_at?: string | null;
            updated_at?: string | null;
          }> = await attendeesRes.json();
          const eventIds = Array.from(new Set(attendees.map((attendee) => attendee.event_id).filter(Boolean)));

          if (eventIds.length) {
            const eventsRes = await apiFetch(
              `/events?id=in.(${eventIds.join(",")})&select=id,event_date`
            );
            const events: Array<{ id: string; event_date?: string | null }> = eventsRes.ok ? await eventsRes.json() : [];
            const eventsById = new Map(events.map((eventItem) => [eventItem.id, eventItem]));
            const now = Date.now();

            eventUnreadCount = attendees.reduce((count, attendee) => {
              if (!attendee.event_id) return count;

              const registrationKey = `event-registration-${attendee.id}-${attendee.status ?? "confirmed"}`;
              const registrationTime = attendee.updated_at ?? attendee.created_at;
              const registrationAt = registrationTime ? new Date(registrationTime).getTime() : 0;
              const hasUnreadRegistration =
                Number.isFinite(registrationAt) &&
                registrationAt > seenAt &&
                !readKeySet.has(registrationKey);
              const eventItem = eventsById.get(attendee.event_id);
              const eventAt = eventItem?.event_date ? new Date(eventItem.event_date).getTime() : 0;
              const reminderAt = eventAt - EVENT_REMINDER_WINDOW_MS;
              const reminderKey = `event-reminder-${attendee.event_id}-${eventItem?.event_date ?? ""}`;
              const hasUnreadReminder =
                Number.isFinite(eventAt) &&
                eventAt > now &&
                eventAt - now <= EVENT_REMINDER_WINDOW_MS &&
                reminderAt > seenAt &&
                !readKeySet.has(reminderKey);

              return count + (hasUnreadRegistration ? 1 : 0) + (hasUnreadReminder ? 1 : 0);
            }, 0);
          }
        }
        const articlesRes = await apiFetch(
          `/articles?is_published=eq.true&published_at=gt.${new Date(seenAt).toISOString()}&order=published_at.desc&limit=30&select=id,published_at`
        );
        const unreadArticleCount = articlesRes.ok
          ? ((await articlesRes.json()) as Array<{ id: string; published_at?: string | null }>).filter((article) => {
              if (!article.published_at) return false;
              return !readKeySet.has(`article-${article.id}-${article.published_at}`);
            }).length
          : 0;

        setUnreadNotificationCount(connectionUnreadCount + messageUnreadCount + eventUnreadCount + unreadArticleCount);
      } catch {
        if (active) setUnreadNotificationCount(0);
      }
    };

    void checkUnreadNotifications();

    return () => {
      active = false;
    };
  }, [apiFetch, connectionSyncTick, isAuthenticated, messageSyncTick, pathname, user]);

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.headerLeft}>
        <Image
          source={require("../../assets/icon-contained.png")}
          style={styles.logoMark}
          resizeMode="contain"
        />
        <Text style={styles.logoName}>PropTech Club</Text>
      </View>

      <View style={styles.headerRight}>
        <TouchableOpacity
          onPress={() => router.push("/notifications" as any)}
          style={styles.notificationBtn}
          activeOpacity={0.85}
        >
          <Animated.View
            style={{
              transform: [
                { translateX: bellBuzz.interpolate({ inputRange: [-1, 0, 1], outputRange: [-1.5, 0, 1.5] }) },
                { rotate: bellBuzz.interpolate({ inputRange: [-1, 0, 1], outputRange: ["-10deg", "0deg", "10deg"] }) },
              ],
            }}
          >
            <Bell size={19} color="#312FB8" strokeWidth={2.2} />
          </Animated.View>
          {unreadNotificationCount > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
        {isAuthenticated ? (
          <TouchableOpacity
            onPress={() => router.push("/auth/profile" as any)}
            style={styles.avatarBtn}
            activeOpacity={0.85}
          >
            {displayUri ? (
              <Image
                source={{ uri: displayUri }}
                style={styles.avatarImg}
              />
            ) : (
              <Text style={styles.avatarTxt}>
                {displayName ? initials(displayName) : "?"}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => router.push("/auth/sign-in" as any)}
            style={styles.signInBtn}
          >
            <Text style={styles.signInTxt}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(49,47,184,0.08)",
  },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 6 },
  logoMark:    { width: 48, height: 48 },
  logoName:    { fontSize: 20, fontFamily: "BebasNeue", color: "#1B196A", letterSpacing: 0.3 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  notificationBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EEEDFE",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -5,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#E53935",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    lineHeight: 11,
    fontFamily: "Outfit_700Bold",
    letterSpacing: 0,
  },
  avatarBtn:   { width: 34, height: 34, borderRadius: 10, backgroundColor: "#312FB8", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg:   { width: 34, height: 34, borderRadius: 10 },
  avatarTxt:   { color: "#fff", fontSize: 12, fontWeight: "700" },
  signInBtn:   { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: "#EEEDFE", borderWidth: 1, borderColor: "rgba(49,47,184,0.2)" },
  signInTxt:   { fontSize: 13, fontFamily: "Outfit_600SemiBold", color: "#312FB8" },
});
