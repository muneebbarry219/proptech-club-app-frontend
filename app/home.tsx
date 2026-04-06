import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { ArrowRight, CalendarDays, Users } from "lucide-react-native";
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
  {
    label: "ISLAMABAD | CAPITAL WATCH",
    text: "Mixed-use inventory near the new expressway is tightening as builders respond to stronger corporate leasing demand.",
    source: "PropTech Club Research | 2026",
    image: "https://images.unsplash.com/photo-1494526585095-c41746248156?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
  },
  {
    label: "LAHORE | DEVELOPMENT DESK",
    text: "Mid-rise residential launches in DHA and Gulberg are seeing faster pre-bookings as end-user sentiment improves.",
    source: "PropTech Club Research | 2026",
    image: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600",
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
      <View style={s.screen}>
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
                    <View style={s.heroCtaIconWrap}>
                      <ArrowRight size={13} color="#1B196A" strokeWidth={2.3} />
                    </View>
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
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.insightsScrollContent}>
            {INSIGHTS.map((insight, index) => (
              <TouchableOpacity key={index} style={s.insightCard} activeOpacity={0.9} onPress={() => handleProtectedPress("/auth/sign-in")}>
                <View style={s.insightRow}>
                  <View style={s.insightCopy}>
                    <Text style={s.insLabel} numberOfLines={1}>{insight.label}</Text>
                    <Text style={s.insText} numberOfLines={2} ellipsizeMode="tail">{insight.text}</Text>
                    <Text style={s.insSource} numberOfLines={1}>{insight.source}</Text>
                  </View>
                  <ExpoImage source={{ uri: insight.image }} style={s.insightImage} contentFit="cover" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <AuthRequiredModal visible={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} />
    </AppShell>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  heroBanner: { marginHorizontal: 16, marginTop: 16, borderRadius: 24, height: 196, overflow: "hidden" },
  heroContent: { flex: 1, justifyContent: "flex-end", padding: 20 },
  heroEyebrow: { color: "rgba(255,255,255,0.72)", fontSize: 11, fontFamily: "Outfit_600SemiBold", letterSpacing: 0, marginBottom: 3 },
  heroTitle: { color: "#fff", fontSize: 25, fontFamily: "Outfit_700Bold", lineHeight: 32, letterSpacing: 0, paddingBottom: 20 },
  heroSubtitle: { color: "#C8C5FF", fontSize: 14, fontFamily: "Outfit_300Light", letterSpacing: 0, marginTop: 2, maxWidth: 290, lineHeight: 17 },
  heroCtaWrap: { marginTop: 16, alignSelf: "flex-start", borderRadius: 12, overflow: "hidden" },
  heroCta: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  heroCtaText: { color: "#1B196A", fontSize: 13, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  heroCtaIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(27,25,106,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
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
    fontSize: 17,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0,
    paddingTop: 20,
    marginLeft: 3,
  },
  insightsSection: { flex: 1, marginTop: 28 },
  insightsHeading: {
    fontSize: 23,
    fontFamily: "Outfit_700Bold",
    color: "#121426",
    marginBottom: 14,
    paddingHorizontal: 16,
    letterSpacing: -0.5,
    marginLeft: 2,
  },
  insightsScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 8,
  },
  insightCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: "rgba(49,47,184,0.08)",
    padding: 16,
    minHeight: 122,
    shadowColor: "#16163D",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  insightCopy: {
    flex: 1,
    minHeight: 90,
    justifyContent: "space-between",
  },
  insLabel: {
    fontSize: 10,
    fontFamily: "Outfit_600SemiBold",
    color: "#312FB8",
    letterSpacing: 0,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  insText: {
    fontSize: 13,
    color: "#1a1a2e",
    fontFamily: "Outfit_400Regular",
    lineHeight: 18,
    letterSpacing: 0,
    flexShrink: 1,
  },
  insSource: {
    fontSize: 10,
    color: "#0F6E56",
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0,
    marginTop: 10,
  },
  insightImage: {
    width: 82,
    height: 82,
    borderRadius: 14,
    backgroundColor: "#e9ecf7",
  },
});
