import { StyleSheet, Text, View } from "react-native";
import { CalendarDays } from "lucide-react-native";
import AppShell from "../../components/layout/AppShell";

export default function EventsScreen() {
  return (
    <AppShell>
      <View style={s.container}>
        <View style={s.empty}>
          <View style={s.emptyIconWrap}>
            <View style={s.emptyIconCircleLg} />
            <View style={s.emptyIconCircleSm} />
            <View style={s.emptyIconInner}>
              <CalendarDays size={20} color="#312FB8" strokeWidth={2.1} />
            </View>
          </View>
          <Text style={s.emptyTitle}>No upcoming events</Text>
          <Text style={s.emptySub}>
            New PropTech Club events will appear here when they are announced.
          </Text>
        </View>
      </View>
    </AppShell>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8FC" },
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
