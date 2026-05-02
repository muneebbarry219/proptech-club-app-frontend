import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Bell, BellRing, ChevronRight } from "lucide-react-native";
import { type Href, useRouter } from "expo-router";
import AppShell from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";

interface NotificationRow {
  id: string;
  type: "signup_welcome" | "connection_request" | "direct_message";
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  created_at: string;
}

function formatNotificationTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function typeLabel(type: NotificationRow["type"]) {
  switch (type) {
    case "signup_welcome":
      return "Welcome";
    case "connection_request":
      return "Connection";
    case "direct_message":
      return "Message";
  }

  return "Notification";
}

function isNotificationRow(value: unknown): value is NotificationRow {
  if (!value || typeof value !== "object") return false;

  const row = value as Record<string, unknown>;
  const validTypes: NotificationRow["type"][] = [
    "signup_welcome",
    "connection_request",
    "direct_message",
  ];

  return (
    typeof row.id === "string" &&
    typeof row.type === "string" &&
    validTypes.includes(row.type as NotificationRow["type"]) &&
    typeof row.title === "string" &&
    typeof row.body === "string" &&
    typeof row.created_at === "string" &&
    (row.data === null || (typeof row.data === "object" && !Array.isArray(row.data)))
  );
}

function parseNotificationRows(value: unknown) {
  return Array.isArray(value) ? value.filter(isNotificationRow) : [];
}

function getNotificationRoute(data: NotificationRow["data"]): Href | null {
  return typeof data?.route === "string" ? (data.route as Href) : null;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { apiFetch, isAuthenticated, isLoading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch(
        "/push_notification_events?select=id,type,title,body,data,created_at&order=created_at.desc&limit=50"
      );
      if (res.ok) {
        const payload: unknown = await res.json();
        setNotifications(parseNotificationRows(payload));
      }
    } catch (error) {
      console.warn("[Notifications] load failed", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiFetch, isAuthenticated]);

  useEffect(() => {
    if (isLoading) return;
    load();
  }, [isLoading, load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handlePress = (item: NotificationRow) => {
    const route = getNotificationRoute(item.data);
    if (route) {
      router.push(route);
    }
  };

  if (isLoading || loading) {
    return (
      <AppShell>
        <View style={styles.center}>
          <ActivityIndicator color="#312FB8" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </AppShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <AppShell>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Bell size={28} color="#312FB8" />
          </View>
          <Text style={styles.emptyTitle}>Sign in to see notifications</Text>
          <Text style={styles.emptyText}>
            Your welcome messages and future activity updates will appear here.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/auth/sign-in")}
            style={styles.primaryBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <View style={styles.screen}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <BellRing size={28} color="#FFFFFF" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              Welcome updates and important activity from your PropTech network.
            </Text>
          </View>
        </View>

        <FlatList<NotificationRow>
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={notifications.length ? styles.listContent : styles.emptyListContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#312FB8" />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Bell size={26} color="#312FB8" />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>
                When a welcome notification is sent, it will show up here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const canOpen = Boolean(getNotificationRoute(item.data));

            return (
              <TouchableOpacity
                onPress={() => handlePress(item)}
                activeOpacity={canOpen ? 0.8 : 1}
                style={styles.card}
              >
                <View style={styles.cardIcon}>
                  <Bell size={18} color="#312FB8" />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardType}>{typeLabel(item.type)}</Text>
                    <Text style={styles.cardTime}>{formatNotificationTime(item.created_at)}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardText}>{item.body}</Text>
                </View>
                {canOpen && <ChevronRight size={18} color="#B6BAD4" />}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 13, color: "#777D98", fontFamily: "Outfit_400Regular" },
  screen: { flex: 1, backgroundColor: "#F5F3FF" },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 18,
    marginTop: 18,
    marginBottom: 8,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#1B196A",
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { flex: 1 },
  title: { fontSize: 30, color: "#FFFFFF", fontFamily: "BebasNeue", letterSpacing: 0.8 },
  subtitle: { marginTop: 3, fontSize: 13, lineHeight: 18, color: "rgba(255,255,255,0.76)", fontFamily: "Outfit_400Regular" },
  listContent: { padding: 18, paddingBottom: 120, gap: 10 },
  emptyListContent: { flexGrow: 1, justifyContent: "center", padding: 24, paddingBottom: 120 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.08)",
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#EEEDFE",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  cardType: { fontSize: 11, color: "#312FB8", fontFamily: "Outfit_700Bold", textTransform: "uppercase", letterSpacing: 0.4 },
  cardTime: { fontSize: 11, color: "#8A8FA8", fontFamily: "Outfit_400Regular" },
  cardTitle: { fontSize: 15, color: "#171832", fontFamily: "Outfit_700Bold", marginBottom: 3 },
  cardText: { fontSize: 13, lineHeight: 18, color: "#626984", fontFamily: "Outfit_400Regular" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#F5F3FF" },
  emptyCard: { alignItems: "center", gap: 10, padding: 24, borderRadius: 24, backgroundColor: "#FFFFFF" },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "#EEEDFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 18, color: "#171832", fontFamily: "Outfit_700Bold", textAlign: "center" },
  emptyText: { marginTop: 6, fontSize: 13, lineHeight: 19, color: "#6D728B", fontFamily: "Outfit_400Regular", textAlign: "center" },
  primaryBtn: { marginTop: 18, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, backgroundColor: "#312FB8" },
  primaryBtnText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Outfit_700Bold" },
});
