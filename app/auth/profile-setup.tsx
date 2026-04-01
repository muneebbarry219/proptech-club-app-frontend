import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth, type UserRole, type UserLocation } from "../../context/AuthContext";

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: "developer", label: "Developer", desc: "I build real estate projects" },
  { value: "investor",  label: "Investor",  desc: "I fund & invest in projects" },
  { value: "broker",    label: "Broker",    desc: "I connect buyers & sellers" },
  { value: "architect", label: "Architect", desc: "I design buildings & spaces" },
  { value: "tech",      label: "Tech",      desc: "I build PropTech solutions" },
];

const LOCATIONS: { value: UserLocation; label: string }[] = [
  { value: "karachi",   label: "Karachi" },
  { value: "lahore",    label: "Lahore" },
  { value: "islamabad", label: "Islamabad" },
  { value: "uae",       label: "UAE" },
  { value: "ksa",       label: "KSA" },
  { value: "other",     label: "Other" },
];

const LOOKING_FOR = [
  "Investment", "Sales", "Partnerships", "Tech Solutions", "Land", "Buyers", "Investors",
];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ fullName?: string; company?: string; whatsapp?: string }>();
  const insets = useSafeAreaInsets();
  const { createProfile } = useAuth();

  const [step, setStep]               = useState<1 | 2>(1);
  const [fullName, setFullName]       = useState("");
  const [company, setCompany]         = useState("");
  const [role, setRole]               = useState<UserRole | null>(null);
  const [currentFocus, setFocus]      = useState("");
  const [lookingFor, setLookingFor]   = useState<string[]>([]);
  const [location, setLocation]       = useState<UserLocation>("karachi");
  const [whatsapp, setWhatsapp]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    if (typeof params.fullName === "string" && params.fullName.trim()) {
      setFullName((current) => current || params.fullName!.trim());
    }
    if (typeof params.company === "string" && params.company.trim()) {
      setCompany((current) => current || params.company!.trim());
    }
    if (typeof params.whatsapp === "string" && params.whatsapp.trim()) {
      setWhatsapp((current) => current || params.whatsapp!.trim());
    }
  }, [params.company, params.fullName, params.whatsapp]);

  const toggleLookingFor = (item: string) => {
    setLookingFor(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const handleNext = () => {
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (!role) { setError("Please select your role."); return; }
    setError(""); setStep(2);
  };

  const handleSubmit = async () => {
    if (!currentFocus.trim()) { setError("Please describe your current focus."); return; }
    if (lookingFor.length === 0) { setError("Please select at least one option."); return; }
    if (!role) return;
    setLoading(true); setError("");
    const result = await createProfile({
      full_name: fullName.trim(),
      company: company.trim() || null,
      role,
      current_focus: currentFocus.trim(),
      looking_for: lookingFor,
      location,
      whatsapp: whatsapp.trim() || null,
      bio: null,
      avatar_url: null,
    });
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    router.replace("/home");
  };

  return (
    <LinearGradient colors={["#0f0e7a", "#1a18a0", "#312FB8"]} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.stepLabel}>Step {step} of 2</Text>
            <View style={styles.progressRow}>
              <View style={[styles.progressBar, { flex: 1, backgroundColor: "#fff" }]} />
              <View style={[styles.progressBar, { flex: 1, backgroundColor: step === 2 ? "#fff" : "rgba(255,255,255,0.25)" }]} />
            </View>
            <Text style={styles.title}>{step === 1 ? "Tell us who you are" : "What are you looking for?"}</Text>
            <Text style={styles.subtitle}>{step === 1 ? "This helps us connect you with the right people" : "We'll personalise your experience"}</Text>
          </View>

          <View style={styles.card}>
            {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

            {step === 1 && (
              <>
                <Text style={styles.label}>FULL NAME *</Text>
                <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your full name" placeholderTextColor="#aaa" />

                <Text style={[styles.label, { marginTop: 14 }]}>COMPANY / ORGANISATION</Text>
                <TextInput style={styles.input} value={company} onChangeText={setCompany} placeholder="Where do you work?" placeholderTextColor="#aaa" />

                <Text style={[styles.label, { marginTop: 14 }]}>YOUR ROLE *</Text>
                <View style={styles.rolesGrid}>
                  {ROLES.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      onPress={() => setRole(r.value)}
                      activeOpacity={0.85}
                      style={[styles.roleCard, role === r.value && styles.roleCardActive]}
                    >
                      <Text style={[styles.roleLabel, role === r.value && styles.roleLabelActive]}>{r.label}</Text>
                      <Text style={[styles.roleDesc, role === r.value && styles.roleDescActive]}>{r.desc}</Text>
                      {role === r.value && <View style={styles.roleCheck}><Text style={{ color: "#fff", fontSize: 10 }}>✓</Text></View>}
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { marginTop: 14 }]}>LOCATION</Text>
                <View style={styles.locationRow}>
                  {LOCATIONS.map((l) => (
                    <TouchableOpacity
                      key={l.value}
                      onPress={() => setLocation(l.value)}
                      style={[styles.locationChip, location === l.value && styles.locationChipActive]}
                    >
                      <Text style={[styles.locationText, location === l.value && styles.locationTextActive]}>{l.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={styles.submitWrap}>
                  <LinearGradient colors={["#312FB8", "#1B196A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitBtn}>
                    <Text style={styles.submitText}>Continue →</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {step === 2 && (
              <>
                <Text style={styles.label}>CURRENT FOCUS *</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: "top", paddingTop: 12 }]}
                  value={currentFocus} onChangeText={setFocus}
                  placeholder={`e.g. "Selling luxury apartments in DHA"`}
                  placeholderTextColor="#aaa" multiline
                />

                <Text style={[styles.label, { marginTop: 14 }]}>WHAT ARE YOU LOOKING FOR? *</Text>
                <Text style={styles.selectHint}>Select all that apply</Text>
                <View style={styles.tagsWrap}>
                  {LOOKING_FOR.map((item) => (
                    <TouchableOpacity
                      key={item}
                      onPress={() => toggleLookingFor(item)}
                      style={[styles.tag, lookingFor.includes(item) && styles.tagActive]}
                    >
                      <Text style={[styles.tagText, lookingFor.includes(item) && styles.tagTextActive]}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { marginTop: 14 }]}>WHATSAPP NUMBER</Text>
                <TextInput style={styles.input} value={whatsapp} onChangeText={setWhatsapp} placeholder="+92 300 1234567" placeholderTextColor="#aaa" keyboardType="phone-pad" />

                <View style={styles.btnRow}>
                  <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                    <Text style={styles.backBtnText}>← Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.85} style={[styles.submitWrap, { flex: 1 }]}>
                    <LinearGradient colors={["#312FB8", "#1B196A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitBtn}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Enter Ecosystem →</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  stepLabel: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "600", letterSpacing: 1, marginBottom: 8 },
  progressRow: { flexDirection: "row", gap: 6, marginBottom: 20 },
  progressBar: { height: 3, borderRadius: 2 },
  title: { color: "#fff", fontSize: 24, fontWeight: "900", marginBottom: 6 },
  subtitle: { color: "rgba(255,255,255,0.6)", fontSize: 14 },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 22, shadowColor: "#000", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 12 },
  errorBox: { backgroundColor: "rgba(220,38,38,0.08)", borderWidth: 1, borderColor: "rgba(220,38,38,0.2)", borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: "#dc2626", fontSize: 13, fontWeight: "500" },
  label: { fontSize: 11, fontWeight: "700", color: "#555", letterSpacing: 0.5, marginBottom: 6 },
  input: { borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(49,47,184,0.15)", paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: "#1a1a2e", backgroundColor: "#fafafe" },
  rolesGrid: { gap: 8 },
  roleCard: { padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(49,47,184,0.12)", backgroundColor: "#fafafe", position: "relative" },
  roleCardActive: { borderColor: "#312FB8", backgroundColor: "rgba(49,47,184,0.04)" },
  roleLabel: { fontSize: 15, fontWeight: "700", color: "#1a1a2e", marginBottom: 2 },
  roleLabelActive: { color: "#312FB8" },
  roleDesc: { fontSize: 12, color: "#888" },
  roleDescActive: { color: "#6664c8" },
  roleCheck: { position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: "#312FB8", alignItems: "center", justifyContent: "center" },
  locationRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  locationChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(49,47,184,0.15)", backgroundColor: "#fafafe" },
  locationChipActive: { backgroundColor: "#312FB8", borderColor: "#312FB8" },
  locationText: { fontSize: 13, fontWeight: "600", color: "#555" },
  locationTextActive: { color: "#fff" },
  selectHint: { fontSize: 11, color: "#aaa", marginBottom: 10, marginTop: -4 },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(49,47,184,0.15)", backgroundColor: "#fafafe" },
  tagActive: { backgroundColor: "#312FB8", borderColor: "#312FB8" },
  tagText: { fontSize: 13, fontWeight: "600", color: "#555" },
  tagTextActive: { color: "#fff" },
  submitWrap: { marginTop: 22, borderRadius: 14, overflow: "hidden" },
  submitBtn: { height: 52, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 22 },
  backBtn: { height: 52, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1.5, borderColor: "rgba(49,47,184,0.2)", alignItems: "center", justifyContent: "center" },
  backBtnText: { fontSize: 14, fontWeight: "600", color: "#312FB8" },
});
