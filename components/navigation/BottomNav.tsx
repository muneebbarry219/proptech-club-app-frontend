import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Home, CalendarDays, Users, MessagesSquare } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import AuthRequiredModal from "../modals/AuthRequiredModal";

const ITEMS = [
  { key: "home", route: "/home", Icon: Home, label: "Home" },
  { key: "events", route: "/events", Icon: CalendarDays, label: "Events" },
  { key: "members", route: "/members", Icon: Users, label: "Members" },
  { key: "messages", route: "/messages", Icon: MessagesSquare, label: "Messages" },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, apiFetch, messageSyncTick } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    let active = true;

    const loadUnreadMessages = async () => {
      if (!isAuthenticated || !user) {
        if (active) setUnreadMessageCount(0);
        return;
      }

      try {
        const res = await apiFetch(
          `/direct_messages?receiver_id=eq.${user.id}&is_read=eq.false&select=id`
        );
        const rows: Array<{ id: string }> = res.ok ? await res.json() : [];

        if (active) {
          setUnreadMessageCount(rows.length);
        }
      } catch {
        if (active) setUnreadMessageCount(0);
      }
    };

    void loadUnreadMessages();

    return () => {
      active = false;
    };
  }, [apiFetch, isAuthenticated, messageSyncTick, user]);

  const isActive = (route: string) => {
    if (route === "/home") return pathname === "/home";
    return pathname.startsWith(route);
  };

  const handlePress = (route: string) => {
    if (!isAuthenticated && route === "/members") {
      setShowAuthPrompt(true);
      return;
    }

    router.push(route as any);
  };

  return (
    <>
      <View style={styles.wrap}>
        <LinearGradient
          colors={["rgba(244,241,255,0)", "rgba(244,241,255,0.95)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          pointerEvents="none"
          style={styles.topFade}
        />
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {ITEMS.map(({ key, route, Icon, label }) => {
            const active = isActive(route);
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handlePress(route)}
                style={styles.item}
                activeOpacity={0.7}
              >
                <View style={styles.iconSlot}>
                  <Icon
                    size={22}
                    color={active ? "#312FB8" : "#aaaaaa"}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  {key === "messages" && unreadMessageCount > 0 ? (
                    <View style={styles.messageBadge}>
                      <Text style={styles.messageBadgeText}>
                        {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.label, active && styles.labelActive]}>
                  {label}
                </Text>
                {active && <View style={styles.dot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <AuthRequiredModal visible={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
  },
  topFade: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -36,
    height: 36,
  },
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(49,47,184,0.08)",
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  item: { flex: 1, alignItems: "center", gap: 3 },
  iconSlot: {
    width: 28,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  messageBadge: {
    position: "absolute",
    top: -6,
    right: -7,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#E53935",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  messageBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    lineHeight: 10,
    fontFamily: "Outfit_700Bold",
    letterSpacing: 0,
  },
  label: { fontSize: 9, fontFamily: "Outfit_400Regular", letterSpacing: 0, color: "#aaaaaa" },
  labelActive: { fontFamily: "Outfit_600SemiBold", color: "#312FB8" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#312FB8", marginTop: 1 },
});
