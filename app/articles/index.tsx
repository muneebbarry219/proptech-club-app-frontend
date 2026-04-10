import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { PenLine } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import AppShell from "../../components/layout/AppShell";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../constants/supabase";
import { getArticleCoverUrl } from "../../utils/getArticleCoverUrl";

// ── Admin check ────────────────────────────────────────────────
const ADMIN_USER_ID = "59a93ce0-0570-4f71-897a-162b72decf7e";

// ── Types ──────────────────────────────────────────────────────
interface Article {
  id: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  tags: string[];
  published_at: string;
  author_id: string;
  profiles: { full_name: string } | null;
}

// ── Helpers ────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000)   return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000)  return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Article Card ───────────────────────────────────────────────
function ArticleCard({ article, onPress }: { article: Article; onPress: () => void }) {
  const coverUrl = getArticleCoverUrl(article.cover_url);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={s.card}>
      {coverUrl && (
        <Image source={{ uri: coverUrl }} style={s.cover} resizeMode="cover" />
      )}
      <View style={s.cardBody}>
        {article.tags?.length > 0 && (
          <View style={s.tagsRow}>
            {article.tags.slice(0, 3).map(tag => (
              <View key={tag} style={s.tag}>
                <Text style={s.tagTxt}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={s.cardTitle} numberOfLines={2}>{article.title}</Text>
        {article.excerpt && (
          <Text style={s.cardExcerpt} numberOfLines={3}>{article.excerpt}</Text>
        )}
        <View style={s.cardMeta}>
          <Text style={s.cardAuthor}>
            {article.profiles?.full_name ?? "PropTech Club"}
          </Text>
          <Text style={s.cardDot}>·</Text>
          <Text style={s.cardTime}>{timeAgo(article.published_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ────────────────────────────────────────────────
export default function ArticlesScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [articles,   setArticles]   = useState<Article[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = isAuthenticated && user?.id === ADMIN_USER_ID;

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/articles?is_published=eq.true&order=published_at.desc&select=id,title,excerpt,cover_url,tags,published_at,author_id,profiles!author_id(full_name)`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      if (res.ok) setArticles(await res.json());
    } catch (e) {
      console.warn("[Articles] load error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AppShell>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Articles</Text>
            <Text style={s.subtitle}>Insights from the PropTech ecosystem</Text>
          </View>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => router.push("/articles/write" as any)}
              style={s.writeBtn}
              activeOpacity={0.85}
            >
              <PenLine size={16} color="#fff" strokeWidth={2} />
              <Text style={s.writeBtnTxt}>Write</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={s.loader}><ActivityIndicator color="#312FB8" size="large" /></View>
        ) : (
          <FlatList
            data={articles}
            keyExtractor={a => a.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); load(); }}
                tintColor="#312FB8"
              />
            }
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyIcon}>📝</Text>
                <Text style={s.emptyTitle}>No articles yet</Text>
                <Text style={s.emptySub}>
                  {isAdmin ? "Tap Write to publish your first article." : "Check back soon for insights and news."}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <ArticleCard
                article={item}
                onPress={() => router.push(`/articles/${item.id}` as any)}
              />
            )}
          />
        )}
      </View>
    </AppShell>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#F8F8FC" },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: "rgba(49,47,184,0.08)" },
  title:       { fontSize: 17, fontWeight: "800", color: "#1A1A2E" },
  subtitle:    { fontSize: 12, color: "#AAA", marginTop: 2 },
  writeBtn:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#312FB8", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  writeBtnTxt: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  loader:      { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, paddingBottom: 24, gap: 12 },
  card:        { backgroundColor: "#FFF", borderRadius: 16, borderWidth: 0.5, borderColor: "rgba(49,47,184,0.08)", overflow: "hidden" },
  cover:       { width: "100%", height: 180 },
  cardBody:    { padding: 14 },
  tagsRow:     { flexDirection: "row", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  tag:         { backgroundColor: "#EEEDFE", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  tagTxt:      { fontSize: 10, fontWeight: "700", color: "#3C3489" },
  cardTitle:   { fontSize: 16, fontWeight: "800", color: "#1A1A2E", lineHeight: 22, marginBottom: 6 },
  cardExcerpt: { fontSize: 13, color: "#666", lineHeight: 19, marginBottom: 10, fontFamily: "Outfit_400Regular" },
  cardMeta:    { flexDirection: "row", alignItems: "center", gap: 6 },
  cardAuthor:  { fontSize: 12, fontWeight: "600", color: "#312FB8" },
  cardDot:     { fontSize: 12, color: "#CCC" },
  cardTime:    { fontSize: 12, color: "#AAA" },
  empty:       { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyIcon:   { fontSize: 40 },
  emptyTitle:  { fontSize: 16, fontWeight: "800", color: "#1A1A2E" },
  emptySub:    { fontSize: 13, color: "#AAA", textAlign: "center", paddingHorizontal: 32 },
});
