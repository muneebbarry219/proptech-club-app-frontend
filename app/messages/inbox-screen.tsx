import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Send, Phone } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../constants/supabase";

// ── Types ──────────────────────────────────────────────────────

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface PartnerProfile {
  id: string;
  full_name: string;
  role: string;
  company: string | null;
  whatsapp: string | null;
}

// ── Helpers ────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function formatDateDivider(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString())     return "TODAY";
  if (d.toDateString() === yesterday.toDateString()) return "YESTERDAY";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }).toUpperCase();
}

function shouldShowDateDivider(current: Message, previous: Message | undefined) {
  if (!previous) return true;
  const a = new Date(current.created_at).toDateString();
  const b = new Date(previous.created_at).toDateString();
  return a !== b;
}

const ROLE_COLORS: Record<string, string> = {
  developer: "#312FB8", investor: "#0F6E56",
  broker: "#854F0B", architect: "#993556", tech: "#185FA5",
};

// ── Message Bubble ─────────────────────────────────────────────

function MessageBubble({
  message, isMine, showTime,
}: {
  message: Message; isMine: boolean; showTime: boolean;
}) {
  return (
    <View style={[s.bubbleWrap, isMine ? s.bubbleWrapMine : s.bubbleWrapTheirs]}>
      <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleTheirs]}>
        <Text style={[s.bubbleTxt, isMine ? s.bubbleTxtMine : s.bubbleTxtTheirs]}>
          {message.content}
        </Text>
      </View>
      {showTime && (
        <Text style={[s.bubbleTime, isMine && { textAlign: "right" }]}>
          {formatTime(message.created_at)}
          {isMine && (message.is_read ? " · Read" : "")}
        </Text>
      )}
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────

