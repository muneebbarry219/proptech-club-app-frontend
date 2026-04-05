import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  MessageCircle,
  UserPlus,
  Clock3,
  Check,
  X,
  Building2,
  MapPin,
  CalendarDays,
  ChevronRight,
} from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import AppShell from "../../components/layout/AppShell";
import ConnectionActionModal from "../../components/modals/ConnectionActionModal";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../constants/supabase";

type ConnectionStatus = "none" | "pending_sent" | "pending_received" | "connected";

interface MemberProfile {
  id: string;
  full_name: string;
  role: string;
  company: string | null;
  location: string;
  current_focus: string | null;
  looking_for: string[];
  bio: string | null;
  whatsapp: string | null;
  is_verified: boolean;
  created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  developer: "#312FB8",
  investor: "#0F6E56",
  broker: "#854F0B",
  architect: "#993556",
  tech: "#185FA5",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
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

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, apiFetch, isAuthenticated } = useAuth();

  const [member, setMember] = useState<MemberProfile | null>(null);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>("none");
  const [connId, setConnId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoad, setActionLoad] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const loadMember = useCallback(async () => {
    if (!id) return;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}&select=*`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!res.ok) return;

    const rows = await res.json();
    if (rows[0]) {
      setMember(rows[0]);
    }
  }, [id]);

  const loadConnectionState = useCallback(async () => {
    if (!id || !isAuthenticated || !user) {
      setConnStatus("none");
      setConnId(null);
      return;
    }

    const cRes = await apiFetch(
      `/connections?or=(and(requester_id.eq.${user.id},receiver_id.eq.${id}),and(requester_id.eq.${id},receiver_id.eq.${user.id}))&select=id,requester_id,receiver_id,status`
    );

    if (!cRes.ok) {
      setConnStatus("none");
      setConnId(null);
      return;
    }

    const rows = await cRes.json();
    if (!rows[0]) {
      setConnStatus("none");
      setConnId(null);
      return;
    }

    const connection = rows[0];
    setConnId(connection.id);

    if (connection.status === "accepted") {
      setConnStatus("connected");
    } else if (connection.status === "pending") {
      setConnStatus(connection.requester_id === user.id ? "pending_sent" : "pending_received");
    } else {
      setConnStatus("none");
      setConnId(null);
    }
  }, [apiFetch, id, isAuthenticated, user]);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        await Promise.all([loadMember(), loadConnectionState()]);
      } catch (error) {
        console.warn("[MemberProfile] load error", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, loadConnectionState, loadMember]);

  const handleConnect = async () => {
    if (!isAuthenticated) {
      router.push("/auth/sign-in" as any);
      return;
    }

    setActionLoad(true);
    const res = await apiFetch("/connections", {
      method: "POST",
      body: JSON.stringify({
        requester_id: user!.id,
        receiver_id: id,
        status: "pending",
      }),
    });
    setActionLoad(false);

    if (res.ok) {
      await loadConnectionState();
      return;
    }

    Alert.alert("Error", "Could not send request. Please try again.");
  };

  const handleAccept = async () => {
    if (!connId) return;

    setActionLoad(true);
    const res = await apiFetch(`/connections?id=eq.${connId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "accepted" }),
    });
    setActionLoad(false);

    if (res.ok) {
      await loadConnectionState();
      return;
    }

    Alert.alert("Error", "Could not accept request. Please try again.");
  };

  const handleDecline = async () => {
    if (!user) return;

    setActionLoad(true);
    const res = await apiFetch(`/connections?id=eq.${connId}`, {
      method: "DELETE",
    });
    setActionLoad(false);

    if (res.ok) {
      await loadConnectionState();
      return;
    }

    Alert.alert("Error", "Could not decline request. Please try again.");
  };

  const handleMessage = () => {
    if (!member) return;
    router.push(`/messages/${member.id}` as any);
  };

  const handleDisconnect = () => {
    if (!user || !member) return;

    Alert.alert("Disconnect", `Remove ${member.full_name} from your connections?`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          setActionLoad(true);
          const res = await apiFetch(`/connections?id=eq.${connId}`, {
            method: "DELETE",
          });
          setActionLoad(false);

          if (res.ok) {
            await loadConnectionState();
            return;
          }

          Alert.alert("Error", "Could not disconnect right now. Please try again.");
        },
      },
    ]);
  };

  const handleCancelRequest = async () => {
    if (!user) return;

    setActionLoad(true);
    const res = await apiFetch(`/connections?id=eq.${connId}`, {
      method: "DELETE",
    });
    setActionLoad(false);

    if (res.ok) {
      await loadConnectionState();
      return;
    }

    Alert.alert("Error", "Could not cancel request. Please try again.");
  };

  const renderActionBtn = () => {
    if (!isAuthenticated) {
      return (
        <TouchableOpacity onPress={() => router.push("/auth/sign-in" as any)} style={s.btnConnect} activeOpacity={0.85}>
          <UserPlus size={16} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={s.btnConnectTxt}>Connect</Text>
        </TouchableOpacity>
      );
    }

    if (connStatus === "connected") {
      return (
        <View style={s.connectedActions}>
          <TouchableOpacity onPress={handleMessage} style={s.btnMsg} activeOpacity={0.85}>
            <MessageCircle size={16} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={s.btnMsgTxt}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDisconnect} style={s.btnDisconnect} activeOpacity={0.85} disabled={actionLoad}>
            {actionLoad ? (
              <ActivityIndicator color="#B42318" size="small" />
            ) : (
              <>
                <X size={16} color="#B42318" strokeWidth={2.4} />
                <Text style={s.btnDisconnectTxt}>Disconnect</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (connStatus === "pending_sent") {
      return (
        <TouchableOpacity onPress={() => setCancelModalOpen(true)} style={s.btnDecline} activeOpacity={0.85} disabled={actionLoad}>
          {actionLoad ? (
            <ActivityIndicator color="#DC2626" size="small" />
          ) : (
            <>
              <X size={16} color="#DC2626" strokeWidth={2.4} />
              <Text style={s.btnDeclineTxt}>Cancel Request</Text>
            </>
          )}
        </TouchableOpacity>
      );
    }

    if (connStatus === "pending_received") {
      return (
        <View style={s.pendingActions}>
          <TouchableOpacity onPress={handleDecline} style={s.btnDecline} activeOpacity={0.85}>
            <Text style={s.btnDeclineTxt}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAccept} style={s.btnConnect} activeOpacity={0.85}>
            <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={s.btnConnectTxt}>Accept</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity onPress={handleConnect} disabled={actionLoad} style={s.btnConnect} activeOpacity={0.85}>
        {actionLoad ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <UserPlus size={16} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={s.btnConnectTxt}>Connect</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <AppShell>
        <View style={[s.container, s.centerState]}>
          <ActivityIndicator color="#312FB8" size="large" />
        </View>
      </AppShell>
    );
  }

  if (!member) {
    return (
      <AppShell>
        <View style={[s.container, s.centerState]}>
          <Text style={s.emptyStateText}>Member not found.</Text>
        </View>
      </AppShell>
    );
  }

  const avatarColor = ROLE_COLORS[member.role] ?? "#312FB8";

  return (
    <AppShell>
      <View style={s.container}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtnFloating} activeOpacity={0.8}>
          <ArrowLeft size={20} color="#1A1A2E" strokeWidth={2.2} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
          <View style={s.hero}>
            <View style={[s.avatar, { backgroundColor: avatarColor }]}>
              <Text style={s.avatarTxt}>{initials(member.full_name)}</Text>
              {connStatus === "connected" ? (
                <View style={s.connBadge}>
                  <Check size={10} color="#FFFFFF" strokeWidth={3} />
                </View>
              ) : connStatus === "pending_sent" || connStatus === "pending_received" ? (
                <View style={s.pendingBadge}>
                  <Clock3 size={10} color="#FFFFFF" strokeWidth={2.6} />
                </View>
              ) : null}
            </View>

            <Text style={s.heroName}>{member.full_name}</Text>
            <Text style={s.heroRole}>
              {capitalize(member.role)} · {capitalize(member.location)}
            </Text>

            <View style={s.heroBadges}>
              {connStatus === "connected" ? (
                <View style={s.badgeConn}>
                  <Text style={s.badgeConnTxt}>Connected</Text>
                </View>
              ) : connStatus === "pending_sent" ? (
                <View style={s.badgePend}>
                  <Text style={s.badgePendTxt}>Request sent</Text>
                </View>
              ) : connStatus === "pending_received" ? (
                <View style={s.badgePend}>
                  <Text style={s.badgePendTxt}>Request received</Text>
                </View>
              ) : null}

              {member.is_verified ? (
                <View style={s.badgeVer}>
                  <Check size={12} color="#0C447C" strokeWidth={2.5} />
                  <Text style={s.badgeVerTxt}>Verified</Text>
                </View>
              ) : null}
            </View>

            <View style={s.actionWrap}>{renderActionBtn()}</View>
          </View>

          <View style={s.section}>
            <Text style={s.secLabel}>About</Text>
            <View style={s.card}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>BIO</Text>
                <Text style={[s.infoValue, !member.bio && s.infoValueMuted]}>
                  {member.bio || "No bio yet."}
                </Text>
              </View>

              {member.current_focus ? (
                <>
                  <View style={s.divider} />
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>CURRENT FOCUS</Text>
                    <Text style={s.infoValue}>{member.current_focus}</Text>
                  </View>
                </>
              ) : null}
            </View>
          </View>

          <View style={s.section}>
            <Text style={s.secLabel}>Details</Text>
            <View style={s.card}>
              <View style={s.detailRow}>
                <View style={s.detailIcon}>
                  <Building2 size={16} color="#312FB8" strokeWidth={2} />
                </View>
                <View>
                  <Text style={s.infoLabel}>COMPANY</Text>
                  <Text style={s.infoValue}>{member.company || "—"}</Text>
                </View>
              </View>

              <View style={s.divider} />

              <View style={s.detailRow}>
                <View style={s.detailIcon}>
                  <MapPin size={16} color="#312FB8" strokeWidth={2} />
                </View>
                <View>
                  <Text style={s.infoLabel}>LOCATION</Text>
                  <Text style={s.infoValue}>{capitalize(member.location)}</Text>
                </View>
              </View>

              <View style={s.divider} />

              <View style={s.detailRow}>
                <View style={s.detailIcon}>
                  <CalendarDays size={16} color="#312FB8" strokeWidth={2} />
                </View>
                <View>
                  <Text style={s.infoLabel}>MEMBER SINCE</Text>
                  <Text style={s.infoValue}>
                    {new Date(member.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {member.looking_for?.length > 0 ? (
            <View style={s.section}>
              <Text style={s.secLabel}>Looking For</Text>
              <View style={s.card}>
                <View style={s.tagsWrap}>
                  {member.looking_for.map((item) => (
                    <View key={item} style={s.tag}>
                      <Text style={s.tagTxt}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          {connStatus === "connected" ? (
            <View style={s.section}>
              <Text style={s.secLabel}>Contact</Text>
              <TouchableOpacity onPress={handleMessage} style={s.waBtn} activeOpacity={0.85}>
                <View style={s.waIcon}>
                  <MessageCircle size={18} color="#0F6E56" strokeWidth={2} />
                </View>
                <View style={s.waCopy}>
                  <Text style={s.waBtnTitle}>Message</Text>
                  <Text style={s.waBtnSub}>Open your conversation with {member.full_name}</Text>
                </View>
                <ChevronRight size={18} color="#0F6E56" strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </View>
      <ConnectionActionModal
        visible={cancelModalOpen}
        title="Cancel Request?"
        message={member ? `Withdraw your connection request to ${member.full_name}?` : ""}
        confirmLabel="Cancel Request"
        onClose={() => setCancelModalOpen(false)}
        onConfirm={async () => {
          setCancelModalOpen(false);
          await handleCancelRequest();
        }}
      />
    </AppShell>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8FC" },
  centerState: { alignItems: "center", justifyContent: "center" },
  emptyStateText: { color: "#AAA", fontSize: 14 },
  backBtnFloating: {
    position: "absolute",
    top: 12,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  scrollContent: { paddingBottom: 40 },
  hero: {
    alignItems: "center",
    paddingTop: 70,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(49,47,184,0.06)",
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    position: "relative",
  },
  avatarTxt: { color: "#FFFFFF", fontSize: 30, fontWeight: "900" },
  connBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 7,
    backgroundColor: "#0F6E56",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 7,
    backgroundColor: "#8C5B16",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1A1A2E",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroRole: { fontSize: 14, color: "#888", fontWeight: "500", textTransform: "capitalize" },
  heroBadges: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  badgeConn: {
    backgroundColor: "#E1F5EE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeConnTxt: { fontSize: 11, fontWeight: "700", color: "#085041" },
  badgePend: {
    backgroundColor: "#FAEEDA",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgePendTxt: { fontSize: 11, fontWeight: "700", color: "#633806" },
  badgeVer: {
    backgroundColor: "#E6F1FB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgeVerTxt: { fontSize: 11, fontWeight: "700", color: "#0C447C" },
  actionWrap: { marginTop: 22 },
  connectedActions: { flexDirection: "row", gap: 10 },
  btnConnect: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#312FB8",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  btnConnectTxt: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  btnMsg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0F6E56",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  btnMsgTxt: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  btnDisconnect: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(180,35,24,0.18)",
  },
  btnDisconnectTxt: { color: "#B42318", fontSize: 15, fontWeight: "800" },
  pendingActions: { flexDirection: "row", gap: 10 },
  btnDecline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(220,38,38,0.2)",
  },
  btnDeclineTxt: { color: "#DC2626", fontSize: 15, fontWeight: "700" },
  section: { paddingHorizontal: 16, marginTop: 22 },
  secLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9BA3B8",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "rgba(49,47,184,0.08)",
    overflow: "hidden",
  },
  infoRow: { padding: 14 },
  infoLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#AAA",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 14,
    color: "#1A1A2E",
    fontWeight: "500",
    lineHeight: 20,
  },
  infoValueMuted: {
    color: "#8D93A8",
  },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEEDFE",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 0.5,
    backgroundColor: "rgba(49,47,184,0.06)",
    marginLeft: 62,
  },
  tagsWrap: {
    padding: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: "#EEEDFE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagTxt: { fontSize: 12, fontWeight: "600", color: "#3C3489" },
  waBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "rgba(15,110,86,0.2)",
    padding: 16,
  },
  waIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EAF7F2",
    alignItems: "center",
    justifyContent: "center",
  },
  waCopy: { flex: 1 },
  waBtnTitle: { fontSize: 14, fontWeight: "700", color: "#1A1A2E", marginBottom: 2 },
  waBtnSub: { fontSize: 12, color: "#888" },
});
