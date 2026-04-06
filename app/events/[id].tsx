import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking, Modal, Pressable,
  TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Download, Check, Clock3, X } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../constants/supabase";

// ── Types ──────────────────────────────────────────────────────

interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  venue: string | null;
  location: string | null;
  event_type: string;
  registration_type: "open" | "exclusive";
  registration_url: string | null;
  report_url: string | null;
  whatsapp_link: string | null;
  website_url: string | null;
  is_past: boolean;
  is_featured: boolean;
}

interface Speaker {
  id: string;
  user_id: string | null;
  name: string;
  company: string | null;
  role: string | null;
  topic: string | null;
  photo_url: string | null;
  is_keynote: boolean;
  bio: string | null;
}

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  tier: string;
  website_url: string | null;
}

interface AgendaItem {
  id: string;
  day_number: number;
  day_label: string | null;
  start_time: string;
  end_time: string | null;
  title: string;
  description: string | null;
  speaker_name: string | null;
  location: string | null;
}

interface Attendee {
  id: string;
  user_id: string;
  status: string;
  profiles: { full_name: string; role: string } | null;
}

// ── Constants ──────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  real_estate_developer: "#312FB8",
  developer: "#312FB8",
  investor: "#0F6E56",
  banker_financial_institution: "#2563EB",
  proptech_technology: "#185FA5",
  tech: "#185FA5",
  broker_consultant: "#854F0B",
  broker: "#854F0B",
  architect_designer: "#993556",
  architect: "#993556",
  academia: "#7C3AED",
};

const SPONSOR_TIER_ORDER = ["title", "gold", "silver", "bronze", "partner"];
const SPONSOR_TIER_COLORS: Record<string, { bg: string; text: string }> = {
  title:   { bg: "#FAEEDA", text: "#412402" },
  gold:    { bg: "#FFF8E7", text: "#633806" },
  silver:  { bg: "#F5F5F5", text: "#444441" },
  bronze:  { bg: "#FAECE7", text: "#712B13" },
  partner: { bg: "#EEEDFE", text: "#3C3489" },
};

