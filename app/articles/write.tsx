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
import { getArticleCoverUrl } from "../../utils/getArticleCoverUrl";

const ADMIN_USER_ID = "59a93ce0-0570-4f71-897a-162b72decf7e";

type BodySelection = { start: number; end: number };

function parseInlineMarkdown(text: string) {
  const parts: { text: string; bold?: boolean; italic?: boolean }[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;

  text.replace(pattern, (match, _capture, offset) => {
    if (offset > lastIndex) {
      parts.push({ text: text.slice(lastIndex, offset) });
    }

    if (match.startsWith("**") && match.endsWith("**")) {
      parts.push({ text: match.slice(2, -2), bold: true });
    } else if (match.startsWith("*") && match.endsWith("*")) {
      parts.push({ text: match.slice(1, -1), italic: true });
    }

    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }

  return parts.length ? parts : [{ text }];
}

function renderInlineMarkdown(
  text: string,
  keyPrefix: string,
  styles: { bold: object; italic: object }
) {
  return parseInlineMarkdown(text).map((part, index) => (
    <Text
      key={`${keyPrefix}-${index}`}
      style={[part.bold ? styles.bold : null, part.italic ? styles.italic : null]}
    >
      {part.text}
    </Text>
  ));
}

function findBlockRange(text: string, selection: BodySelection) {
  const start = text.lastIndexOf("\n\n", Math.max(0, selection.start - 1));
  const end = text.indexOf("\n\n", selection.end);

  return {
    start: start === -1 ? 0 : start + 2,
    end: end === -1 ? text.length : end,
  };
}

function stripBlockPrefix(block: string) {
  return block.replace(/^(#{1,3})\s+/, "");
}

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
  const [bodySelection, setBodySelection] = useState<BodySelection>({ start: 0, end: 0 });

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
            setCoverUri(getArticleCoverUrl(a.cover_url) ?? null);
            setIsPublished(a.is_published ?? false);
            setLoading(false);
            return;
          }
        }

        setTitle(params.title ?? "");
        setExcerpt(params.excerpt ?? "");
        setBody(params.body ?? "");
        setTags(params.tags ?? "");
        setCoverUri(getArticleCoverUrl(params.cover_url) ?? null);
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
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setCoverUri(asset.uri);

      // Upload immediately if editing existing article
      if (id) {
        const token = getAccessToken();
        if (token) {
          setCoverLoading(true);
          const uploaded = await uploadArticleCover(asset.uri, id, token);
          setCoverLoading(false);
          if (uploaded) setCoverUri(getArticleCoverUrl(uploaded));
        }
      }
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!title.trim()) { Alert.alert("Required", "Please enter a title."); return; }
    if (!body.trim())  { Alert.alert("Required", "Please enter the article body."); return; }

    setSaving(true);

    try {
      // Upload cover if not yet uploaded (local URI)
      let finalCoverUrl = getArticleCoverUrl(coverUri);
      if (coverUri && !coverUri.startsWith("http")) {
        const token = getAccessToken();
        if (token) {
          const articleId = id ?? `draft-${Date.now()}`;
          const uploaded  = await uploadArticleCover(coverUri, articleId, token);
          if (uploaded) {
            finalCoverUrl = getArticleCoverUrl(uploaded);
            setCoverUri(getArticleCoverUrl(uploaded));
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

  const applyBlockFormat = (format: "p" | "h1" | "h2" | "h3") => {
    const range = findBlockRange(body, bodySelection);
    const selectedBlock = body.slice(range.start, range.end);
    const cleanBlock = stripBlockPrefix(selectedBlock);
    const prefix = format === "p" ? "" : `${format === "h1" ? "#" : format === "h2" ? "##" : "###"} `;
    const updatedBlock = `${prefix}${cleanBlock}`;
    const nextBody = `${body.slice(0, range.start)}${updatedBlock}${body.slice(range.end)}`;

    setBody(nextBody);
    const nextCursor = range.start + updatedBlock.length;
    setBodySelection({ start: nextCursor, end: nextCursor });
  };

  const toggleInlineFormat = (marker: "**" | "*") => {
    const { start, end } = bodySelection;
    if (start === end) return;

    const selectedText = body.slice(start, end);
    const wrappedWithMarker = selectedText.startsWith(marker) && selectedText.endsWith(marker);
    const replacement = wrappedWithMarker
      ? selectedText.slice(marker.length, selectedText.length - marker.length)
      : `${marker}${selectedText}${marker}`;
    const nextBody = `${body.slice(0, start)}${replacement}${body.slice(end)}`;

    setBody(nextBody);
    const nextStart = wrappedWithMarker ? start : start + marker.length;
    const nextEnd = wrappedWithMarker ? start + replacement.length : start + marker.length + selectedText.length;
    setBodySelection({ start: nextStart, end: nextEnd });
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
              if (p.startsWith("### ")) {
                return (
                  <Text key={i} style={s.heading3}>
                    {renderInlineMarkdown(p.replace("### ", ""), `preview-h3-${i}`, { bold: s.inlineBold, italic: s.inlineItalic })}
                  </Text>
                );
              }
              if (p.startsWith("## ")) {
                return (
                  <Text key={i} style={s.heading}>
                    {renderInlineMarkdown(p.replace("## ", ""), `preview-h2-${i}`, { bold: s.inlineBold, italic: s.inlineItalic })}
                  </Text>
                );
              }
              if (p.startsWith("# ")) {
                return (
                  <Text key={i} style={s.heading1}>
                    {renderInlineMarkdown(p.replace("# ", ""), `preview-h1-${i}`, { bold: s.inlineBold, italic: s.inlineItalic })}
                  </Text>
                );
              }
              return (
                <Text key={i} style={s.para}>
                  {renderInlineMarkdown(p, `preview-p-${i}`, { bold: s.inlineBold, italic: s.inlineItalic })}
                </Text>
              );
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
            Use the toolbar for H1, H2, H3, paragraph, bold, and italic. Separate paragraphs with a blank line.
          </Text>
          <View style={s.formatBar}>
            <TouchableOpacity style={s.formatChip} onPress={() => applyBlockFormat("h1")} activeOpacity={0.8}>
              <Text style={s.formatChipTxt}>H1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.formatChip} onPress={() => applyBlockFormat("h2")} activeOpacity={0.8}>
              <Text style={s.formatChipTxt}>H2</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.formatChip} onPress={() => applyBlockFormat("h3")} activeOpacity={0.8}>
              <Text style={s.formatChipTxt}>H3</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.formatChip} onPress={() => applyBlockFormat("p")} activeOpacity={0.8}>
              <Text style={s.formatChipTxt}>P</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.formatChip} onPress={() => toggleInlineFormat("**")} activeOpacity={0.8}>
              <Text style={[s.formatChipTxt, s.formatChipTxtBold]}>B</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.formatChip} onPress={() => toggleInlineFormat("*")} activeOpacity={0.8}>
              <Text style={[s.formatChipTxt, s.formatChipTxtItalic]}>I</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.bodyInput}
            value={body}
            onChangeText={setBody}
            placeholder={`# Main heading\n\nYour first paragraph with **bold** or *italic* text.\n\n### Smaller heading\n\nAnother paragraph...`}
            placeholderTextColor="#CCC"
            multiline
            textAlignVertical="top"
            selection={bodySelection}
            onSelectionChange={(event) => setBodySelection(event.nativeEvent.selection)}
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
  formatBar:           { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  formatChip:          { paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: "#F3F2FF", borderWidth: 1, borderColor: "rgba(49,47,184,0.1)", alignItems: "center", justifyContent: "center" },
  formatChipTxt:       { color: "#312FB8", fontSize: 12, fontWeight: "700" },
  formatChipTxtBold:   { fontWeight: "900" },
  formatChipTxtItalic: { fontStyle: "italic" },
  titleInput:          { fontSize: 22, fontWeight: "800", color: "#1A1A2E", lineHeight: 30, borderBottomWidth: 1.5, borderBottomColor: "rgba(49,47,184,0.1)", paddingBottom: 10, marginBottom: 4 },
  excerptInput:        { fontSize: 14, color: "#444", lineHeight: 22, borderWidth: 1.5, borderColor: "rgba(49,47,184,0.12)", borderRadius: 12, padding: 12, minHeight: 80 },
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
  previewExcerpt:      { fontSize: 16, fontWeight: "600", color: "#444", lineHeight: 26, marginBottom: 20, fontStyle: "italic" },
  divider:             { height: 0.5, backgroundColor: "rgba(49,47,184,0.08)", marginBottom: 20 },
  heading1:            { fontSize: 22, fontWeight: "800", color: "#1A1A2E", marginTop: 24, marginBottom: 12 },
  heading:             { fontSize: 18, fontWeight: "800", color: "#1A1A2E", marginTop: 20, marginBottom: 10 },
  heading3:            { fontSize: 16, fontWeight: "800", color: "#1A1A2E", marginTop: 18, marginBottom: 8 },
  para:                { fontSize: 15, color: "#333", lineHeight: 26, marginBottom: 16 },
  inlineBold:          { fontWeight: "800" },
  inlineItalic:        { fontStyle: "italic" },
});
