import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Check, ChevronDown, Clock3, MessageCircle, Search, UserPlus, Users, X } from "lucide-react-native";
import AppShell from "../../components/layout/AppShell";
import ConnectionActionModal from "../../components/modals/ConnectionActionModal";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../../constants/supabase";
import { normalizeUserRole, useAuth, type UserRole } from "../../context/AuthContext";
import { getAvatarUri } from "../../utils/getAvatarUri";

type ConnectionStatus = "none" | "pending_sent" | "pending_received" | "connected";

interface MemberRowData {
  id: string;
  full_name: string;
  role: string;
  company: string | null;
  location: string;
  is_verified: boolean;
  avatar_url: string | null;
  updated_at?: string | null;
  created_at: string;
}

interface Member extends MemberRowData {
  role: UserRole;
  connectionStatus: ConnectionStatus;
  connectionId: string | null;
}

interface ConnectionRecord {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined";
}

const ROLE_COLORS: Record<UserRole, string> = {
  real_estate_developer: "#312FB8",
  investor: "#0F6E56",
  banker_financial_institution: "#2563EB",
  proptech_technology: "#185FA5",
  broker_consultant: "#854F0B",
  architect_designer: "#993556",
  academia: "#7C3AED",
};

type JoinedSort = "newest" | "oldest";
type FilterMenu = "role" | "location" | null;

const LOCATION_OPTIONS = [
  { label: "All Locations", value: "all" },
  { label: "Karachi", value: "karachi" },
  { label: "Lahore", value: "lahore" },
  { label: "Islamabad", value: "islamabad" },
  { label: "UAE", value: "uae" },
  { label: "KSA", value: "ksa" },
  { label: "Other", value: "other" },
] as const;

function formatRoleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    real_estate_developer: "Real Estate Developer",
    investor: "Investor",
    banker_financial_institution: "Banker / Financial Institution",
    proptech_technology: "PropTech / Technology",
    broker_consultant: "Broker / Consultant",
    architect_designer: "Architect / Designer",
    academia: "Academia",
  };

  return labels[role];
}

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

