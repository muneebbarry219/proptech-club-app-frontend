import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Image as ImageIcon, Eye, EyeOff, Send, Trash2 } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { uploadArticleCover } from "../../utils/uploadAvatar";

const ADMIN_USER_ID = "59a93ce0-0570-4f71-897a-162b72decf7e";

export default function WriteArticleScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    excerpt?: string;
    body?: string;
    tags?: string;
    cover_url?: string;
    is_published?: string;
  }>();
  const { id } = params;
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user, apiFetch, getAccessToken, isAuthenticated } = useAuth();

  const isAdmin   = isAuthenticated && user?.id === ADMIN_USER_ID;
  const isEditing = !!id;

  const [title,       setTitle]       = useState("");
  const [excerpt,     setExcerpt]     = useState("");
  const [body,        setBody]        = useState("");
  const [tags,        setTags]        = useState("");
  const [coverUri,    setCoverUri]    = useState<string | null>(null);
  const [coverBase64, setCoverBase64] = useState<string | null>(null);
  const [coverMime,   setCoverMime]   = useState<string>("image/jpeg");
  const [coverLoading,setCoverLoading]= useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [preview,     setPreview]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(isEditing);

  // Guard — non-admins should never reach this screen
  useEffect(() => {
    if (!isAdmin) {
      router.replace("/articles" as any);
    }
  }, [isAdmin]);

  // Load existing article if editing
  useEffect(() => {
    if (!id || !isAdmin) return;
    (async () => {
      try {
        const res = await apiFetch(`/articles?id=eq.${id}&select=*`);
        if (res.ok) {
          const rows = await res.json();
          const a = rows[0];
          if (a) {
            setTitle(a.title ?? "");
            setExcerpt(a.excerpt ?? "");
            setBody(a.body ?? "");
            setTags((a.tags ?? []).join(", "));
            setCoverUri(a.cover_url ?? null);
            setIsPublished(a.is_published ?? false);
            setLoading(false);
            return;
          }
        }

        setTitle(params.title ?? "");
        setExcerpt(params.excerpt ?? "");
        setBody(params.body ?? "");
        setTags(params.tags ?? "");
        setCoverUri(params.cover_url ?? null);
        setIsPublished(params.is_published === "true");
      } finally {
        setLoading(false);
      }
    })();
  }, [apiFetch, id, isAdmin, params.body, params.cover_url, params.excerpt, params.is_published, params.tags, params.title]);

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Needed", "Please allow gallery access to pick a cover image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.75,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setCoverUri(asset.uri);                          // local preview
      setCoverBase64(asset.base64 ?? null);
      setCoverMime(asset.mimeType ?? "image/jpeg");

      // Upload immediately if we already have an article ID
      if (id && asset.base64) {
        const token = getAccessToken();
        if (token) {
          setCoverLoading(true);
          const uploaded = await uploadArticleCover(asset.base64, id, token, asset.mimeType ?? "image/jpeg");
          setCoverLoading(false);
          if (uploaded) setCoverUri(uploaded);
        }
      }
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!title.trim()) { Alert.alert("Required", "Please enter a title."); return; }
    if (!body.trim())  { Alert.alert("Required", "Please enter the article body."); return; }

    setSaving(true);

    try {
      // Upload cover if we have base64 and no permanent URL yet
      let finalCoverUrl = coverUri;
      if (coverBase64 && coverUri && !coverUri.startsWith("http")) {
        const token = getAccessToken();
        if (token) {
          const articleId = id ?? `draft-${Date.now()}`;
          const uploaded  = await uploadArticleCover(coverBase64, articleId, token, coverMime);
          if (uploaded) {
            finalCoverUrl = uploaded;
            setCoverUri(uploaded);
            setCoverBase64(null);
          }
        }
      }

      const tagsArray = tags
        .split(",")
        .map(t => t.trim())
        .filter(Boolean);

      const payload = {
        title:        title.trim(),
        excerpt:      excerpt.trim() || null,
        body:         body.trim(),
        tags:         tagsArray,
        cover_url:    finalCoverUrl,
        is_published: publish,
        published_at: publish ? new Date().toISOString() : null,
        author_id:    user!.id,
      };

      let res: Response;

      if (isEditing) {
        res = await apiFetch(`/articles?id=eq.${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch("/articles", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        Alert.alert("Error", err[0]?.message ?? err?.message ?? "Could not save article.");
        return;
      }

      const result = await res.json();
      const saved  = Array.isArray(result) ? result[0] : result;

      Alert.alert(
        publish ? "Published! 🎉" : "Draft saved",
        publish ? "Your article is now live." : "Your draft has been saved.",
        [{
          text: "OK",
          onPress: () => {
            if (saved?.id) router.replace(`/articles/${saved.id}` as any);
            else router.replace("/articles" as any);
          },
        }]
      );
    } catch (e) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert("Delete Article", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          const res = await apiFetch(`/articles?id=eq.${id}`, { method: "DELETE" });
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
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[s.container, { paddingTop: insets.top, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#312FB8" size="large" />
      </View>
    );
  }

  // ── Preview mode ───────────────────────────────────────────────
  if (preview) {
    const paragraphs = body.split(/\n\n+/).filter(p => p.trim());
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.hdr}>
          <TouchableOpacity onPress={() => setPreview(false)} style={s.backBtn} activeOpacity={0.8}>
            <ArrowLeft size={18} color="#312FB8" strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={s.hdrTitle}>Preview</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
          {coverUri && !coverUri.startsWith("file") && (
            <Image source={{ uri: coverUri }} style={s.previewCover} resizeMode="cover" />
          )}
          <View style={s.previewContent}>
            <Text style={s.previewTitle}>{title || "Article Title"}</Text>
            {excerpt ? <Text style={s.previewExcerpt}>{excerpt}</Text> : null}
            <View style={s.divider} />
            {paragraphs.map((p, i) => {
              if (p.startsWith("## ")) return <Text key={i} style={s.heading}>{p.replace("## ", "")}</Text>;
              if (p.startsWith("# "))  return <Text key={i} style={s.heading1}>{p.replace("# ", "")}</Text>;
              return <Text key={i} style={s.para}>{p}</Text>;
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Editor mode ────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[s.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={s.hdr}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
            <ArrowLeft size={18} color="#312FB8" strokeWidth={2.4} />
          </TouchableOpacity>
          <Text style={s.hdrTitle}>{isEditing ? "Edit Article" : "New Article"}</Text>
          <TouchableOpacity onPress={() => setPreview(true)} style={s.previewBtn} activeOpacity={0.8}>
            <Eye size={18} color="#312FB8" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.editor}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cover image */}
          <TouchableOpacity onPress={pickCover} style={s.coverPicker} activeOpacity={0.85} disabled={coverLoading}>
            {coverLoading ? (
              <View style={s.coverPlaceholder}>
                <ActivityIndicator color="#312FB8" size="large" />
                <Text style={s.coverPlaceholderTxt}>Uploading cover...</Text>
              </View>
            ) : coverUri ? (
              <Image source={{ uri: coverUri }} style={s.coverPreview} resizeMode="cover" />
            ) : (
              <View style={s.coverPlaceholder}>
                <ImageIcon size={28} color="#AAA" strokeWidth={1.5} />
                <Text style={s.coverPlaceholderTxt}>Tap to add cover image (16:9)</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Title */}
          <Text style={s.fieldLabel}>TITLE *</Text>
          <TextInput
            style={s.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Article title..."
            placeholderTextColor="#CCC"
            multiline
          />

          {/* Excerpt */}
          <Text style={s.fieldLabel}>EXCERPT</Text>
          <TextInput
            style={s.excerptInput}
            value={excerpt}
            onChangeText={setExcerpt}
            placeholder="Short summary shown on the list (optional)..."
            placeholderTextColor="#CCC"
            multiline
          />

          {/* Tags */}
          <Text style={s.fieldLabel}>TAGS (comma separated)</Text>
          <TextInput
            style={s.tagsInput}
            value={tags}
            onChangeText={setTags}
            placeholder="PropTech, Investment, KSA..."
            placeholderTextColor="#CCC"
          />

          {/* Body */}
          <Text style={s.fieldLabel}>BODY *</Text>
          <Text style={s.fieldHint}>
            Use # for heading, ## for subheading. Separate paragraphs with a blank line.
          </Text>
          <TextInput
            style={s.bodyInput}
            value={body}
            onChangeText={setBody}
            placeholder={`# Main heading\n\nYour first paragraph here...\n\n## Subheading\n\nAnother paragraph...`}
            placeholderTextColor="#CCC"
            multiline
            textAlignVertical="top"
          />

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity
              onPress={() => handleSave(false)}
              disabled={saving}
              style={s.draftBtn}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#312FB8" size="small" />
                : <><EyeOff size={15} color="#312FB8" strokeWidth={2} /><Text style={s.draftTxt}>Save Draft</Text></>
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSave(true)}
              disabled={saving}
              activeOpacity={0.85}
              style={s.publishWrap}
            >
              <LinearGradient
                colors={["#312FB8", "#1B196A"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.publishBtn}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Send size={15} color="#fff" strokeWidth={2} /><Text style={s.publishTxt}>Publish</Text></>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Delete (edit mode only) */}
          {isEditing && (
            <TouchableOpacity onPress={handleDelete} style={s.deleteBtn} activeOpacity={0.85}>
              <Trash2 size={15} color="#DC2626" strokeWidth={2} />
              <Text style={s.deleteTxt}>Delete Article</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:           { flex: 1, backgroundColor: "#FFF" },
  hdr:                 { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "rgba(49,47,184,0.08)" },
  backBtn:             { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(49,47,184,0.08)", alignItems: "center", justifyContent: "center" },
  hdrTitle:            { fontSize: 15, fontWeight: "700", color: "#1A1A2E" },
  previewBtn:          { width: 40, height: 40, borderRadius: 12, backgroundColor: "#EEEDFE", alignItems: "center", justifyContent: "center" },
  editor:              { padding: 16, paddingBottom: 48 },
  coverPicker:         { borderRadius: 14, overflow: "hidden", marginBottom: 20, borderWidth: 1.5, borderColor: "rgba(49,47,184,0.12)", borderStyle: "dashed" },
  coverPlaceholder:    { height: 160, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#F8F8FC" },
  coverPlaceholderTxt: { fontSize: 13, color: "#AAA" },
  coverPreview:        { width: "100%", height: 200 },
  fieldLabel:          { fontSize: 11, fontWeight: "700", color: "#999", letterSpacing: 0.5, marginBottom: 6, marginTop: 14 },
  fieldHint:           { fontSize: 11, color: "#BBB", marginBottom: 8, lineHeight: 16 },
  titleInput:          { fontSize: 22, fontWeight: "800", color: "#1A1A2E", lineHeight: 30, borderBottomWidth: 1.5, borderBottomColor: "rgba(49,47,184,0.1)", paddingBottom: 10, marginBottom: 4 },
  excerptInput:        { fontSize: 14, color: "#444", lineHeight: 22, borderWidth: 1.5, borderColor: "rgba(49,47,184,0.12)", borderRadius: 12, padding: 12, minHeight: 80, fontFamily: "Outfit_400Regular" },
  tagsInput:           { fontSize: 14, color: "#444", borderWidth: 1.5, borderColor: "rgba(49,47,184,0.12)", borderRadius: 12, padding: 12, height: 48 },
  bodyInput:           { fontSize: 15, color: "#333", lineHeight: 24, borderWidth: 1.5, borderColor: "rgba(49,47,184,0.12)", borderRadius: 12, padding: 14, minHeight: 300 },
  actions:             { flexDirection: "row", gap: 10, marginTop: 24 },
  draftBtn:            { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: "rgba(49,47,184,0.2)", borderRadius: 14, height: 50 },
  draftTxt:            { color: "#312FB8", fontSize: 14, fontWeight: "700" },
  publishWrap:         { flex: 1, borderRadius: 14, overflow: "hidden" },
  publishBtn:          { height: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  publishTxt:          { color: "#FFF", fontSize: 14, fontWeight: "800" },
  deleteBtn:           { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(220,38,38,0.2)", backgroundColor: "#FFF3F3" },
  deleteTxt:           { color: "#DC2626", fontSize: 14, fontWeight: "700" },
  previewCover:        { width: "100%", height: 220 },
  previewContent:      { padding: 20 },
  previewTitle:        { fontSize: 24, fontWeight: "900", color: "#1A1A2E", lineHeight: 32, marginBottom: 16 },
  previewExcerpt:      { fontSize: 16, fontFamily: "Outfit_600SemiBold", color: "#444", lineHeight: 26, marginBottom: 20, fontStyle: "italic" },
  divider:             { height: 0.5, backgroundColor: "rgba(49,47,184,0.08)", marginBottom: 20 },
  heading1:            { fontSize: 22, fontWeight: "800", color: "#1A1A2E", marginTop: 24, marginBottom: 12 },
  heading:             { fontSize: 18, fontWeight: "800", color: "#1A1A2E", marginTop: 20, marginBottom: 10 },
  para:                { fontSize: 15, color: "#333", lineHeight: 26, marginBottom: 16 },
});