export default function ChatScreen() {
  const { partnerId } = useLocalSearchParams<{ partnerId: string }>();
  const router        = useRouter();
  const insets        = useSafeAreaInsets();
  const { user, apiFetch } = useAuth();

  const [partner,   setPartner]   = useState<PartnerProfile | null>(null);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [text,      setText]      = useState("");
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const channelRef  = useRef<any>(null);

  // ── Load partner profile ───────────────────────────────────────

  useEffect(() => {
    if (!partnerId) return;
    (async () => {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${partnerId}&select=id,full_name,role,company,whatsapp`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      if (res.ok) {
        const rows = await res.json();
        if (rows[0]) setPartner(rows[0]);
      }
    })();
  }, [partnerId]);

  // ── Load messages ──────────────────────────────────────────────

  const loadMessages = useCallback(async () => {
    if (!user || !partnerId) return;
    try {
      const res = await apiFetch(
        `/direct_messages?or=(and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id}))&order=created_at.asc&select=*`
      );
      if (res.ok) {
        const data: Message[] = await res.json();
        setMessages(data);
        markAsRead(data);
      }
    } catch (e) {
      console.warn("[Chat] load error", e);
    } finally {
      setLoading(false);
    }
  }, [user, partnerId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // ── Mark incoming messages as read ─────────────────────────────

  const markAsRead = async (msgs: Message[]) => {
    if (!user) return;
    const unread = msgs.filter(m => m.receiver_id === user.id && !m.is_read);
    if (unread.length === 0) return;
    await apiFetch(
      `/direct_messages?receiver_id=eq.${user.id}&sender_id=eq.${partnerId}&is_read=eq.false`,
      { method: "PATCH", body: JSON.stringify({ is_read: true }) }
    );
  };

  // ── Supabase Realtime subscription ────────────────────────────

  useEffect(() => {
    if (!user || !partnerId) return;

    // Subscribe via Supabase Realtime REST (websocket)
    const wsUrl = `${SUPABASE_URL}/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`
      .replace("https://", "wss://")
      .replace("http://", "ws://");

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Join the realtime channel for direct_messages
      ws.send(JSON.stringify({
        topic: "realtime:direct_messages",
        event: "phx_join",
        payload: {
          config: {
            broadcast: { self: false },
            presence:  { key: "" },
            postgres_changes: [{
              event:  "*",
              schema: "public",
              table:  "direct_messages",
              filter: `or(and(sender_id=eq.${user.id},receiver_id=eq.${partnerId}),and(sender_id=eq.${partnerId},receiver_id=eq.${user.id}))`,
            }],
          },
        },
        ref: "1",
      }));
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (
          parsed.event === "postgres_changes" &&
          parsed.payload?.data?.type === "INSERT"
        ) {
          const newMsg: Message = parsed.payload.data.record;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Mark as read immediately if it's incoming
          if (newMsg.receiver_id === user.id) {
            apiFetch(
              `/direct_messages?id=eq.${newMsg.id}`,
              { method: "PATCH", body: JSON.stringify({ is_read: true }) }
            );
          }
          // Scroll to bottom
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      } catch {}
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    channelRef.current = ws;

    return () => {
      ws.close();
    };
  }, [user, partnerId]);

  // ── Auto-scroll on new messages ────────────────────────────────

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [messages.length]);

  // ── Send message ───────────────────────────────────────────────

  const handleSend = async () => {
    const content = text.trim();
    if (!content || !user || !partnerId || sending) return;

    setText("");
    setSending(true);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id:          tempId,
      sender_id:   user.id,
      receiver_id: partnerId,
      content,
      is_read:     false,
      created_at:  new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    const res = await apiFetch("/direct_messages", {
      method: "POST",
      body: JSON.stringify({
        sender_id:   user.id,
        receiver_id: partnerId,
        content,
        is_read:     false,
      }),
    });

    setSending(false);

    if (!res.ok) {
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      Alert.alert("Error", "Failed to send message. Please try again.");
      setText(content);
    } else {
      // Replace optimistic with real message from server
      const result = await res.json();
      const realMsg: Message = Array.isArray(result) ? result[0] : result;
      setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));
    }
  };

  // ── WhatsApp ───────────────────────────────────────────────────

  const handleWhatsApp = () => {
    if (partner?.whatsapp) {
      const number = partner.whatsapp.replace(/\D/g, "");
      Linking.openURL(`https://wa.me/${number}`);
    } else {
      Alert.alert(
        "No WhatsApp",
        `${partner?.full_name} hasn't added a WhatsApp number.`
      );
    }
  };

  // ── Render items ───────────────────────────────────────────────

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isMine    = item.sender_id === user?.id;
    const prev      = messages[index - 1];
    const next      = messages[index + 1];
    const showDate  = shouldShowDateDivider(item, prev);
    // Show time if last in group (next msg is from different sender or different time)
    const showTime  = !next || next.sender_id !== item.sender_id;

    return (
      <View>
        {showDate && (
          <View style={s.dateDivider}>
            <Text style={s.dateDividerTxt}>{formatDateDivider(item.created_at)}</Text>
          </View>
        )}
        <MessageBubble message={item} isMine={isMine} showTime={showTime} />
      </View>
    );
  };

  // ── Loading ────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[s.container, { paddingTop: insets.top, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#312FB8" size="large" />
      </View>
    );
  }

  const avatarColor = ROLE_COLORS[partner?.role ?? "developer"] ?? "#312FB8";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={[s.container, { paddingTop: insets.top }]}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
            <ArrowLeft size={20} color="#1a1a2e" strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={[s.headerAvatar, { backgroundColor: avatarColor }]}>
            <Text style={s.headerAvatarTxt}>
              {partner ? initials(partner.full_name) : "??"}
            </Text>
          </View>

          <View style={s.headerInfo}>
            <Text style={s.headerName} numberOfLines={1}>
              {partner?.full_name ?? "Loading..."}
            </Text>
            <Text style={s.headerSub} numberOfLines={1}>
              {partner?.role
                ? partner.role.charAt(0).toUpperCase() + partner.role.slice(1)
                : ""}
              {partner?.company ? ` · ${partner.company}` : ""}
            </Text>
          </View>

          <TouchableOpacity onPress={handleWhatsApp} style={s.waBtn} activeOpacity={0.8}>
            <Phone size={18} color="#0F6E56" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* ── Messages ── */}
        {messages.length === 0 ? (
          <View style={s.emptyChat}>
            <View style={[s.emptyChatAvatar, { backgroundColor: avatarColor }]}>
              <Text style={s.emptyChatAvatarTxt}>
                {partner ? initials(partner.full_name) : "??"}
              </Text>
            </View>
            <Text style={s.emptyChatName}>{partner?.full_name}</Text>
            <Text style={s.emptyChatSub}>
              You're connected! Send a message to start the conversation.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={m => m.id}
            renderItem={renderItem}
            contentContainerStyle={s.messagesList}
            showsVerticalScrollIndicator={false}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* ── Input bar ── */}
        <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#bbb"
            multiline
            maxLength={1000}
            returnKeyType="default"
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!text.trim() || sending}
            activeOpacity={0.8}
            style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Send size={18} color="#fff" strokeWidth={2.2} />
            }
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: "#f8f8fc" },
  header:             { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "rgba(49,47,184,0.08)" },
  backBtn:            { width: 38, height: 38, borderRadius: 12, backgroundColor: "#f4f4f8", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  headerAvatar:       { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  headerAvatarTxt:    { color: "#fff", fontSize: 13, fontWeight: "800" },
  headerInfo:         { flex: 1, minWidth: 0 },
  headerName:         { fontSize: 15, fontWeight: "800", color: "#1a1a2e" },
  headerSub:          { fontSize: 11, color: "#888", fontWeight: "500", textTransform: "capitalize" },
  waBtn:              { width: 38, height: 38, borderRadius: 12, backgroundColor: "#E1F5EE", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(15,110,86,0.2)", flexShrink: 0 },
  messagesList:       { padding: 16, paddingBottom: 8 },
  dateDivider:        { alignItems: "center", marginVertical: 12 },
  dateDividerTxt:     { fontSize: 10, fontWeight: "700", color: "#bbb", letterSpacing: 1 },
  bubbleWrap:         { marginBottom: 2 },
  bubbleWrapMine:     { alignItems: "flex-end" },
  bubbleWrapTheirs:   { alignItems: "flex-start" },
  bubble:             { maxWidth: "75%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMine:         { backgroundColor: "#312FB8", borderBottomRightRadius: 4 },
  bubbleTheirs:       { backgroundColor: "#fff", borderWidth: 0.5, borderColor: "rgba(49,47,184,0.08)", borderBottomLeftRadius: 4 },
  bubbleTxt:          { fontSize: 14, lineHeight: 20 },
  bubbleTxtMine:      { color: "#fff" },
  bubbleTxtTheirs:    { color: "#1a1a2e" },
  bubbleTime:         { fontSize: 10, color: "#bbb", paddingHorizontal: 4, marginTop: 3, marginBottom: 6 },
  emptyChat:          { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  emptyChatAvatar:    { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyChatAvatarTxt: { color: "#fff", fontSize: 26, fontWeight: "900" },
  emptyChatName:      { fontSize: 18, fontWeight: "800", color: "#1a1a2e" },
  emptyChatSub:       { fontSize: 13, color: "#aaa", textAlign: "center", lineHeight: 20 },
  inputBar:           { flexDirection: "row", alignItems: "flex-end", gap: 10, backgroundColor: "#fff", paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: "rgba(49,47,184,0.08)" },
  input:              { flex: 1, backgroundColor: "#f4f4f8", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: "#1a1a2e", maxHeight: 100 },
  sendBtn:            { width: 40, height: 40, borderRadius: 13, backgroundColor: "#312FB8", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  sendBtnDisabled:    { backgroundColor: "rgba(49,47,184,0.3)" },
});
