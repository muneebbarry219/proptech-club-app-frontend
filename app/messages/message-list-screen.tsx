import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Search, X, MessageSquareText, Plus, Check, Users } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import AppShell from "../../components/layout/AppShell";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../constants/supabase";

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerRole: string;
  partnerCompany: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface ConnectionOption {
  id: string;
  full_name: string;
  role: string;
  company: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  developer: "#312FB8",
  investor: "#0F6E56",
  broker: "#854F0B",
  architect: "#993556",
  tech: "#185FA5",
};

type FilterType = "all" | "unread" | "developer" | "investor" | "broker" | "architect" | "tech";

const FILTERS: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Developer", value: "developer" },
  { label: "Investor", value: "investor" },
  { label: "Broker", value: "broker" },
  { label: "Architect", value: "architect" },
  { label: "Tech", value: "tech" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 172800000) return "Yesterday";
  const date = new Date(iso);
  return date.toLocaleDateString("en-GB", { weekday: "short" });
}

function conversationRoute(partnerId: string) {
  return `/messages/${partnerId}` as any;
}

function ConvRow({ conv, onPress }: { conv: Conversation; onPress: () => void }) {
  const color = ROLE_COLORS[conv.partnerRole] ?? "#312FB8";
  const hasUnread = conv.unreadCount > 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={s.convRow}>
      <View style={[s.avatar, { backgroundColor: color }]}>
        <Text style={s.avatarTxt}>{initials(conv.partnerName)}</Text>
      </View>

      <View style={s.convInfo}>
        <View style={s.convTopRow}>
          <Text style={[s.convName, hasUnread && s.convNameBold]} numberOfLines={1}>
            {conv.partnerName}
          </Text>
          <Text style={s.convTime}>{timeAgo(conv.lastMessageAt)}</Text>
        </View>
        <View style={s.convBottomRow}>
          <Text style={[s.convPreview, hasUnread && s.convPreviewUnread]} numberOfLines={1}>
            {conv.lastMessage}
          </Text>
          {hasUnread ? (
            <View style={s.unreadBadge}>
              <Text style={s.unreadBadgeTxt}>{conv.unreadCount > 9 ? "9+" : conv.unreadCount}</Text>
            </View>
          ) : null}
        </View>
        <Text style={s.convRole}>
          {conv.partnerRole.charAt(0).toUpperCase() + conv.partnerRole.slice(1)}
          {conv.partnerCompany ? ` · ${conv.partnerCompany}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ConnectionRow({
  connection,
  onPress,
}: {
  connection: ConnectionOption;
  onPress: () => void;
}) {
  const color = ROLE_COLORS[connection.role] ?? "#312FB8";

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={s.connectionRow}>
      <View style={[s.avatar, { backgroundColor: color }]}>
        <Text style={s.avatarTxt}>{initials(connection.full_name)}</Text>
      </View>
      <View style={s.connectionInfo}>
        <Text style={s.connectionName} numberOfLines={1}>
          {connection.full_name}
        </Text>
        <Text style={s.connectionMeta} numberOfLines={1}>
          {connection.role.charAt(0).toUpperCase() + connection.role.slice(1)}
          {connection.company ? ` · ${connection.company}` : ""}
        </Text>
      </View>
      <View style={s.connectionAction}>
        <Text style={s.connectionActionTxt}>Chat</Text>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({
  hasSearch,
  onStartChat,
}: {
  hasSearch: boolean;
  onStartChat: () => void;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIconWrap}>
        <View style={s.emptyIconCircleLg} />
        <View style={s.emptyIconCircleSm} />
        <View style={s.emptyIconInner}>
          <MessageSquareText size={20} color="#312FB8" strokeWidth={2.1} />
        </View>
      </View>
      <Text style={s.emptyTitle}>{hasSearch ? "No conversations found" : "No conversations yet"}</Text>
      <Text style={s.emptySub}>
        {hasSearch ? "Try a different search or filter." : "Start a conversation with one of your connections."}
      </Text>
      {!hasSearch ? (
        <TouchableOpacity onPress={onStartChat} activeOpacity={0.85} style={s.startChatBtn}>
          <Plus size={16} color="#FFFFFF" strokeWidth={2.6} />
          <Text style={s.startChatBtnTxt}>Initiate Chat</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user, apiFetch, isAuthenticated } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [showStartChatModal, setShowStartChatModal] = useState(false);

  const loadConnections = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setConnections([]);
      return;
    }

    setConnectionsLoading(true);

    try {
      const res = await apiFetch(
        `/connections?or=(requester_id.eq.${user.id},receiver_id.eq.${user.id})&status=eq.accepted&select=requester_id,receiver_id`
      );

      if (!res.ok) {
        setConnections([]);
        return;
      }

      const rows = await res.json();
      const partnerIds = Array.from(
        new Set(
          rows.map((item: any) => (item.requester_id === user.id ? item.receiver_id : item.requester_id)).filter(Boolean)
        )
      );

      if (!partnerIds.length) {
        setConnections([]);
        return;
      }

      const profilesRes = await apiFetch(
        `/profiles?id=in.(${partnerIds.join(",")})&select=id,full_name,role,company`
      );

      if (!profilesRes.ok) {
        setConnections([]);
        return;
      }

      const profiles = await profilesRes.json();
      profiles.sort((a: ConnectionOption, b: ConnectionOption) => a.full_name.localeCompare(b.full_name));
      setConnections(profiles);
    } catch (error) {
      console.warn("[Messages] load connections error", error);
      setConnections([]);
    } finally {
      setConnectionsLoading(false);
    }
  }, [apiFetch, isAuthenticated, user]);

  const load = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch(
        `/direct_messages?or=(sender_id.eq.${user.id},receiver_id.eq.${user.id})&order=created_at.desc&select=id,sender_id,receiver_id,content,is_read,created_at`
      );

      if (!res.ok) return;

      const messages = await res.json();
      const convMap = new Map<
        string,
        { lastMessage: string; lastMessageAt: string; unreadCount: number; partnerId: string }
      >();

      for (const msg of messages) {
        const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!convMap.has(partnerId)) {
          convMap.set(partnerId, {
            partnerId,
            lastMessage: msg.content,
            lastMessageAt: msg.created_at,
            unreadCount: 0,
          });
        }

        if (msg.receiver_id === user.id && !msg.is_read) {
          const existing = convMap.get(partnerId)!;
          convMap.set(partnerId, { ...existing, unreadCount: existing.unreadCount + 1 });
        }
      }

      if (convMap.size === 0) {
        setConversations([]);
        return;
      }

      const partnerIds = Array.from(convMap.keys());
      const profilesRes = await apiFetch(`/profiles?id=in.(${partnerIds.join(",")})&select=id,full_name,role,company`);
      if (!profilesRes.ok) return;

      const profiles = await profilesRes.json();
      const convList: Conversation[] = profiles.map((profile: any) => {
        const conv = convMap.get(profile.id)!;
        return {
          partnerId: profile.id,
          partnerName: profile.full_name,
          partnerRole: profile.role,
          partnerCompany: profile.company,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount,
        };
      });

      convList.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
      setConversations(convList);
    } catch (error) {
      console.warn("[Messages] load error", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiFetch, isAuthenticated, user]);

  useEffect(() => {
    load();
  }, [load]);

  const openStartChat = async () => {
    setShowStartChatModal(true);
    if (!connections.length) {
      await loadConnections();
    }
  };

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  const displayed = conversations.filter((conv) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q || conv.partnerName.toLowerCase().includes(q) || (conv.partnerCompany?.toLowerCase().includes(q) ?? false);
    const matchFilter =
      filter === "all" ? true : filter === "unread" ? conv.unreadCount > 0 : conv.partnerRole === filter;
    return matchSearch && matchFilter;
  });

  if (!isAuthenticated) {
    return (
      <AppShell>
        <View style={s.container}>
        <View style={s.empty}>
          <View style={s.emptyIconWrap}>
            <View style={s.emptyIconCircleLg} />
            <View style={s.emptyIconCircleSm} />
            <View style={s.emptyIconInner}>
              <MessageSquareText size={20} color="#312FB8" strokeWidth={2.1} />
            </View>
          </View>
          <Text style={s.emptyTitle}>Sign in to view messages</Text>
          <TouchableOpacity onPress={() => router.push("/auth/sign-in" as any)} style={s.signInBtn}>
            <Text style={s.signInTxt}>Sign In</Text>
          </TouchableOpacity>
        </View>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <View style={s.container}>

      <View style={s.stickyHead}>
        <View style={s.titleRow}>
          <Text style={s.title}>Messages</Text>
          <View style={s.headerActions}>
            {totalUnread > 0 ? (
              <View style={s.unreadPill}>
                <Text style={s.unreadPillTxt}>{totalUnread} unread</Text>
              </View>
            ) : null}
            <TouchableOpacity onPress={openStartChat} activeOpacity={0.85} style={s.headerChatBtn}>
              <Plus size={15} color="#FFFFFF" strokeWidth={2.6} />
              <Text style={s.headerChatBtnTxt}>Initiate Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.searchBar}>
          <Search size={16} color="#AAA" strokeWidth={2} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search conversations..."
            placeholderTextColor="#BBB"
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X size={16} color="#BBB" strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          data={FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.value}
          contentContainerStyle={s.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setFilter(item.value)}
              style={[s.filterChip, filter === item.value && s.filterChipOn]}
              activeOpacity={0.8}
            >
              <Text style={[s.filterChipTxt, filter === item.value && s.filterChipTxtOn]}>
                {item.label}
                {item.value === "unread" && totalUnread > 0 ? ` (${totalUnread})` : ""}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator color="#312FB8" size="large" />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.partnerId}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor="#312FB8"
            />
          }
          ListEmptyComponent={<EmptyState hasSearch={search.length > 0 || filter !== "all"} onStartChat={openStartChat} />}
          renderItem={({ item }) => (
            <ConvRow conv={item} onPress={() => router.push(conversationRoute(item.partnerId))} />
          )}
        />
      )}

      <Modal visible={showStartChatModal} transparent animationType="fade" onRequestClose={() => setShowStartChatModal(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setShowStartChatModal(false)}>
          <Pressable style={s.modalCard} onPress={() => {}}>
            <TouchableOpacity onPress={() => setShowStartChatModal(false)} activeOpacity={0.85} style={s.modalCloseBtn}>
              <X size={14} color="#72768B" strokeWidth={2.2} />
            </TouchableOpacity>

            <View style={s.modalBadge}>
              <Users size={20} color="#312FB8" strokeWidth={2.1} />
            </View>
            <Text style={s.modalTitle}>Start a new chat</Text>
            <Text style={s.modalText}>Choose one of your connections to open a conversation.</Text>

            {connectionsLoading ? (
              <View style={s.modalState}>
                <ActivityIndicator color="#312FB8" size="small" />
              </View>
            ) : connections.length === 0 ? (
              <View style={s.modalState}>
                <Text style={s.modalStateTitle}>No connections yet</Text>
                <Text style={s.modalStateText}>You need to make connections to start conversation.</Text>
              </View>
            ) : (
              <FlatList
                data={connections}
                keyExtractor={(item) => item.id}
                style={s.connectionsList}
                contentContainerStyle={s.connectionsListContent}
                renderItem={({ item }) => (
                  <ConnectionRow
                    connection={item}
                    onPress={() => {
                      setShowStartChatModal(false);
                      router.push(conversationRoute(item.id));
                    }}
                  />
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      </View>
    </AppShell>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8FC" },
  stickyHead: { backgroundColor: "#FFFFFF", borderBottomWidth: 0.5, borderBottomColor: "rgba(49,47,184,0.08)" },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  title: { fontSize: 17, fontWeight: "800", color: "#1A1A2E", flexShrink: 0 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  unreadPill: { backgroundColor: "#312FB8", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  unreadPillTxt: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  headerChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#312FB8",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  headerChatBtnTxt: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F4F4F8",
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1A1A2E", padding: 0 },
  filterList: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(49,47,184,0.15)",
    backgroundColor: "#FFFFFF",
  },
  filterChipOn: { backgroundColor: "#312FB8", borderColor: "#312FB8" },
  filterChipTxt: { fontSize: 12, fontWeight: "600", color: "#555" },
  filterChipTxtOn: { color: "#FFFFFF" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "rgba(49,47,184,0.08)",
    padding: 14,
    marginBottom: 8,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarTxt: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  convInfo: { flex: 1, minWidth: 0 },
  convTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  convName: { fontSize: 14, fontWeight: "600", color: "#1A1A2E", flex: 1, marginRight: 8 },
  convNameBold: { fontWeight: "800" },
  convTime: { fontSize: 10, color: "#BBB", fontWeight: "500", flexShrink: 0 },
  convBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  convPreview: { fontSize: 12, color: "#AAA", flex: 1, marginRight: 8 },
  convPreviewUnread: { color: "#312FB8", fontWeight: "600" },
  convRole: { fontSize: 10, color: "#BBB", fontWeight: "500" },
  unreadBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#312FB8",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  unreadBadgeTxt: { color: "#FFFFFF", fontSize: 9, fontWeight: "700" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
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
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#1A1A2E", textAlign: "center" },
  emptySub: { fontSize: 13, color: "#AAA", textAlign: "center", lineHeight: 20 },
  startChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#312FB8",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  startChatBtnTxt: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  signInBtn: { backgroundColor: "#312FB8", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  signInTxt: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,18,40,0.56)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "78%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 26,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.10)",
    shadowColor: "#1B196A",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 12,
  },
  modalCloseBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.12)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  modalBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#EEF0FF",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.14)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: "#121426",
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#5C6278",
    marginBottom: 18,
    textAlign: "center",
  },
  modalState: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  modalStateTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1A2E",
    textAlign: "center",
    marginTop: 10,
  },
  modalStateText: {
    fontSize: 13,
    color: "#7C8298",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 6,
  },
  connectionsList: { flexGrow: 0 },
  connectionsListContent: { gap: 8 },
  connectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.08)",
    padding: 14,
  },
  connectionInfo: { flex: 1, minWidth: 0 },
  connectionName: { fontSize: 14, fontWeight: "800", color: "#1A1A2E", marginBottom: 2 },
  connectionMeta: { fontSize: 11, color: "#888", fontWeight: "500" },
  connectionAction: {
    minHeight: 30,
    borderRadius: 10,
    backgroundColor: "#EEEDFE",
    borderWidth: 1.5,
    borderColor: "rgba(49,47,184,0.15)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  connectionActionTxt: { fontSize: 11, fontWeight: "700", color: "#312FB8" },
});
