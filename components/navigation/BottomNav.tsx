import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Home, BriefcaseBusiness, Users, MessagesSquare } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ITEMS = [
  { key: "home", route: "/home", Icon: Home, label: "Home" },
  { key: "deals", route: "/deals", Icon: BriefcaseBusiness, label: "My Deals" },
  { key: "members", route: "/members", Icon: Users, label: "Members" },
  { key: "messages", route: "/rooms", Icon: MessagesSquare, label: "Messages" },
];

export default function BottomNav() {
  const router   = useRouter();
  const pathname = usePathname();
  const insets   = useSafeAreaInsets();

  const isActive = (route: string) => {
    if (route === "/home") return pathname === "/home";
    return pathname.startsWith(route);
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {ITEMS.map(({ key, route, Icon, label }) => {
        const active = isActive(route);
        return (
          <TouchableOpacity
            key={key}
            onPress={() => router.push(route as any)}
            style={styles.item}
            activeOpacity={0.7}
          >
            <Icon
              size={22}
              color={active ? "#312FB8" : "#aaaaaa"}
              strokeWidth={active ? 2.2 : 1.8}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {label}
            </Text>
            {active && <View style={styles.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 0.5,
    borderTopColor: "rgba(49,47,184,0.08)",
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  item: { flex: 1, alignItems: "center", gap: 3 },
  label: { fontSize: 9, fontWeight: "500", color: "#aaaaaa" },
  labelActive: { fontWeight: "700", color: "#312FB8" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#312FB8", marginTop: 1 },
});
