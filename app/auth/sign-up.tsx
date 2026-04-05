import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Eye, EyeOff } from "lucide-react-native";
import DiscardSignupModal from "../../components/modals/DiscardSignupModal";
import { setPendingSignupDraft } from "../../utils/pending-signup";


const COUNTRY_CODES = [
  { flag: "🇵🇰", code: "+92", label: "PK" },
  { flag: "🇸🇦", code: "+966", label: "SA" },
  { flag: "🇦🇪", code: "+971", label: "AE" },
  { flag: "🇬🇧", code: "+44", label: "UK" },
  { flag: "🇺🇸", code: "+1", label: "USA" },
];

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+92");
  const [phone, setPhone] = useState("");
  const [showCodes, setShowCodes] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [pendingLeaveTarget, setPendingLeaveTarget] = useState<(() => void) | null>(null);

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) ?? COUNTRY_CODES[0];
  const fullPhone = `${countryCode} ${phone.trim()}`;
  const phoneDigits = phone.replace(/\D/g, "");
  const emailTrimmed = email.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);
  const isFormValid =
    !!fullName.trim() &&
    !!phone.trim() &&
    phoneDigits.length >= 7 &&
    !!emailTrimmed &&
    isEmailValid &&
    password.length >= 6 &&
    !!confirmPassword &&
    password === confirmPassword;

  const validate = () => {
    if (!fullName.trim()) return "Please enter your full name.";
    if (!phone.trim()) return "Please enter your phone number.";
    if (phoneDigits.length < 7) return "Enter a valid phone number.";
    if (!emailTrimmed) return "Please enter your email address.";
    if (!isEmailValid) return "Enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (!confirmPassword) return "Please confirm your password.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return "";
  };

  const hasDraft =
    !!fullName.trim() ||
    !!phone.trim() ||
    !!emailTrimmed ||
    !!password ||
    !!confirmPassword;

  const handleLeaveAttempt = (next: () => void) => {
    if (!hasDraft || loading) {
      next();
      return;
    }

    setPendingLeaveTarget(() => next);
    setShowDiscardModal(true);
  };

  const handleDiscardDetails = () => {
    setShowDiscardModal(false);
    const next = pendingLeaveTarget;
    setPendingLeaveTarget(null);
    next?.();
  };

  const handleCreateAccount = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError("");
    try {
      await setPendingSignupDraft({
        fullName: fullName.trim(),
        whatsapp: fullPhone,
        email: email.trim().toLowerCase(),
        password,
      });

      router.replace({
        pathname: "/auth/profile",
        params: { mode: "complete-signup" },
      });
    } catch (draftError) {
      console.error("[SignUpScreen] Failed to store signup draft:", draftError);
      setError("Could not continue signup right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#0f0e7a", "#1a18a0", "#312FB8"]}
      start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => handleLeaveAttempt(() => router.back())} style={s.back}>
            <ArrowLeft size={18} color="#fff" strokeWidth={2.4} />
          </TouchableOpacity>

          {/* Header */}
          <View style={s.header}>
            <View style={s.logoMark}>
              <Image source={require("../../assets/proptech logo colored.png")} style={s.logoImg} resizeMode="contain" />
            </View>
            <Text style={s.title}>Join PropTech Club</Text>
            <Text style={s.subtitle}>Create your account to enter the ecosystem</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            {!!error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* Full Name */}
            <Text style={s.label}>FULL NAME</Text>
            <TextInput
              style={s.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor="#aaa"
              autoCapitalize="words"
            />

            {/* Phone */}
            <Text style={[s.label, s.mt]}>PHONE / WHATSAPP</Text>
            <View style={s.phoneRow}>
              {/* Country code picker */}
              <View style={s.codeWrap}>
                <TouchableOpacity
                  onPress={() => setShowCodes(v => !v)}
                  style={s.codePicker}
                  activeOpacity={0.8}
                >
                  <Text style={s.codeFlag}>{selectedCountry.flag}</Text>
                  <Text style={s.codeText}>{selectedCountry.code}</Text>
                </TouchableOpacity>
                {showCodes && (
                  <View style={s.codeDropdown}>
                    {COUNTRY_CODES.map(c => (
                      <TouchableOpacity
                        key={c.code}
                        onPress={() => { setCountryCode(c.code); setShowCodes(false); }}
                        style={[s.codeOption, c.code === countryCode && s.codeOptionActive]}
                      >
                        <Text style={s.codeFlag}>{c.flag}</Text>
                        <Text style={s.codeText}>{c.code}</Text>
                        <Text style={s.codeLabel}>{c.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={phone}
                onChangeText={t => setPhone(t.replace(/[^\d\s\-()]/g, ""))}
                placeholder="300 1234567"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
              />
            </View>

            {/* Email */}
            <Text style={[s.label, s.mt]}>EMAIL ADDRESS</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Password */}
            <Text style={[s.label, s.mt]}>PASSWORD</Text>
            <View style={{ position: "relative" }}>
              <TextInput
                style={[s.input, { paddingRight: 50 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 6 characters"
                placeholderTextColor="#aaa"
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleCreateAccount}
              />
              <TouchableOpacity
                onPress={() => setShowPass(v => !v)}
                style={s.eyeBtn}
              >
                {showPass
                  ? <EyeOff size={18} color="#7b8194" strokeWidth={2} />
                  : <Eye size={18} color="#7b8194" strokeWidth={2} />
                }
              </TouchableOpacity>
            </View>
            <Text style={[s.label, s.mt]}>CONFIRM PASSWORD</Text>
            <TextInput
              style={s.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your password"
              placeholderTextColor="#aaa"
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleCreateAccount}
            />
            {!!confirmPassword && password !== confirmPassword && (
              <Text style={s.helperError}>Passwords do not match.</Text>
            )}

            {/* Submit */}
            <TouchableOpacity
              onPress={handleCreateAccount}
              disabled={loading || !isFormValid}
              activeOpacity={0.85}
              style={[s.submitWrap, (loading || !isFormValid) && s.submitWrapDisabled]}
            >
              <LinearGradient
                colors={(loading || !isFormValid) ? ["#9AA0B7", "#8389A3"] : ["#312FB8", "#1B196A"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.submitBtn}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.submitText}>Continue</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => handleLeaveAttempt(() => router.push("/auth/sign-in" as any))}>
              <Text style={s.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <DiscardSignupModal
        visible={showDiscardModal}
        onStay={() => {
          setShowDiscardModal(false);
          setPendingLeaveTarget(null);
        }}
        onDiscard={handleDiscardDetails}
      />
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 28 },
  header: { alignItems: "center", marginBottom: 28 },
  logoMark: { width: 72, height: 72, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
  logoImg: { width: 58, height: 58 },
  title: { color: "#fff", fontSize: 26, fontWeight: "900", marginBottom: 6, textAlign: "center" },
  subtitle: { color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: "500", textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 12 },
  errorBox: { backgroundColor: "rgba(220,38,38,0.08)", borderWidth: 1, borderColor: "rgba(220,38,38,0.2)", borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { color: "#dc2626", fontSize: 13, fontWeight: "500" },
  label: { fontSize: 11, fontWeight: "700", color: "#555", letterSpacing: 0.5, marginBottom: 6 },
  mt: { marginTop: 14 },
  input: { height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(49,47,184,0.15)", paddingHorizontal: 16, fontSize: 15, color: "#1a1a2e", backgroundColor: "#fafafe" },
  phoneRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  codeWrap: { zIndex: 10 },
  codePicker: { flexDirection: "row", alignItems: "center", gap: 6, height: 52, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(49,47,184,0.15)", backgroundColor: "#fafafe" },
  codeFlag: { fontSize: 18 },
  codeText: { fontSize: 14, fontWeight: "700", color: "#1a1a2e" },
  codeDropdown: { position: "absolute", top: 58, left: 0, width: 180, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "rgba(49,47,184,0.12)", padding: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
  codeOption: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10 },
  codeOptionActive: { backgroundColor: "rgba(49,47,184,0.06)" },
  codeLabel: { fontSize: 12, color: "#888", fontWeight: "500" },
  eyeBtn: { position: "absolute", right: 14, top: 16 },
  helperError: { marginTop: 6, color: "#dc2626", fontSize: 12, fontWeight: "500" },
  submitWrap: { marginTop: 22, borderRadius: 14, overflow: "hidden" },
  submitWrapDisabled: { opacity: 0.8 },
  submitBtn: { height: 52, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { color: "rgba(255,255,255,0.6)", fontSize: 14 },
  footerLink: { color: "#fff", fontSize: 14, fontWeight: "800", textDecorationLine: "underline" },
});
