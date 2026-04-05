import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { CalendarDays, Users } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/layout/AppShell";
import AuthRequiredModal from "../components/modals/AuthRequiredModal";

const { width } = Dimensions.get("window");
const HERO_IMAGE = "https://images.unsplash.com/photo-1571917687771-094c2a557ed4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";

const INSIGHTS = [
  {
    label: "KARACHI | THIS WEEK",
    text: "DHA Phase 8 commercial plots are seeing 12% price appreciation YoY, driven by overseas Pakistani investors.",
    source: "PropTech Club Research | 2026",
    image: "https://images.unsplash.com/photo-1460317442991-0ec209397118?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
  },
  {
    label: "GCC CORRIDOR",
    text: "UAE-based Pakistanis increased remittance-backed real estate investment by 34% in Q4 2025.",
    source: "PropTech Club Research | 2026",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
  },
];

const ACTION_CARDS: Array<{
  label: string;
  title: string;
  route: string;
  Icon: typeof CalendarDays;
}> = [
  { label: "Plan your next meetup", title: "Upcoming Events", route: "/events", Icon: CalendarDays },
  { label: "Grow your network", title: "Connect Members", route: "/members", Icon: Users },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "GOOD MORNING";
  if (hour < 17) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile, isAuthenticated } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const handleProtectedPress = (route: string) => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    router.push(route as any);
  };

  return (
    <AppShell>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={s.heroBanner}>
          <ExpoImage source={{ uri: HERO_IMAGE }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          <LinearGradient
            colors={["rgba(27,25,106,0.88)", "rgba(49,47,184,0.78)", "rgba(120,60,200,0.72)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={s.heroContent}>
            {isAuthenticated && profile ? (
              <>
                <Text style={s.heroEyebrow}>{greeting()}</Text>
                <Text style={s.heroTitle}>{profile.full_name}</Text>
                <Text style={s.heroSubtitle}>Step into the region's most connected real estate, capital and technology network.</Text>
              </>
            ) : (
              <>
                <Text style={s.heroEyebrow}></Text>
                <Text style={s.heroTitle}>Join The Network</Text>
                <Text style={s.heroSubtitle}>Connect with 500+ real estate, capital and technology professionals.</Text>
                <TouchableOpacity onPress={() => router.push("/auth/sign-up" as any)} activeOpacity={0.85} style={s.heroCtaWrap}>
                  <LinearGradient colors={["#ffffff", "#E9E7FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroCta}>
                    <Text style={s.heroCtaText}>Join Free</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={s.actionGrid}>
          {ACTION_CARDS.map((card) => (
            <TouchableOpacity
              key={card.title}
              onPress={() => handleProtectedPress(card.route)}
              activeOpacity={0.85}
              style={s.actionCard}
            >
              <LinearGradient
                colors={["#312FB8", "#1B196A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={s.actionCircleLg} />
              <View style={s.actionCircleSm} />
              <View style={s.actionIconWrap}>
                <card.Icon size={18} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text style={s.actionTitle}>{card.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.insightsSection}>
          <Text style={s.insightsHeading}>Hot News From The Market</Text>
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.insightsScrollContent}
            style={s.insightsScroll}
          >
            {INSIGHTS.map((insight, index) => (
              <TouchableOpacity key={index} style={s.insightCard} activeOpacity={0.9} onPress={() => handleProtectedPress("/auth/sign-in")}>
                <View style={s.insightRow}>
                  <View style={s.insightCopy}>
                    <Text style={s.insLabel}>{insight.label}</Text>
                    <Text style={s.insText}>{insight.text}</Text>
                    <Text style={s.insSource}>{insight.source}</Text>
                  </View>
                  <ExpoImage source={{ uri: insight.image }} style={s.insightImage} contentFit="cover" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <AuthRequiredModal visible={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} />
    </AppShell>
  );
}

const s = StyleSheet.create({
  heroBanner: { marginHorizontal: 16, marginTop: 16, borderRadius: 24, height: 196, overflow: "hidden" },
  heroContent: { flex: 1, justifyContent: "flex-end", padding: 20 },
  heroEyebrow: { color: "rgba(255,255,255,0.72)", fontSize: 11, fontWeight: "700", letterSpacing: 1.6, marginBottom: 6 },
  heroTitle: { color: "#fff", fontSize: 28, fontWeight: "900", lineHeight: 32, letterSpacing: -0.5, paddingBottom: 10 },
  heroSubtitle: { color: "#C8C5FF", fontSize: 15, fontWeight: "600", marginTop: 6, maxWidth: 290, lineHeight: 17 },
  heroCtaWrap: { marginTop: 16, alignSelf: "flex-start", borderRadius: 12, overflow: "hidden" },
  heroCta: { paddingHorizontal: 16, paddingVertical: 10 },
  heroCtaText: { color: "#1B196A", fontSize: 13, fontWeight: "800" },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  actionCard: {
    width: (width - 44) / 2,
    height: 92,
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  actionIconWrap: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionCircleLg: {
    position: "absolute",
    right: -18,
    top: -18,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  actionCircleSm: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  actionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginTop: 10,
  },
  insightsSection: { marginTop: 28 },
  insightsHeading: {
    fontSize: 24,
    fontWeight: "900",
    color: "#121426",
    marginBottom: 14,
    paddingHorizontal: 16,
    letterSpacing: -0.4,
    fontFamily: "arp-display",
  },
  insightsScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },
  insightsScroll: {
    maxHeight: 280,
  },
  insightCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: "rgba(49,47,184,0.08)",
    padding: 16,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  insightCopy: {
    flex: 1,
  },
  insLabel: { fontSize: 10, fontWeight: "800", color: "#312FB8", letterSpacing: 1, marginBottom: 6 },
  insText: { fontSize: 13, color: "#1a1a2e", fontWeight: "500", lineHeight: 20 },
  insSource: { fontSize: 10, color: "#0F6E56", fontWeight: "800", marginTop: 8 },
  insightImage: {
    width: 82,
    height: 82,
    borderRadius: 14,
    backgroundColor: "#e9ecf7",
  },
});
