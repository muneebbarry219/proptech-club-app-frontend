import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../constants/supabase";
import AppShell from "../../components/layout/AppShell";

const ADMIN_USER_ID = "59a93ce0-0570-4f71-897a-162b72decf7e";

interface Article {
  id: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_url: string | null;
  tags: string[];
  published_at: string;
  author_id: string;
  profiles: { full_name: string; role: string | null } | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default function ArticleDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    title?: string;
    excerpt?: string;
    body?: string;
    cover_url?: string;
    author?: string;
    published_at?: string;
  }>();
  const { id } = params;
  const router  = useRouter();
  const { user, isAuthenticated, apiFetch } = useAuth();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = isAuthenticated && user?.id === ADMIN_USER_ID;

  useEffect(() => {
    if (!id) return;
    (async () => {
      let resolvedArticle: Article | null = null;

      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/articles?id=eq.${id}&select=id,title,excerpt,body,cover_url,tags,published_at,author_id,profiles!author_id(full_name,role)`,
          { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
        );
        if (res.ok) {
          const rows = await res.json();
          if (rows[0]) {
            resolvedArticle = rows[0];
          }
        }
      } catch (e) {
        console.warn("[ArticleDetail] error", e);
      } finally {
        if (!resolvedArticle && params.title && params.body) {
          resolvedArticle = {
            id,
            title: params.title,
            excerpt: params.excerpt ?? null,
            body: params.body,
            cover_url: params.cover_url ?? null,
            tags: params.excerpt ? [params.excerpt] : [],
            published_at: params.published_at ?? new Date().toISOString(),
            author_id: "local",
            profiles: { full_name: params.author ?? "PropTech Club", role: null },
          };
        }

        setArticle(resolvedArticle);
        setLoading(false);
      }
    })();
  }, [id, params.author, params.body, params.cover_url, params.excerpt, params.published_at, params.title]);

  if (loading) {
    return (
      <AppShell>
        <View style={[s.container, s.centerState]}>
          <ActivityIndicator color="#312FB8" size="large" />
        </View>
      </AppShell>
    );
  }

  if (!article) {
    return (
      <AppShell>
        <View style={[s.container, s.centerState]}>
          <Text style={{ color: "#AAA" }}>Article not found.</Text>
        </View>
      </AppShell>
    );
  }

  // Render body — split by double newlines into paragraphs
  const paragraphs = article.body.split(/\n\n+/).filter(p => p.trim());
  const canManageArticle = isAdmin && isUuid(article.id) && article.author_id !== "local";

  const handleEdit = () => {
    router.push({
      pathname: "/articles/write",
      params: {
        id: article.id,
        title: article.title,
        excerpt: article.excerpt ?? "",
        body: article.body,
        cover_url: article.cover_url ?? "",
        tags: article.tags.join(", "),
        is_published: article.published_at ? "true" : "false",
      },
    } as any);
  };

  const handleDelete = () => {
    if (!canManageArticle || deleting) return;

    Alert.alert("Delete Article", "This article will be permanently removed from the database.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            const res = await apiFetch(`/articles?id=eq.${article.id}`, { method: "DELETE" });
            if (!res.ok) {
              let message = "Could not delete article.";
              try {
                const err = await res.json();
                message = err?.[0]?.message ?? err?.message ?? message;
              } catch {
                // Keep default message.
              }
              Alert.alert("Delete Failed", message);
              return;
            }

            Alert.alert("Deleted", "The article has been removed.", [
              { text: "OK", onPress: () => router.replace("/articles" as any) },
            ]);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <AppShell>
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Cover */}
        <View style={s.coverWrap}>
          {article.cover_url ? (
            <Image source={{ uri: article.cover_url }} style={s.cover} resizeMode="cover" />
          ) : (
            <View style={[s.cover, s.coverFallback]} />
          )}
          <View style={s.coverOverlay} />
          <View style={s.coverActions}>
            <TouchableOpacity onPress={() => router.back()} style={s.overlayBtn} activeOpacity={0.8}>
              <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
            {isAdmin ? (
              <View style={s.headerActions}>
                {canManageArticle ? (
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={[s.overlayBtn, s.deleteOverlayBtn, deleting && s.iconBtnDisabled]}
                    activeOpacity={0.8}
                    disabled={deleting}
                  >
                    <Trash2 size={16} color="#FFFFFF" strokeWidth={2} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={handleEdit} style={s.overlayBtn} activeOpacity={0.8}>
                  <Pencil size={16} color="#FFFFFF" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ) : (
              <View />
            )}
          </View>
        </View>

        <View style={s.content}>
          {/* Tags */}
          {article.tags?.length > 0 && (
            <View style={s.tagsRow}>
              {article.tags.map(tag => (
                <View key={tag} style={s.tag}>
                  <Text style={s.tagTxt}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Title */}
          <Text style={s.title}>{article.title}</Text>

          {/* Meta */}
          <View style={s.metaRow}>
            <View style={s.authorDot}>
              <Text style={s.authorDotTxt}>
                {(article.profiles?.full_name ?? "P").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={s.authorName}>
                {article.profiles?.full_name ?? "PropTech Club"}
              </Text>
              <Text style={s.pubDate}>{formatDate(article.published_at)}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={s.divider} />

          {/* Excerpt */}
          {article.excerpt && (
            <Text style={s.excerpt}>{article.excerpt}</Text>
          )}

          {/* Body paragraphs */}
          {paragraphs.map((para, i) => {
            // Detect headings — lines starting with ##
            if (para.startsWith("## ")) {
              return (
                <Text key={i} style={s.heading}>{para.replace("## ", "")}</Text>
              );
            }
            if (para.startsWith("# ")) {
              return (
                <Text key={i} style={s.heading1}>{para.replace("# ", "")}</Text>
              );
            }
            return (
              <Text key={i} style={s.para}>{para}</Text>
            );
          })}
        </View>
      </ScrollView>
    </View>
    </AppShell>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  centerState: { alignItems: "center", justifyContent: "center" },
  coverWrap: { position: "relative" },
  coverActions: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,10,28,0.18)",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  overlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteOverlayBtn: {
    backgroundColor: "rgba(215,38,61,0.78)",
    borderColor: "rgba(255,255,255,0.18)",
  },
  iconBtnDisabled: { opacity: 0.5 },
  cover:     { width: "100%", height: 220 },
  coverFallback: { backgroundColor: "#DAD9F3" },
  content:   { padding: 20 },
  tagsRow:   { flexDirection: "row", gap: 6, marginBottom: 14, flexWrap: "wrap" },
  tag:       { backgroundColor: "#EEEDFE", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagTxt:    { fontSize: 11, fontWeight: "700", color: "#3C3489" },
  title:     { fontSize: 24, fontWeight: "900", color: "#1A1A2E", lineHeight: 32, marginBottom: 16 },
  metaRow:   { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  authorDot: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#312FB8", alignItems: "center", justifyContent: "center" },
  authorDotTxt: { color: "#FFF", fontSize: 14, fontWeight: "800" },
  authorName:{ fontSize: 13, fontWeight: "700", color: "#1A1A2E" },
  pubDate:   { fontSize: 12, color: "#AAA", marginTop: 2 },
  divider:   { height: 0.5, backgroundColor: "rgba(49,47,184,0.08)", marginBottom: 20 },
  excerpt:   { fontSize: 16, fontWeight: "600", color: "#444", lineHeight: 26, marginBottom: 20, fontStyle: "italic" },
  heading1:  { fontSize: 22, fontWeight: "800", color: "#1A1A2E", marginTop: 24, marginBottom: 12 },
  heading:   { fontSize: 18, fontWeight: "800", color: "#1A1A2E", marginTop: 20, marginBottom: 10 },
  para:      { fontSize: 15, color: "#333", lineHeight: 26, marginBottom: 16 },
});
