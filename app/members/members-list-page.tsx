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
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Search, X, Users, Check, Clock3, UserPlus, MessageCircle } from "lucide-react-native";
import { useAuth, type UserRole } from "../../context/AuthContext";
import AppShell from "../../components/layout/AppShell";
import AuthRequiredModal from "../../components/modals/AuthRequiredModal";
import ConnectionActionModal from "../../components/modals/ConnectionActionModal";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../constants/supabase";

type ConnectionStatus = "none" | "pending_sent" | "pending_received" | "connected";

interface Member {
  id: string;
  full_name: string;
  role: UserRole;
  company: string | null;
  location: string;
  is_verified: boolean;
  whatsapp: string | null;
  current_focus: string | null;
  connectionStatus: ConnectionStatus;
  connectionId: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  developer: "#312FB8",
  investor: "#0F6E56",
  broker: "#854F0B",
  architect: "#993556",
  tech: "#185FA5",
};

const ROLE_FILTERS: { label: string; value: UserRole | "all" }[] = [
  { label: "All", value: "all" },
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

function publicFetch(path: string) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
}

function findConnectionForMember(connections: any[], currentUserId: string, memberId: string) {
  return connections.find(
    (item) =>
      (item.requester_id === currentUserId && item.receiver_id === memberId) ||
      (item.requester_id === memberId && item.receiver_id === currentUserId)
  );
}

function pendingRequestDeletePath(currentUserId: string, memberId: string) {
  return `/connections?requester_id=eq.${currentUserId}&receiver_id=eq.${memberId}&status=eq.pending`;
}

function receivedRequestDeletePath(currentUserId: string, memberId: string) {
  return `/connections?requester_id=eq.${memberId}&receiver_id=eq.${currentUserId}&status=eq.pending`;
}

function connectionDeletePath(currentUserId: string, memberId: string) {
  return `/connections?or=(and(requester_id.eq.${currentUserId},receiver_id.eq.${memberId}),and(requester_id.eq.${memberId},receiver_id.eq.${currentUserId}))`;
}

function MemberRow({
  member,
  onPress,
  onAdd,
  onAccept,
  onDecline,
  onCancel,
  onMessage,
}: {
  member: Member;
  onPress: () => void;
  onAdd: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onMessage: () => void;
}) {
  const color = ROLE_COLORS[member.role] ?? "#312FB8";
  const isConnected = member.connectionStatus === "connected";
  const isPending = member.connectionStatus === "pending_sent" || member.connectionStatus === "pending_received";

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[s.row, isConnected && s.rowConnected]}>
      <View style={[s.avatar, { backgroundColor: color }]}>
        <Text style={s.avatarTxt}>{initials(member.full_name)}</Text>
        {isConnected ? (
          <View style={s.connDot}>
            <Check size={8} color="#FFFFFF" strokeWidth={3} />
          </View>
        ) : member.connectionStatus === "pending_sent" ? (
          <View style={s.pendingDot}>
            <Clock3 size={8} color="#FFFFFF" strokeWidth={2.8} />
          </View>
        ) : null}
      </View>

      <View style={s.info}>
        <Text style={s.name} numberOfLines={1}>
          {member.full_name}
        </Text>
        <Text style={s.meta} numberOfLines={1}>
          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
          {` · ${member.company || "No company added"}`}
          {` · ${member.location.charAt(0).toUpperCase() + member.location.slice(1)}`}
        </Text>

        <View style={s.badges}>
          {isConnected ? (
            <View style={s.badgeConn}>
              <Text style={s.badgeConnTxt}>Connected</Text>
            </View>
          ) : null}

          {isPending && member.connectionStatus === "pending_received" ? (
            <View style={s.badgePend}>
              <Text style={s.badgePendTxt}>Wants to connect</Text>
            </View>
          ) : null}

          {member.is_verified ? (
            <View style={s.badgeVer}>
              <Text style={s.badgeVerTxt}>Verified</Text>
            </View>
          ) : null}
        </View>
      </View>

      {isConnected ? (
        <TouchableOpacity onPress={onMessage} style={s.btnMessage} activeOpacity={0.8}>
          <MessageCircle size={14} color="#0F6E56" strokeWidth={2.2} />
          <Text style={s.btnMessageTxt}>Message</Text>
        </TouchableOpacity>
      ) : isPending ? (
        member.connectionStatus === "pending_sent" ? (
          <TouchableOpacity onPress={onCancel} style={s.btnPend} activeOpacity={0.8}>
            <X size={14} color="#8C5B16" strokeWidth={2.4} />
            <Text style={s.btnPendTxt}>Cancel Request</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.pendingDecisionWrap}>
            <TouchableOpacity onPress={onDecline} style={s.btnDeclineRequest} activeOpacity={0.8}>
              <X size={14} color="#B42318" strokeWidth={2.4} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onAccept} style={s.btnAcceptRequest} activeOpacity={0.8}>
              <Check size={14} color="#0F6E56" strokeWidth={2.8} />
            </TouchableOpacity>
          </View>
        )
      ) : (
        <TouchableOpacity onPress={onAdd} style={s.btnAdd} activeOpacity={0.8}>
          <UserPlus size={14} color="#312FB8" strokeWidth={2.3} />
          <Text style={s.btnAddTxt}>Connect</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function EmptyState({ tab }: { tab: "all" | "connected" }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIconWrap}>
        <View style={s.emptyIconCircleLg} />
        <View style={s.emptyIconCircleSm} />
        <View style={s.emptyIconInner}>
          <Users size={20} color="#312FB8" strokeWidth={2.1} />
        </View>
        {tab === "connected" ? (
          <View style={s.emptyIconBadge}>
            <Check size={11} color="#FFFFFF" strokeWidth={3} />
          </View>
        ) : null}
      </View>
      <Text style={s.emptyTitle}>{tab === "connected" ? "No connections yet" : "No members found"}</Text>
      <Text style={s.emptySub}>
        {tab === "connected"
          ? "Go to All Members and send connection requests to start building your network."
          : "Try adjusting your search or filters."}
      </Text>
    </View>
  );
}

