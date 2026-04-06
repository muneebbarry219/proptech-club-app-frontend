import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { ArrowRight, CalendarDays, PenLine, Users } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import AppShell from "../components/layout/AppShell";
import AuthRequiredModal from "../components/modals/AuthRequiredModal";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../constants/supabase";

const { width } = Dimensions.get("window");
const HERO_IMAGE = "https://images.unsplash.com/photo-1571917687771-094c2a557ed4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";
const ADMIN_USER_ID = "59a93ce0-0570-4f71-897a-162b72decf7e";

interface ArticleInsight {
  id: string;
  label: string;
  text: string;
  source: string;
  image: string;
  body: string;
  excerpt?: string | null;
  publishedAt?: string;
  isDbArticle?: boolean;
}

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
  const { profile, isAuthenticated, user } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [insights, setInsights] = useState<ArticleInsight[]>([]);
  const isAdmin = isAuthenticated && user?.id === ADMIN_USER_ID;

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/articles?is_published=eq.true&order=published_at.desc&limit=6&select=id,title,excerpt,body,cover_url,tags,published_at,profiles!author_id(full_name)`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );

        if (!res.ok) {
          if (active) setInsights([]);
          return;
        }
        const rows = await res.json();
        if (!active || !Array.isArray(rows)) return;

        if (!rows.length) {
          setInsights([]);
          return;
        }

        setInsights(
          rows.map((article: any) => ({
            id: article.id,
            label:
              article.tags?.[0]?.toUpperCase() ||
              `ARTICLE | ${new Date(article.published_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              }).toUpperCase()}`,
            text: article.title,
            excerpt: article.excerpt ?? null,
            source: article.profiles?.full_name ?? "PropTech Club",
            image: article.cover_url || HERO_IMAGE,
            body: article.body ?? article.excerpt ?? article.title,
            publishedAt: article.published_at,
            isDbArticle: true,
          }))
        );
      } catch (error) {
        console.warn("[Home] articles load error", error);
        if (active) setInsights([]);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

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
          <View style={s.insightsHeader}>
            <Text style={s.insightsHeading}>Hot News From The Market</Text>
            {isAdmin ? (
              <TouchableOpacity
                onPress={() => router.push("/articles/write" as any)}
                activeOpacity={0.85}
                style={s.insightsAdminBtn}
              >
                <PenLine size={14} color="#312FB8" strokeWidth={2.1} />
                <Text style={s.insightsAdminBtnTxt}>Add</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.insightsScrollContent}>
            {insights.length ? (
              insights.map((insight) => (
                <TouchableOpacity
                  key={insight.id}
                  style={s.insightCard}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: "/articles/[id]",
                      params: {
                        id: insight.id,
                        title: insight.text,
                        excerpt: insight.excerpt ?? insight.label,
                        body: insight.body,
                        cover_url: insight.image,
                        author: insight.source,
                        published_at: insight.publishedAt ?? "2026-04-06T00:00:00.000Z",
                      },
                    } as any)
                  }
                >
                  <View style={s.insightRow}>
                    <View style={s.insightCopy}>
                      <Text style={s.insLabel} numberOfLines={1}>{insight.label}</Text>
                      <Text style={s.insText} numberOfLines={2} ellipsizeMode="tail">{insight.text}</Text>
                      <Text style={s.insSource} numberOfLines={1}>{insight.source}</Text>
                    </View>
                    <ExpoImage source={{ uri: insight.image }} style={s.insightImage} contentFit="cover" />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={s.insightsEmpty}>
                <Text style={s.insightsEmptyTitle}>No articles published yet</Text>
                <Text style={s.insightsEmptyText}>
                  {isAdmin ? "Use Add to publish the first article." : "Check back soon for market updates."}
                </Text>
              </View>
            )}
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
  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  insightsHeading: {
    fontSize: 23,
    fontFamily: "Outfit_700Bold",
    color: "#121426",
    letterSpacing: -0.5,
    marginLeft: 2,
    flex: 1,
  },
  insightsAdminBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#EEEDFE",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.14)",
  },
  insightsAdminBtnTxt: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0,
    color: "#312FB8",
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
  insightsEmpty: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: "rgba(49,47,184,0.08)",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 122,
  },
  insightsEmptyTitle: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0,
    color: "#121426",
    marginBottom: 6,
  },
  insightsEmptyText: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    letterSpacing: 0,
    color: "#7B8196",
    textAlign: "center",
  },
});