function findConnectionForMember(
  connections: ConnectionRecord[],
  currentUserId: string,
  memberId: string
) {
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
  const metaText = [
    formatRoleLabel(member.role),
    member.location.charAt(0).toUpperCase() + member.location.slice(1),
  ].join(" | ");
  const avatarUri = getAvatarUri(member.avatar_url, member.updated_at);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.row, isConnected && styles.rowConnected]}>
      <View style={[styles.avatar, { backgroundColor: color }]}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarTxt}>{initials(member.full_name)}</Text>
        )}
        {isConnected ? (
          <View style={styles.connDot}>
            <Check size={8} color="#FFFFFF" strokeWidth={3} />
          </View>
        ) : member.connectionStatus === "pending_sent" ? (
          <View style={styles.pendingDot}>
            <Clock3 size={8} color="#FFFFFF" strokeWidth={2.8} />
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {member.full_name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {metaText}
        </Text>

        <View style={styles.badges}>
          {isConnected ? (
            <View style={styles.badgeConn}>
              <Text style={styles.badgeConnTxt}>Connected</Text>
            </View>
          ) : null}

          {isPending && member.connectionStatus === "pending_received" ? (
            <View style={styles.badgePend}>
              <Text style={styles.badgePendTxt}>Wants to connect</Text>
            </View>
          ) : null}

          {member.is_verified ? (
            <View style={styles.badgeVer}>
              <Text style={styles.badgeVerTxt}>Verified</Text>
            </View>
          ) : null}
        </View>
      </View>

      {isConnected ? (
        <TouchableOpacity onPress={onMessage} style={styles.btnMessage} activeOpacity={0.8}>
          <MessageCircle size={14} color="#0F6E56" strokeWidth={2.2} />
          <Text style={styles.btnMessageTxt}>Message</Text>
        </TouchableOpacity>
      ) : isPending ? (
        member.connectionStatus === "pending_sent" ? (
          <TouchableOpacity onPress={onCancel} style={styles.btnPend} activeOpacity={0.8}>
            <X size={14} color="#8C5B16" strokeWidth={2.4} />
            <Text style={styles.btnPendTxt}>Cancel Request</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.pendingDecisionWrap}>
            <TouchableOpacity onPress={onDecline} style={styles.btnDeclineRequest} activeOpacity={0.8}>
              <X size={14} color="#B42318" strokeWidth={2.4} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onAccept} style={styles.btnAcceptRequest} activeOpacity={0.8}>
              <Check size={14} color="#0F6E56" strokeWidth={2.8} />
            </TouchableOpacity>
          </View>
        )
      ) : (
        <TouchableOpacity onPress={onAdd} style={styles.btnAdd} activeOpacity={0.8}>
          <UserPlus size={14} color="#312FB8" strokeWidth={2.3} />
          <Text style={styles.btnAddTxt}>Connect</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function EmptyState({ tab }: { tab: "all" | "connected" }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <View style={styles.emptyIconCircleLg} />
        <View style={styles.emptyIconCircleSm} />
        <View style={styles.emptyIconInner}>
          <Users size={20} color="#312FB8" strokeWidth={2.1} />
        </View>
        {tab === "connected" ? (
          <View style={styles.emptyIconBadge}>
            <Check size={11} color="#FFFFFF" strokeWidth={3} />
          </View>
        ) : null}
      </View>
      <Text style={styles.emptyTitle}>{tab === "connected" ? "No connections yet" : "No members found"}</Text>
      <Text style={styles.emptySub}>
        {tab === "connected"
          ? "Go to All Members and send connection requests to start building your network"
          : "Try adjusting your search or filters."}
      </Text>
    </View>
  );
}

export default function MembersScreen() {
  const router = useRouter();
  const { user, apiFetch, isAuthenticated, isLoading, connectionSyncTick, profileSyncTick } = useAuth();

  const [tab, setTab] = useState<"all" | "connected">("all");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [cancelTarget, setCancelTarget] = useState<Member | null>(null);
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [joinedSort, setJoinedSort] = useState<JoinedSort>("newest");
  const [locationFilter, setLocationFilter] = useState<(typeof LOCATION_OPTIONS)[number]["value"]>("all");
  const [openFilterMenu, setOpenFilterMenu] = useState<FilterMenu>(null);

  const toggleFilterMenu = (menu: Exclude<FilterMenu, null>) => {
    setOpenFilterMenu((current) => (current === menu ? null : menu));
  };

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
        `/profiles?id=neq.${user.id}&select=id,full_name,role,company,location,is_verified,avatar_url,updated_at,created_at&order=created_at.desc`
      );

      if (!profilesRes.ok) return;

      const profiles: MemberRowData[] = await profilesRes.json();

      const connRes = await apiFetch(
        `/connections?or=(requester_id.eq.${user.id},receiver_id.eq.${user.id})&select=id,requester_id,receiver_id,status`
      );
      const connections: ConnectionRecord[] = connRes.ok ? await connRes.json() : [];

      const mapped: Member[] = profiles
        .map((profile) => {
          const normalizedRole = normalizeUserRole(profile.role);
          if (!normalizedRole) return null;

          return {
            ...profile,
            role: normalizedRole,
          };
        })
        .filter((profile): profile is MemberRowData & { role: UserRole } => profile !== null)
        .map((profile) => {
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

  // ── Realtime: reload when connections change ───────────────────
  useEffect(() => {
    if (!user || !isAuthenticated || isLoading) return;
    load();
  }, [connectionSyncTick, isAuthenticated, isLoading, load, profileSyncTick, user]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/home" as any);
    }
  }, [isAuthenticated, isLoading, router]);

  if (!isLoading && !isAuthenticated) {
    return (
      <AppShell>
        <View style={styles.gateScreen} />
      </AppShell>
    );
  }

  const handleAdd = async (member: Member) => {
    if (!isAuthenticated || !user) {
      router.push("/auth/sign-in" as any);
      return;
    }

    setMembers((prev) =>
      prev.map((item) => (item.id === member.id ? { ...item, connectionStatus: "pending_sent" } : item))
    );

    const res = await apiFetch("/connections", {
      method: "POST",
      body: JSON.stringify({
        requester_id: user.id,
        receiver_id: member.id,
        status: "pending",
      }),
    });

    if (!res.ok) {
      setMembers((prev) =>
        prev.map((item) => (item.id === member.id ? { ...item, connectionStatus: "none" } : item))
      );
      Alert.alert("Error", "Could not send request. Please try again.");
      return;
    }

    await load();
  };

  const handleAccept = async (member: Member) => {
    if (!member.connectionId) return;

    setMembers((prev) =>
      prev.map((item) => (item.id === member.id ? { ...item, connectionStatus: "connected" } : item))
    );

    const res = await apiFetch(`/connections?id=eq.${member.connectionId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "accepted" }),
    });

    if (!res.ok) {
      setMembers((prev) =>
        prev.map((item) => (item.id === member.id ? { ...item, connectionStatus: "pending_received" } : item))
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

  const handleMessage = (member: Member) => {
    router.push(`/messages/${member.id}` as any);
  };

  const filtered = members.filter((member) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      member.full_name.toLowerCase().includes(q) ||
      (member.company?.toLowerCase().includes(q) ?? false) ||
      member.role.toLowerCase().includes(q);
    const matchRole = tab !== "all" || roleFilter === "all" || member.role === roleFilter;
    const matchLocation =
      tab !== "all" ||
      locationFilter === "all" ||
      member.location.toLowerCase() === locationFilter;

    return matchSearch && matchRole && matchLocation;
  });

  const allMembers = [...filtered].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return joinedSort === "newest" ? bTime - aTime : aTime - bTime;
  });
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
  const selectedLocationLabel =
    LOCATION_OPTIONS.find((option) => option.value === locationFilter)?.label ?? "All Locations";
  const selectedRoleLabel = roleFilter === "all" ? "All Roles" : formatRoleLabel(roleFilter);

  return (
    <AppShell>
      <View style={styles.container}>
        <View style={styles.stickyHead}>
          <View style={styles.masterTabs}>
            <TouchableOpacity
              onPress={() => {
                setOpenFilterMenu(null);
                setTab("all");
              }}
              style={[styles.masterTab, tab === "all" && styles.masterTabOn]}
              activeOpacity={0.8}
            >
              <Text style={[styles.masterTabTxt, tab === "all" && styles.masterTabTxtOn]}>All Members</Text>
              <View style={[styles.tabBadge, tab === "all" && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeTxt, tab === "all" && styles.tabBadgeTxtActive]}>{allMembers.length}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setOpenFilterMenu(null);
                setTab("connected");
              }}
              style={[styles.masterTab, tab === "connected" && styles.masterTabOn]}
              activeOpacity={0.8}
            >
              <Text style={[styles.masterTabTxt, tab === "connected" && styles.masterTabTxtOn]}>Connected</Text>
              <View style={[styles.tabBadge, tab === "connected" && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeTxt, tab === "connected" && styles.tabBadgeTxtActive]}>{connectedCount}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Search size={16} color="#AAA" strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setOpenFilterMenu(null)}
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
            <View style={styles.filtersWrap}>
              <View style={styles.filterControlsRow}>
                <TouchableOpacity
                  onPress={() => toggleFilterMenu("role")}
                  style={styles.dropdownField}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownValueRow}>
                    <Text style={styles.dropdownValue} numberOfLines={1}>{selectedRoleLabel}</Text>
                    <ChevronDown size={16} color="#6B679B" strokeWidth={2.2} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => toggleFilterMenu("location")}
                  style={styles.dropdownField}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownValueRow}>
                    <Text style={styles.dropdownValue} numberOfLines={1}>{selectedLocationLabel}</Text>
                    <ChevronDown size={16} color="#6B679B" strokeWidth={2.2} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setJoinedSort((prev) => (prev === "newest" ? "oldest" : "newest"))}
                  style={styles.sortField}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownValue} numberOfLines={1}>
                    {joinedSort === "newest" ? "Date Joined ↓" : "Date Joined ↑"}
                  </Text>
                </TouchableOpacity>
              </View>

              {openFilterMenu ? (
                <View style={styles.inlineDropdown}>
                  <Text style={styles.inlineDropdownTitle}>
                    {openFilterMenu === "role" ? "Select Role" : "Select Location"}
                  </Text>
                  <View style={styles.filterBubbleWrap}>
                    {(openFilterMenu === "role"
                      ? [{ label: "All Roles", value: "all" }, ...(Object.keys(ROLE_COLORS) as UserRole[]).map((role) => ({
                          label: formatRoleLabel(role),
                          value: role,
                        }))]
                      : LOCATION_OPTIONS
                    ).map((option) => {
                      const isSelected =
                        openFilterMenu === "role"
                          ? roleFilter === option.value
                          : locationFilter === option.value;

                      return (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => {
                            if (openFilterMenu === "role") {
                              setRoleFilter(option.value as "all" | UserRole);
                            } else {
                              setLocationFilter(option.value as (typeof LOCATION_OPTIONS)[number]["value"]);
                            }
                            setOpenFilterMenu(null);
                          }}
                          style={[styles.filterBubble, isSelected && styles.filterBubbleActive]}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.filterBubbleTxt, isSelected && styles.filterBubbleTxtActive]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#312FB8" size="large" />
          </View>
        ) : (
          <View style={styles.listArea}>
            {openFilterMenu ? (
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setOpenFilterMenu(null)}
                style={styles.dropdownDismissLayer}
              />
            ) : null}
            <FlatList
              data={displayList}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
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
          </View>
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

const styles = StyleSheet.create({
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
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0,
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
    fontFamily: "Outfit_700Bold",
    letterSpacing: 0,
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
  filtersWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    zIndex: 20,
  },
  filterControlsRow: {
    flexDirection: "row",
    gap: 8,
  },
  dropdownField: {
    flex: 1,
    backgroundColor: "#F7F6FD",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.12)",
    height: 32,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  sortField: {
    flex: 1,
    backgroundColor: "#F7F6FD",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.12)",
    height: 32,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  dropdownValue: {
    flex: 1,
    fontSize: 12,
    lineHeight: 14,
    fontFamily: "Outfit_400Regular",
    letterSpacing: 0,
    color: "#1A1A2E",
    textAlignVertical: "center",
  },
  inlineDropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.10)",
    shadowColor: "#18163F",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
  },
  inlineDropdownTitle: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0,
    color: "#6B679B",
    marginBottom: 2,
  },
  filterBubbleWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterBubble: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F6FD",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.12)",
  },
  filterBubbleActive: {
    backgroundColor: "#312FB8",
    borderColor: "#312FB8",
  },
  filterBubbleTxt: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    letterSpacing: 0,
    color: "#4D4A78",
  },
  filterBubbleTxtActive: {
    color: "#FFFFFF",
    fontFamily: "Outfit_600SemiBold",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    letterSpacing: 0,
    color: "#1A1A2E",
    padding: 0,
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listArea: {
    flex: 1,
  },
  dropdownDismissLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
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
    shadowColor: "#18163F",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  rowConnected: {
    borderColor: "rgba(15,110,86,0.16)",
    backgroundColor: "#FFFFFF",
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
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  avatarTxt: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Outfit_700Bold",
    letterSpacing: 0,
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
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0,
    color: "#1A1A2E",
    marginBottom: 2,
  },
  meta: {
    fontSize: 11,
    color: "#888888",
    fontFamily: "Outfit_400Regular",
    letterSpacing: 0,
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
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0,
    color: "#085041",
  },
  badgePend: {
    backgroundColor: "#FAEEDA",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgePendTxt: {
    fontSize: 9,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0,
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
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0,
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
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0,
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
  btnMessageTxt: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0,
    color: "#0F6E56",
  },
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
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0,
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
    fontFamily: "Outfit_700Bold",
    letterSpacing: 0,
    color: "#1A1A2E",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: "#AAAAAA",
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "Outfit_400Regular",
    letterSpacing: 0,
  },
  gateScreen: { flex: 1 },
});