export default function MembersScreen() {
  const router = useRouter();
  const { user, apiFetch, isAuthenticated, isLoading } = useAuth();

  const [tab, setTab] = useState<"all" | "connected">("all");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [cancelTarget, setCancelTarget] = useState<Member | null>(null);

  const load = useCallback(async () => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      setMembers([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const profilesRes = await publicFetch(
        `/profiles?id=neq.${user.id}&select=id,full_name,role,company,location,is_verified,whatsapp,current_focus&order=created_at.desc`
      );

      if (!profilesRes.ok) return;

      const profiles: Omit<Member, "connectionStatus" | "connectionId">[] = await profilesRes.json();

      const connRes = await apiFetch(
        `/connections?or=(requester_id.eq.${user.id},receiver_id.eq.${user.id})&select=id,requester_id,receiver_id,status`
      );
      const connections = connRes.ok ? await connRes.json() : [];

      const mapped: Member[] = profiles.map((profile) => {
        const connection = findConnectionForMember(connections, user.id, profile.id);

        if (!connection) {
          return {
            ...profile,
            connectionStatus: "none",
            connectionId: null,
          };
        }

        let status: ConnectionStatus = "none";

        if (connection.status === "accepted") {
          status = "connected";
        } else if (connection.status === "pending") {
          status = connection.requester_id === user.id ? "pending_sent" : "pending_received";
        }

        return {
          ...profile,
          connectionStatus: status,
          connectionId: connection.id,
        };
      });

      setMembers(mapped);
    } catch (error) {
      console.warn("[Members] load error", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiFetch, isAuthenticated, isLoading, user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isLoading && !isAuthenticated) {
    return (
      <AppShell>
        <View style={s.gateScreen}>
          <AuthRequiredModal visible onClose={() => router.replace("/home" as any)} />
        </View>
      </AppShell>
    );
  }

  const handleAdd = async (member: Member) => {
    if (!isAuthenticated) {
      router.push("/auth/sign-in" as any);
      return;
    }

    setMembers((prev) => prev.map((item) => (item.id === member.id ? { ...item, connectionStatus: "pending_sent" } : item)));

    const res = await apiFetch("/connections", {
      method: "POST",
      body: JSON.stringify({
        requester_id: user!.id,
        receiver_id: member.id,
        status: "pending",
      }),
    });

    if (!res.ok) {
      setMembers((prev) => prev.map((item) => (item.id === member.id ? { ...item, connectionStatus: "none" } : item)));
      Alert.alert("Error", "Could not send request. Please try again.");
      return;
    }

    await load();
  };

  const handleAccept = async (member: Member) => {
    if (!member.connectionId) return;

    setMembers((prev) => prev.map((item) => (item.id === member.id ? { ...item, connectionStatus: "connected" } : item)));

    const res = await apiFetch(`/connections?id=eq.${member.connectionId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "accepted" }),
    });

    if (!res.ok) {
      setMembers((prev) =>
        prev.map((item) =>
          item.id === member.id ? { ...item, connectionStatus: "pending_received" } : item
        )
      );
      Alert.alert("Error", "Could not accept request. Please try again.");
      return;
    }

    await load();
  };

  const handleCancelPending = (member: Member) => {
    setCancelTarget(member);
  };

  const confirmCancelPending = async () => {
    if (!user || !cancelTarget) return;

    const member = cancelTarget;
    setCancelTarget(null);
    setMembers((prev) =>
      prev.map((item) =>
        item.id === member.id ? { ...item, connectionStatus: "none", connectionId: null } : item
      )
    );

    const res = await apiFetch(pendingRequestDeletePath(user.id, member.id), {
      method: "DELETE",
    });

    if (!res.ok) {
      setMembers((prev) =>
        prev.map((item) =>
          item.id === member.id
            ? { ...item, connectionStatus: "pending_sent", connectionId: member.connectionId }
            : item
        )
      );
      Alert.alert("Error", "Could not cancel request. Please try again.");
      return;
    }

    await load();
  };

  const handleMessage = (member: Member) => {
    router.push(`/messages/${member.id}` as any);
  };

  const handleDeclineReceived = async (member: Member) => {
    if (!user) return;

    setMembers((prev) =>
      prev.map((item) =>
        item.id === member.id ? { ...item, connectionStatus: "none", connectionId: null } : item
      )
    );

    const res = await apiFetch(receivedRequestDeletePath(user.id, member.id), {
      method: "DELETE",
    });

    if (!res.ok) {
      setMembers((prev) =>
        prev.map((item) =>
          item.id === member.id
            ? { ...item, connectionStatus: "pending_received", connectionId: member.connectionId }
            : item
        )
      );
      Alert.alert("Error", "Could not decline request. Please try again.");
      return;
    }

    await load();
  };

  const handleDisconnect = (member: Member) => {
    if (!user) return;

    Alert.alert("Disconnect", `Remove ${member.full_name} from your connections?`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          setMembers((prev) =>
            prev.map((item) =>
              item.id === member.id ? { ...item, connectionStatus: "none", connectionId: null } : item
            )
          );

          const res = await apiFetch(connectionDeletePath(user.id, member.id), {
            method: "DELETE",
          });

          if (!res.ok) {
            setMembers((prev) =>
              prev.map((item) =>
                item.id === member.id
                  ? { ...item, connectionStatus: "connected", connectionId: member.connectionId }
                  : item
              )
            );
            Alert.alert("Error", "Could not disconnect right now. Please try again.");
            return;
          }

          await load();
        },
      },
    ]);
  };

  const filtered = members.filter((member) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      member.full_name.toLowerCase().includes(q) ||
      (member.company?.toLowerCase().includes(q) ?? false) ||
      member.role.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || member.role === roleFilter;
    return matchSearch && matchRole;
  });

  const allMembers = filtered.filter((member) => member.connectionStatus !== "connected");
  const connectedMembers = members.filter((member) => member.connectionStatus === "connected");
  const connectedCount = connectedMembers.length;

  const connectedFiltered = connectedMembers.filter((member) => {
    const q = search.toLowerCase();
    return (
      !q ||
      member.full_name.toLowerCase().includes(q) ||
      (member.company?.toLowerCase().includes(q) ?? false) ||
      member.role.toLowerCase().includes(q)
    );
  });

  const displayList = tab === "all" ? allMembers : connectedFiltered;

  return (
    <AppShell>
      <View style={s.container}>
        <View style={s.stickyHead}>
          <View style={s.masterTabs}>
            <TouchableOpacity
              onPress={() => setTab("all")}
              style={[s.masterTab, tab === "all" && s.masterTabOn]}
              activeOpacity={0.8}
            >
              <Text style={[s.masterTabTxt, tab === "all" && s.masterTabTxtOn]}>All Members</Text>
              <View style={[s.tabBadge, tab === "all" && s.tabBadgeActive]}>
                <Text style={[s.tabBadgeTxt, tab === "all" && s.tabBadgeTxtActive]}>{allMembers.length}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setTab("connected")}
              style={[s.masterTab, tab === "connected" && s.masterTabOn]}
              activeOpacity={0.8}
            >
              <Text style={[s.masterTabTxt, tab === "connected" && s.masterTabTxtOn]}>Connected</Text>
              <View style={[s.tabBadge, tab === "connected" && s.tabBadgeActive]}>
                <Text style={[s.tabBadgeTxt, tab === "connected" && s.tabBadgeTxtActive]}>{connectedCount}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={s.searchBar}>
            <Search size={16} color="#AAA" strokeWidth={2} />
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search name, company, role..."
              placeholderTextColor="#BBB"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {search.length > 0 ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <X size={16} color="#BBB" strokeWidth={2} />
              </TouchableOpacity>
            ) : null}
          </View>

          {tab === "all" ? (
            <View style={s.filterWrap}>
              <FlatList
                data={ROLE_FILTERS}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.value}
                contentContainerStyle={s.filterList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => setRoleFilter(item.value)}
                    style={[s.filterChip, roleFilter === item.value && s.filterChipOn]}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.filterChipTxt, roleFilter === item.value && s.filterChipTxtOn]}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={s.loader}>
            <ActivityIndicator color="#312FB8" size="large" />
          </View>
        ) : (
          <FlatList
            data={displayList}
            keyExtractor={(item) => item.id}
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
            ListEmptyComponent={<EmptyState tab={tab} />}
            renderItem={({ item }) => (
              <MemberRow
                member={item}
                onPress={() => router.push(`/members/${item.id}` as any)}
                onAdd={() => handleAdd(item)}
                onAccept={() => handleAccept(item)}
                onDecline={() => handleDeclineReceived(item)}
                onCancel={() => handleCancelPending(item)}
                onMessage={() => handleMessage(item)}
              />
            )}
          />
        )}
      </View>
      <ConnectionActionModal
        visible={!!cancelTarget}
        title="Cancel Request?"
        message={cancelTarget ? `Withdraw your connection request to ${cancelTarget.full_name}?` : ""}
        confirmLabel="Cancel Request"
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancelPending}
      />
    </AppShell>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8FC" },
  stickyHead: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(49,47,184,0.08)",
  },
  masterTabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  masterTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  masterTabOn: { borderBottomColor: "#312FB8" },
  masterTabTxt: {
    fontSize: 14,
    fontWeight: "700",
    color: "#AAAAAA",
  },
  masterTabTxtOn: { color: "#312FB8" },
  tabBadge: {
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#F1F0FA",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeActive: {
    backgroundColor: "#312FB8",
  },
  tabBadgeTxt: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B679B",
  },
  tabBadgeTxtActive: { color: "#FFFFFF" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F4F4F8",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1A1A2E",
    padding: 0,
  },
  filterWrap: { marginTop: 10 },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(49,47,184,0.15)",
    backgroundColor: "#FFFFFF",
  },
  filterChipOn: {
    backgroundColor: "#312FB8",
    borderColor: "#312FB8",
  },
  filterChipTxt: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555555",
  },
  filterChipTxtOn: { color: "#FFFFFF" },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  row: {
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
  rowConnected: {
    borderColor: "rgba(15,110,86,0.2)",
    backgroundColor: "rgba(15,110,86,0.02)",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    position: "relative",
  },
  avatarTxt: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  connDot: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: "#0F6E56",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingDot: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: "#8C5B16",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1A1A2E",
    marginBottom: 2,
  },
  meta: {
    fontSize: 11,
    color: "#888888",
    fontWeight: "500",
  },
  badges: {
    flexDirection: "row",
    gap: 5,
    marginTop: 5,
    flexWrap: "wrap",
  },
  badgeConn: {
    backgroundColor: "#E1F5EE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeConnTxt: {
    fontSize: 9,
    fontWeight: "700",
    color: "#085041",
  },
  badgePend: {
    backgroundColor: "#FAEEDA",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgePendTxt: {
    fontSize: 9,
    fontWeight: "700",
    color: "#633806",
  },
  badgeVer: {
    backgroundColor: "#E6F1FB",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeVerTxt: {
    fontSize: 9,
    fontWeight: "700",
    color: "#0C447C",
  },
  btnAdd: {
    minHeight: 32,
    borderRadius: 10,
    backgroundColor: "#EEEDFE",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "rgba(49,47,184,0.15)",
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  btnAddTxt: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: "#312FB8",
  },
  btnMessage: {
    minHeight: 32,
    borderRadius: 10,
    backgroundColor: "#EAF7F2",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "rgba(15,110,86,0.18)",
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  btnMessageTxt: { fontSize: 11, lineHeight: 14, fontWeight: "700", color: "#0F6E56" },
  btnPend: {
    minHeight: 32,
    borderRadius: 10,
    backgroundColor: "#FAEEDA",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "rgba(186,117,23,0.2)",
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  btnPendTxt: {
    color: "#8C5B16",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  pendingDecisionWrap: {
    flexDirection: "row",
    gap: 6,
    flexShrink: 0,
  },
  btnDeclineRequest: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FEECEE",
    borderWidth: 1.5,
    borderColor: "rgba(180,35,24,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnAcceptRequest: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EAF7F2",
    borderWidth: 1.5,
    borderColor: "rgba(15,110,86,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
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
  emptyIconBadge: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 18,
    height: 18,
    borderRadius: 6,
    backgroundColor: "#0F6E56",
    borderWidth: 2,
    borderColor: "#EEEDFE",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A2E",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: "#AAAAAA",
    textAlign: "center",
    lineHeight: 20,
  },
  gateScreen: { flex: 1 },
});