// ── Helpers ────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateRange(start: string, end: string | null) {
  const s = new Date(start);
  if (!end) return formatDate(start);
  const e = new Date(end);
  if (s.toDateString() === e.toDateString()) return formatDate(start);
  const sStr = s.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const eStr = e.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${sStr} – ${eStr}`;
}

function publicFetch(path: string) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
}

// ── Section Header ─────────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
  return <Text style={s.secTitle}>{title}</Text>;
}

// ── Join Modal ─────────────────────────────────────────────────

type JoinRole = "attendee" | "speaker" | "sponsor";

function JoinModal({
  visible, event, onClose, onJoined,
  apiFetch, userId, registrationType,
}: {
  visible: boolean;
  event: EventDetail;
  onClose: () => void;
  onJoined: (status: "confirmed" | "pending") => void;
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
  userId: string;
  registrationType: "open" | "exclusive";
}) {
  const [step,    setStep]    = useState<"role" | "review">("role");
  const [role,    setRole]    = useState<JoinRole | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const reset = () => { setStep("role"); setRole(null); setMessage(""); setError(""); };

  const handleClose = () => { reset(); onClose(); };

  const handleRoleSelect = (r: JoinRole) => {
    setRole(r);
    if (r === "attendee") {
      // Attendees go straight to submit — no review step
      handleSubmit(r);
    } else {
      setStep("review");
    }
  };

  const handleSubmit = async (selectedRole?: JoinRole) => {
    const finalRole = selectedRole ?? role;
    if (!finalRole) return;

    setLoading(true);
    setError("");

    if (finalRole === "attendee") {
      const status = registrationType === "open" ? "confirmed" : "pending";
      const res = await apiFetch("/event_attendees", {
        method: "POST",
        body: JSON.stringify({ event_id: event.id, user_id: userId, status, message: null }),
      });
      setLoading(false);
      if (!res.ok) {
        const data = await res.json();
        setError(data[0]?.message ?? "Could not register. Please try again.");
        return;
      }
      reset();
      onJoined(status);
      return;
    }

    // Speaker or Sponsor — send via WhatsApp or registration URL
    // Insert as pending attendee with role message
    const res = await apiFetch("/event_attendees", {
      method: "POST",
      body: JSON.stringify({
        event_id: event.id,
        user_id: userId,
        status: "pending",
        message: `[${finalRole.toUpperCase()}] ${message.trim()}`,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data[0]?.message ?? "Could not submit. Please try again.");
      return;
    }

    // Also open WhatsApp if link available
    const waLink = event.whatsapp_link;
    if (waLink) {
      const text = encodeURIComponent(
        `Hi, I'd like to join PropTech Convention & Expo as a *${finalRole}*.\n\n${message}`
      );
      Linking.openURL(`${waLink}?text=${text}`);
    }

    reset();
    onJoined("pending");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Pressable style={ms.backdrop} onPress={handleClose}>
          <Pressable style={ms.sheet} onPress={() => {}}>
            <View style={ms.handle} />

            {/* Header */}
            <View style={ms.headerRow}>
              {step === "review" ? (
                <TouchableOpacity onPress={() => setStep("role")} style={ms.backBtn}>
                  <ArrowLeft size={16} color="#555" strokeWidth={2} />
                </TouchableOpacity>
              ) : <View style={{ width: 32 }} />}
              <Text style={ms.headerTitle}>
                {step === "role" ? "Join this Event" : `Join as ${role}`}
              </Text>
              <TouchableOpacity onPress={handleClose} style={ms.closeBtn}>
                <X size={16} color="#888" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {!!error && (
              <View style={ms.errBox}><Text style={ms.errTxt}>{error}</Text></View>
            )}

            {/* Step 1 — Role selection */}
            {step === "role" && (
              <View style={ms.roleGrid}>
                {([
                  { role: "attendee" as JoinRole, icon: "🎟️", title: "Attendee", desc: registrationType === "open" ? "Free · Instant confirmation" : "Request to attend · Pending approval" },
                  { role: "speaker"  as JoinRole, icon: "🎤", title: "Speaker",  desc: "Submit your topic for review" },
                  { role: "sponsor"  as JoinRole, icon: "🤝", title: "Sponsor",  desc: "Partner with us for this event" },
                ] as const).map(opt => (
                  <TouchableOpacity
                    key={opt.role}
                    onPress={() => handleRoleSelect(opt.role)}
                    style={ms.roleCard}
                    activeOpacity={0.85}
                    disabled={loading}
                  >
                    <Text style={ms.roleIcon}>{opt.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={ms.roleTitle}>{opt.title}</Text>
                      <Text style={ms.roleDesc}>{opt.desc}</Text>
                    </View>
                    {loading && opt.role === "attendee" ? (
                      <ActivityIndicator color="#312FB8" size="small" />
                    ) : (
                      <Text style={ms.roleArrow}>›</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Step 2 — Review (speaker/sponsor) */}
            {step === "review" && (
              <View>
                <Text style={ms.reviewLabel}>
                  {role === "speaker"
                    ? "Tell us about your topic or area of expertise"
                    : "Tell us about your company and sponsorship interest"}
                </Text>
                <TextInput
                  style={ms.reviewInput}
                  value={message}
                  onChangeText={setMessage}
                  placeholder={
                    role === "speaker"
                      ? "e.g. I'd like to speak on PropTech trends in GCC..."
                      : "e.g. We're interested in Gold sponsorship for brand visibility..."
                  }
                  placeholderTextColor="#bbb"
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
                <Text style={ms.reviewNote}>
                  {role === "speaker"
                    ? "Our team will review your submission and reach out within 48 hours."
                    : "Our team will contact you with sponsorship packages within 48 hours."}
                </Text>
                <TouchableOpacity
                  onPress={() => handleSubmit()}
                  disabled={loading || !message.trim()}
                  style={[ms.submitWrap, (!message.trim() || loading) && { opacity: 0.5 }]}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={["#312FB8", "#1B196A"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={ms.submitBtn}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={ms.submitTxt}>Submit Request →</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────

export default function EventDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user, apiFetch, isAuthenticated } = useAuth();

  const [event,      setEvent]      = useState<EventDetail | null>(null);
  const [speakers,   setSpeakers]   = useState<Speaker[]>([]);
  const [sponsors,   setSponsors]   = useState<Sponsor[]>([]);
  const [agenda,     setAgenda]     = useState<AgendaItem[]>([]);
  const [attendees,  setAttendees]  = useState<Attendee[]>([]);
  const [attCount,   setAttCount]   = useState(0);
  const [userStatus, setUserStatus] = useState<"confirmed" | "pending" | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [showJoin,   setShowJoin]   = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [evRes, spkRes, spsRes, agRes, attRes] = await Promise.all([
        publicFetch(`/events?id=eq.${id}&select=*`),
        publicFetch(`/event_speakers?event_id=eq.${id}&select=*&order=is_keynote.desc,sort_order.asc`),
        publicFetch(`/event_sponsors?event_id=eq.${id}&select=*&order=sort_order.asc`),
        publicFetch(`/event_agenda?event_id=eq.${id}&select=*&order=day_number.asc,sort_order.asc`),
        publicFetch(`/event_attendees?event_id=eq.${id}&status=eq.confirmed&select=id,user_id,status,profiles!user_id(full_name,role)&limit=20`),
      ]);

      if (evRes.ok)  { const d = await evRes.json();  if (d[0]) setEvent(d[0]); }
      if (spkRes.ok) setSpeakers(await spkRes.json());
      if (spsRes.ok) setSponsors(await spsRes.json());
      if (agRes.ok)  setAgenda(await agRes.json());
      if (attRes.ok) {
        const d = await attRes.json();
        setAttendees(d);
      }

      // Get total count
      const cRes = await fetch(
        `${SUPABASE_URL}/rest/v1/event_attendees?event_id=eq.${id}&status=eq.confirmed`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Prefer: "count=exact" } }
      );
      setAttCount(parseInt(cRes.headers.get("content-range")?.split("/")[1] ?? "0"));

      // User status
      if (isAuthenticated && user) {
        const uRes = await apiFetch(`/event_attendees?event_id=eq.${id}&user_id=eq.${user.id}&select=status`);
        if (uRes.ok) {
          const d = await uRes.json();
          setUserStatus(d[0]?.status ?? null);
        }
      }
    } catch (e) {
      console.warn("[EventDetail] load error", e);
    } finally {
      setLoading(false);
    }
  }, [id, user, isAuthenticated]);

  useEffect(() => { load(); }, [load]);

  const handleCancelRSVP = () => {
    Alert.alert("Cancel RSVP", "Are you sure you want to cancel your registration?", [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel RSVP", style: "destructive",
        onPress: async () => {
          await apiFetch(`/event_attendees?event_id=eq.${id}&user_id=eq.${user!.id}`, { method: "DELETE" });
          setUserStatus(null);
          setAttCount(c => Math.max(0, c - 1));
        },
      },
    ]);
  };

  const handleJoined = (status: "confirmed" | "pending") => {
    setUserStatus(status);
    if (status === "confirmed") setAttCount(c => c + 1);
    setShowJoin(false);
    Alert.alert(
      status === "confirmed" ? "You're registered! 🎉" : "Request submitted!",
      status === "confirmed"
        ? "You have been added to the attendees list."
        : "Our team will review your request and get back to you soon."
    );
  };

  if (loading) {
    return (
      <View style={[s.container, { paddingTop: insets.top, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#312FB8" size="large" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[s.container, { paddingTop: insets.top, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: "#aaa" }}>Event not found.</Text>
      </View>
    );
  }

  // Group agenda by day
  const agendaDays = Array.from(new Set(agenda.map(a => a.day_number))).sort();

  // Group sponsors by tier
  const sponsorsByTier = SPONSOR_TIER_ORDER.reduce((acc, tier) => {
    const items = sponsors.filter(sp => sp.tier === tier);
    if (items.length > 0) acc[tier] = items;
    return acc;
  }, {} as Record<string, Sponsor[]>);

  const isPast = event.is_past;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Back header */}
      <View style={s.backHdr}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <ArrowLeft size={18} color="#312FB8" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={s.backTitle} numberOfLines={1}>{event.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Hero ── */}
        <LinearGradient
          colors={isPast ? ["#2C2C2A", "#444441"] : ["#1B196A", "#312FB8"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroBadges}>
            <View style={s.typePill}>
              <Text style={s.typePillTxt}>{event.event_type.toUpperCase()}</Text>
            </View>
            {isPast ? (
              <View style={s.pastPill}>
                <Text style={s.pastPillTxt}>POST EVENT</Text>
              </View>
            ) : (
              <View style={[s.regPill, event.registration_type === "exclusive" && s.regPillExcl]}>
                <Text style={s.regPillTxt}>{event.registration_type === "open" ? "OPEN" : "EXCLUSIVE"}</Text>
              </View>
            )}
          </View>
          <Text style={s.heroTitle}>{event.title}</Text>
          <Text style={s.heroMeta}>
            📅 {formatDateRange(event.event_date, event.end_date)}
            {event.venue ? `\n📍 ${event.venue}` : event.location ? `\n📍 ${event.location}` : ""}
          </Text>
        </LinearGradient>

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          {[
            { num: attCount, label: isPast ? "Attended" : "Attending" },
            { num: speakers.length, label: "Speakers" },
            { num: sponsors.length, label: "Sponsors" },
            { num: agendaDays.length, label: agendaDays.length === 1 ? "Day" : "Days" },
          ].map(stat => (
            <View key={stat.label} style={s.statCard}>
              <Text style={s.statNum}>{stat.num}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Report download (past events) ── */}
        {isPast && event.report_url && (
          <TouchableOpacity
            onPress={() => Linking.openURL(event.report_url!)}
            style={s.reportBar}
            activeOpacity={0.85}
          >
            <View>
              <Text style={s.reportBarTitle}>Post-Event Report Available</Text>
              <Text style={s.reportBarSub}>Download the full event report & insights</Text>
            </View>
            <View style={s.reportBarBtn}>
              <Download size={14} color="#412402" strokeWidth={2.2} />
              <Text style={s.reportBarBtnTxt}>Download</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Registration CTA (upcoming events) ── */}
        {!isPast && (
          <View style={s.ctaWrap}>
            {userStatus === "confirmed" ? (
              <View style={s.ctaRow}>
                <View style={s.attendingCard}>
                  <Check size={16} color="#085041" strokeWidth={2.5} />
                  <Text style={s.attendingTxt}>You're registered!</Text>
                </View>
                <TouchableOpacity onPress={handleCancelRSVP} style={s.cancelCard} activeOpacity={0.85}>
                  <Text style={s.cancelTxt}>Cancel RSVP</Text>
                </TouchableOpacity>
              </View>
            ) : userStatus === "pending" ? (
              <View style={s.pendingCard}>
                <Clock3 size={16} color="#633806" strokeWidth={2} />
                <Text style={s.pendingTxt}>Request pending review</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  if (!isAuthenticated) { router.push("/auth/sign-in" as any); return; }
                  setShowJoin(true);
                }}
                style={s.joinBtn}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#312FB8", "#1B196A"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={s.joinBtnGrad}
                >
                  <Text style={s.joinBtnTxt}>
                    {event.registration_type === "open" ? "Join this Event →" : "Request to Join →"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── About ── */}
        {event.description && (
          <View style={s.section}>
            <SectionTitle title="About" />
            <View style={s.descCard}>
              <Text style={s.descText}>{event.description}</Text>
            </View>
          </View>
        )}

        {/* ── Agenda ── */}
        {agenda.length > 0 && (
          <View style={s.section}>
            <SectionTitle title="Agenda" />
            {agendaDays.map(day => {
              const items = agenda.filter(a => a.day_number === day);
              const label = items[0]?.day_label ?? `Day ${day} — ${formatDate(
                new Date(new Date(event.event_date).getTime() + (day - 1) * 86400000).toISOString()
              )}`;
              return (
                <View key={day} style={{ marginBottom: 12 }}>
                  <View style={s.dayLabel}>
                    <Text style={s.dayLabelTxt}>{label}</Text>
                  </View>
                  {items.map(item => (
                    <View key={item.id} style={s.agendaRow}>
                      <Text style={s.agendaTime}>{item.start_time}</Text>
                      <View style={s.agendaCard}>
                        <Text style={s.agendaTitle}>{item.title}</Text>
                        {item.speaker_name && (
                          <Text style={s.agendaSpeaker}>{item.speaker_name}</Text>
                        )}
                        {item.description && (
                          <Text style={s.agendaDesc}>{item.description}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {/* ── Speakers ── */}
        {speakers.length > 0 && (
          <View style={s.section}>
            <SectionTitle title={`Speakers (${speakers.length})`} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.speakerScroll}>
              {speakers.map(sp => {
                const color = "#312FB8";
                return (
                  <TouchableOpacity
                    key={sp.id}
                    onPress={() => sp.user_id ? router.push(`/members/${sp.user_id}` as any) : null}
                    activeOpacity={sp.user_id ? 0.85 : 1}
                    style={s.speakerCard}
                  >
                    {sp.is_keynote && (
                      <View style={s.keynoteBadge}>
                        <Text style={s.keynoteTxt}>KEYNOTE</Text>
                      </View>
                    )}
                    <View style={[s.speakerAv, { backgroundColor: sp.is_keynote ? "#854F0B" : color }]}>
                      <Text style={s.speakerAvTxt}>{initials(sp.name)}</Text>
                    </View>
                    <Text style={s.speakerName} numberOfLines={2}>{sp.name}</Text>
                    {sp.company && <Text style={s.speakerCompany} numberOfLines={1}>{sp.company}</Text>}
                    {sp.topic && <Text style={s.speakerTopic} numberOfLines={2}>{sp.topic}</Text>}
                    {sp.user_id && (
                      <Text style={s.speakerProfile}>View profile →</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Sponsors ── */}
        {sponsors.length > 0 && (
          <View style={s.section}>
            <SectionTitle title={`Sponsors (${sponsors.length})`} />
            {Object.entries(sponsorsByTier).map(([tier, items]) => {
              const colors = SPONSOR_TIER_COLORS[tier] ?? { bg: "#EEEDFE", text: "#3C3489" };
              return (
                <View key={tier} style={s.sponsorTier}>
                  <Text style={s.sponsorTierLabel}>{tier.toUpperCase()} SPONSOR{items.length > 1 ? "S" : ""}</Text>
                  <View style={s.sponsorRow}>
                    {items.map(sp => (
                      <TouchableOpacity
                        key={sp.id}
                        onPress={() => sp.website_url ? Linking.openURL(sp.website_url) : null}
                        activeOpacity={sp.website_url ? 0.85 : 1}
                        style={[s.sponsorChip, { backgroundColor: colors.bg }]}
                      >
                        <Text style={[s.sponsorChipTxt, { color: colors.text }]}>{sp.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Attendees ── */}
        {attCount > 0 && (
          <View style={s.section}>
            <SectionTitle title={`Attendees (${attCount})`} />
            <View style={s.attendeesCard}>
              <View style={s.attAvatarRow}>
                {attendees.slice(0, 6).map((a, i) => {
                  const color = ROLE_COLORS[a.profiles?.role ?? "real_estate_developer"] ?? "#312FB8";
                  return (
                    <View
                      key={a.id}
                      style={[s.attAvatar, { backgroundColor: color, marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i }]}
                    >
                      <Text style={s.attAvatarTxt}>
                        {a.profiles ? initials(a.profiles.full_name) : "?"}
                      </Text>
                    </View>
                  );
                })}
                {attCount > 6 && (
                  <View style={[s.attAvatar, { backgroundColor: "#888", marginLeft: -8 }]}>
                    <Text style={s.attAvatarTxt}>+{attCount - 6}</Text>
                  </View>
                )}
              </View>
              <Text style={s.attNames}>
                {attendees.slice(0, 3).map(a => a.profiles?.full_name?.split(" ")[0]).filter(Boolean).join(", ")}
                {attCount > 3 ? ` and ${attCount - 3} others are attending` : " are attending"}
              </Text>
            </View>
          </View>
        )}

        {/* ── Speak / Sponsor CTA ── */}
        {!isPast && !userStatus && (
          <View style={s.section}>
            <SectionTitle title="Get Involved" />
            <View style={s.involvedRow}>
              <TouchableOpacity
                onPress={() => {
                  if (!isAuthenticated) { router.push("/auth/sign-in" as any); return; }
                  setShowJoin(true);
                }}
                style={s.involvedCard}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 24, marginBottom: 6 }}>🎤</Text>
                <Text style={s.involvedTitle}>Speak</Text>
                <Text style={s.involvedDesc}>Share your expertise with the community</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!isAuthenticated) { router.push("/auth/sign-in" as any); return; }
                  setShowJoin(true);
                }}
                style={[s.involvedCard, { backgroundColor: "#FAEEDA" }]}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 24, marginBottom: 6 }}>🤝</Text>
                <Text style={[s.involvedTitle, { color: "#633806" }]}>Sponsor</Text>
                <Text style={[s.involvedDesc, { color: "#854F0B" }]}>Partner with us for visibility</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Join Modal */}
      {isAuthenticated && user && !isPast && (
        <JoinModal
          visible={showJoin}
          event={event}
          onClose={() => setShowJoin(false)}
          onJoined={handleJoined}
          apiFetch={apiFetch}
          userId={user.id}
          registrationType={event.registration_type}
        />
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: "#F8F8FC" },
  backHdr:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "rgba(49,47,184,0.08)" },
  backBtn:          { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(49,47,184,0.08)", alignItems: "center", justifyContent: "center" },
  backTitle:        { fontSize: 15, fontWeight: "800", color: "#1A1A2E", flex: 1, textAlign: "center" },
  hero:             { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },
  heroBadges:       { flexDirection: "row", gap: 8, marginBottom: 12 },
  typePill:         { backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typePillTxt:      { color: "#FFF", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  pastPill:         { backgroundColor: "#EF9F27", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pastPillTxt:      { color: "#412402", fontSize: 10, fontWeight: "700" },
  regPill:          { backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  regPillExcl:      { backgroundColor: "rgba(212,83,126,0.25)", borderColor: "rgba(212,83,126,0.4)" },
  regPillTxt:       { color: "#FFF", fontSize: 10, fontWeight: "700" },
  heroTitle:        { color: "#FFF", fontSize: 20, fontWeight: "900", lineHeight: 26, marginBottom: 8 },
  heroMeta:         { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "500", lineHeight: 20 },
  statsRow:         { flexDirection: "row", gap: 8, padding: 14 },
  statCard:         { flex: 1, backgroundColor: "#EEEDFE", borderRadius: 12, padding: 10, alignItems: "center" },
  statNum:          { fontSize: 20, fontWeight: "900", color: "#3C3489" },
  statLabel:        { fontSize: 9, fontWeight: "700", color: "#534AB7", marginTop: 2 },
  reportBar:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginBottom: 12, backgroundColor: "#FAEEDA", borderRadius: 14, padding: 14 },
  reportBarTitle:   { fontSize: 13, fontWeight: "800", color: "#412402", marginBottom: 2 },
  reportBarSub:     { fontSize: 11, color: "#854F0B" },
  reportBarBtn:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EF9F27", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  reportBarBtnTxt:  { fontSize: 12, fontWeight: "700", color: "#412402" },
  ctaWrap:          { paddingHorizontal: 16, marginBottom: 8 },
  ctaRow:           { flexDirection: "row", gap: 10 },
  joinBtn:          { borderRadius: 14, overflow: "hidden" },
  joinBtnGrad:      { paddingVertical: 14, alignItems: "center" },
  joinBtnTxt:       { color: "#FFF", fontSize: 16, fontWeight: "800" },
  attendingCard:    { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#E1F5EE", borderRadius: 14, paddingVertical: 14 },
  attendingTxt:     { color: "#085041", fontSize: 14, fontWeight: "800" },
  cancelCard:       { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF", borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(220,38,38,0.2)", paddingVertical: 14 },
  cancelTxt:        { color: "#DC2626", fontSize: 12, fontWeight: "700" },
  pendingCard:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FAEEDA", borderRadius: 14, paddingVertical: 14 },
  pendingTxt:       { color: "#633806", fontSize: 14, fontWeight: "700" },
  section:          { paddingHorizontal: 16, marginTop: 20 },
  secTitle:         { fontSize: 15, fontWeight: "800", color: "#1A1A2E", marginBottom: 12 },
  descCard:         { backgroundColor: "#FFF", borderRadius: 14, borderWidth: 0.5, borderColor: "rgba(49,47,184,0.08)", padding: 14 },
  descText:         { fontSize: 13, color: "#555", lineHeight: 20 },
  dayLabel:         { backgroundColor: "#EEEDFE", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, alignSelf: "flex-start", marginBottom: 8 },
  dayLabelTxt:      { fontSize: 11, fontWeight: "700", color: "#3C3489" },
  agendaRow:        { flexDirection: "row", gap: 10, marginBottom: 8 },
  agendaTime:       { fontSize: 11, fontWeight: "700", color: "#312FB8", minWidth: 56, paddingTop: 10 },
  agendaCard:       { flex: 1, backgroundColor: "#FFF", borderRadius: 12, borderWidth: 0.5, borderColor: "rgba(49,47,184,0.08)", padding: 10 },
  agendaTitle:      { fontSize: 13, fontWeight: "700", color: "#1A1A2E", marginBottom: 3 },
  agendaSpeaker:    { fontSize: 11, color: "#312FB8", fontWeight: "600" },
  agendaDesc:       { fontSize: 11, color: "#888", marginTop: 3, lineHeight: 16 },
  speakerScroll:    { gap: 10, paddingBottom: 4 },
  speakerCard:      { width: 110, backgroundColor: "#FFF", borderRadius: 14, borderWidth: 0.5, borderColor: "rgba(49,47,184,0.08)", padding: 12, alignItems: "center" },
  keynoteBadge:     { backgroundColor: "#FAEEDA", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 6 },
  keynoteTxt:       { fontSize: 8, fontWeight: "700", color: "#633806" },
  speakerAv:        { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  speakerAvTxt:     { color: "#FFF", fontSize: 14, fontWeight: "800" },
  speakerName:      { fontSize: 11, fontWeight: "700", color: "#1A1A2E", textAlign: "center", marginBottom: 2 },
  speakerCompany:   { fontSize: 10, color: "#888", textAlign: "center", marginBottom: 3 },
  speakerTopic:     { fontSize: 10, color: "#312FB8", textAlign: "center", lineHeight: 14 },
  speakerProfile:   { fontSize: 9, color: "#312FB8", fontWeight: "700", marginTop: 6 },
  sponsorTier:      { marginBottom: 12 },
  sponsorTierLabel: { fontSize: 10, fontWeight: "700", color: "#AAA", letterSpacing: 1, marginBottom: 6 },
  sponsorRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sponsorChip:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  sponsorChipTxt:   { fontSize: 13, fontWeight: "700" },
  attendeesCard:    { backgroundColor: "#FFF", borderRadius: 14, borderWidth: 0.5, borderColor: "rgba(49,47,184,0.08)", padding: 14 },
  attAvatarRow:     { flexDirection: "row", marginBottom: 10 },
  attAvatar:        { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFF" },
  attAvatarTxt:     { color: "#FFF", fontSize: 10, fontWeight: "700" },
  attNames:         { fontSize: 12, color: "#555", lineHeight: 18 },
  involvedRow:      { flexDirection: "row", gap: 10 },
  involvedCard:     { flex: 1, backgroundColor: "#EEEDFE", borderRadius: 14, padding: 16, alignItems: "center" },
  involvedTitle:    { fontSize: 14, fontWeight: "800", color: "#3C3489", marginBottom: 4 },
  involvedDesc:     { fontSize: 11, color: "#534AB7", textAlign: "center", lineHeight: 15 },
});

// ── Modal styles ───────────────────────────────────────────────

const ms = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: "rgba(10,12,24,0.55)", justifyContent: "flex-end" },
  sheet:        { backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  handle:       { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E0E0E0", alignSelf: "center", marginBottom: 20 },
  headerRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn:      { width: 32, height: 32, borderRadius: 10, backgroundColor: "#F5F5F8", alignItems: "center", justifyContent: "center" },
  headerTitle:  { fontSize: 17, fontWeight: "800", color: "#1A1A2E", textTransform: "capitalize" },
  closeBtn:     { width: 32, height: 32, borderRadius: 10, backgroundColor: "#F5F5F8", alignItems: "center", justifyContent: "center" },
  errBox:       { backgroundColor: "rgba(220,38,38,0.08)", borderWidth: 1, borderColor: "rgba(220,38,38,0.2)", borderRadius: 10, padding: 12, marginBottom: 16 },
  errTxt:       { color: "#DC2626", fontSize: 13, fontWeight: "500" },
  roleGrid:     { gap: 10 },
  roleCard:     { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#F8F8FC", borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(49,47,184,0.1)", padding: 14 },
  roleIcon:     { fontSize: 26 },
  roleTitle:    { fontSize: 15, fontWeight: "800", color: "#1A1A2E", marginBottom: 2 },
  roleDesc:     { fontSize: 12, color: "#888", lineHeight: 16 },
  roleArrow:    { fontSize: 22, color: "#CCC" },
  reviewLabel:  { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 10 },
  reviewInput:  { height: 120, borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(49,47,184,0.15)", paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#1A1A2E", backgroundColor: "#FAFAFE", marginBottom: 12 },
  reviewNote:   { fontSize: 12, color: "#AAA", lineHeight: 18, marginBottom: 20 },
  submitWrap:   { borderRadius: 14, overflow: "hidden" },
  submitBtn:    { paddingVertical: 14, alignItems: "center" },
  submitTxt:    { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
