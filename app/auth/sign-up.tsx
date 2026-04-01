import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ChevronDown, Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";

const COUNTRY_CODES = [
  { flag: "🇵🇰", label: "Pakistan", code: "+92" },
  { flag: "🇸🇦", label: "Saudi", code: "+966" },
  { flag: "🇦🇪", label: "UAE", code: "+971" },
  { flag: "🇺🇸", label: "USA", code: "+1" },
  { flag: "🇬🇧", label: "UK", code: "+44" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizePhone = (value: string) => value.replace(/[^\d]/g, "");

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0].code);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [designation, setDesignation] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trimmedName = fullName.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedCompany = company.trim();
  const trimmedDesignation = designation.trim();
  const normalizedPhone = normalizePhone(phoneNumber);
  const selectedCountry = COUNTRY_CODES.find((item) => item.code === countryCode) ?? COUNTRY_CODES[0];

  const isEmailValid = EMAIL_REGEX.test(trimmedEmail);
  const isPhoneValid = normalizedPhone.length >= 9 && normalizedPhone.length <= 12;
  const isPasswordValid = password.length >= 6;
  const isConfirmValid = confirm.length > 0 && password === confirm;

  const fieldError = useMemo(() => {
    if (!trimmedName) return "Please enter your name.";
    if (!normalizedPhone) return "Please enter your phone number.";
    if (!isPhoneValid) return "Enter a valid phone number.";
    if (!trimmedEmail) return "Please enter your email address.";
    if (!isEmailValid) return "Enter a valid email address.";
    if (!trimmedCompany) return "Please enter your company or organization.";
    if (!trimmedDesignation) return "Please enter your designation or role.";
    if (!password.trim()) return "Please create a password.";
    if (!isPasswordValid) return "Password must be at least 6 characters.";
    if (!confirm.trim()) return "Please confirm your password.";
    if (!isConfirmValid) return "Passwords do not match.";
    return "";
  }, [
    confirm,
    isConfirmValid,
    isEmailValid,
    isPasswordValid,
    isPhoneValid,
    normalizedPhone,
    password,
    trimmedCompany,
    trimmedDesignation,
    trimmedEmail,
    trimmedName,
  ]);

  const isFormValid = fieldError.length === 0;

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value.replace(/[^\d\s\-()]/g, ""));
  };

  const handleSignUp = async () => {
    if (!isFormValid) {
      setError(fieldError);
      return;
    }

    setLoading(true);
    setError("");
    const result = await signUp(trimmedEmail, password, {
      fullName: trimmedName,
      phoneNumber: `${countryCode} ${normalizedPhone}`,
      company: trimmedCompany,
      designation: trimmedDesignation,
    });
    setLoading(false);
    console.log("[SignUpScreen] Sign up result", result);

    if (result.error) {
      const normalizedError = result.error.toLowerCase();
      if (normalizedError.includes("rate limit")) {
        console.warn("[SignUpScreen] Signup blocked by rate limit", {
          email: trimmedEmail,
          company: trimmedCompany,
        });
        setError("Too many signup attempts were made for this email. Please wait a little, or try signing in if your account was already created.");
        return;
      }
      console.error("[SignUpScreen] Signup returned error", result.error);
      setError(result.error);
      return;
    }

    router.replace({
      pathname: "/auth/profile-setup",
      params: {
        fullName: trimmedName,
        company: trimmedCompany,
        whatsapp: `${countryCode} ${normalizedPhone}`,
      },
    });
  };

  return (
    <LinearGradient colors={["#0f0e7a", "#1a18a0", "#312FB8"]} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <ArrowLeft size={18} color="#fff" strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.logoMark}>
                <Image source={require("../../assets/proptech logo colored.png")} style={styles.logoImage} resizeMode="contain" />
              </View>
              <Text style={styles.title}>Join PropTech Club</Text>
              <Text style={styles.subtitle}>Create your account to enter the ecosystem</Text>
            </View>

            <View style={styles.card}>
              {!!error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={styles.formScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                scrollEnabled={!isCountryOpen}
              >
                <Text style={styles.label}>NAME</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your full name"
                  placeholderTextColor="#aaa"
                  autoCapitalize="words"
                />

                <Text style={[styles.label, styles.fieldSpacing]}>PHONE NUMBER</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countrySelectWrap}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setIsCountryOpen((value) => !value)}
                      style={styles.countrySelect}
                    >
                      <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                      <View style={styles.countryMeta}>
                        <Text style={styles.countryCode}>{selectedCountry.code}</Text>
                        <Text style={styles.countryShort}>{selectedCountry.label}</Text>
                      </View>
                      <ChevronDown size={16} color="#6d7090" strokeWidth={2.2} />
                    </TouchableOpacity>

                    {isCountryOpen && (
                      <View style={styles.countryMenu}>
                        <ScrollView
                          style={styles.countryMenuScroll}
                          contentContainerStyle={styles.countryMenuScrollContent}
                          showsVerticalScrollIndicator={false}
                          nestedScrollEnabled
                          keyboardShouldPersistTaps="handled"
                        >
                          {COUNTRY_CODES.map((item) => (
                            <TouchableOpacity
                              key={item.code}
                              onPress={() => {
                                setCountryCode(item.code);
                                setIsCountryOpen(false);
                              }}
                              activeOpacity={0.85}
                              style={[styles.countryOption, item.code === countryCode && styles.countryOptionActive]}
                            >
                              <Text style={styles.countryFlag}>{item.flag}</Text>
                              <View style={styles.countryMeta}>
                                <Text style={styles.countryCode}>{item.code}</Text>
                                <Text style={styles.countryShort}>{item.label}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    value={phoneNumber}
                    onChangeText={handlePhoneChange}
                    placeholder="300 1234567"
                    placeholderTextColor="#aaa"
                    keyboardType="phone-pad"
                  />
                </View>
                {!isPhoneValid && normalizedPhone.length > 0 && (
                  <Text style={styles.helperError}>Use a valid mobile number.</Text>
                )}

                <Text style={[styles.label, styles.fieldSpacing]}>EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#aaa"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {!isEmailValid && trimmedEmail.length > 0 && (
                  <Text style={styles.helperError}>Enter a valid email address.</Text>
                )}

                <Text style={[styles.label, styles.fieldSpacing]}>COMPANY / ORGANIZATION</Text>
                <TextInput
                  style={styles.input}
                  value={company}
                  onChangeText={setCompany}
                  placeholder="Your company or organization"
                  placeholderTextColor="#aaa"
                />

                <Text style={[styles.label, styles.fieldSpacing]}>DESIGNATION / ROLE</Text>
                <TextInput
                  style={styles.input}
                  value={designation}
                  onChangeText={setDesignation}
                  placeholder="Founder, Investor, Broker..."
                  placeholderTextColor="#aaa"
                />

                <Text style={[styles.label, styles.fieldSpacing]}>PASSWORD</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Min. 6 characters"
                    placeholderTextColor="#aaa"
                    secureTextEntry={!showPass}
                  />
                  <TouchableOpacity onPress={() => setShowPass((value) => !value)} style={styles.eyeBtn}>
                    {showPass ? (
                      <EyeOff size={18} color="#7b8194" strokeWidth={2} />
                    ) : (
                      <Eye size={18} color="#7b8194" strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, styles.fieldSpacing]}>CONFIRM PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Repeat password"
                  placeholderTextColor="#aaa"
                  secureTextEntry={!showPass}
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                />
                {confirm.length > 0 && !isConfirmValid && (
                  <Text style={styles.helperError}>Passwords must match.</Text>
                )}
              </ScrollView>

              <TouchableOpacity
                onPress={handleSignUp}
                disabled={loading || !isFormValid}
                activeOpacity={0.85}
                style={[styles.submitWrap, !isFormValid && styles.submitWrapDisabled]}
              >
                <LinearGradient
                  colors={isFormValid ? ["#312FB8", "#1B196A"] : ["#b7b8c8", "#9a9cad"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitBtn}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Account</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.terms}>Please complete every field to enable account creation.</Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/auth/sign-in")}>
                <Text style={styles.footerLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  back: {
    position: "absolute",
    top: 24,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
  },
  header: {
    width: "100%",
    alignItems: "center",
    marginBottom: 28,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImage: {
    width: 62,
    height: 62,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(255,255,255,0.64)",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    minHeight: 540,
    maxHeight: 540,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },
  formScroll: {
    flexGrow: 0,
  },
  formScrollContent: {
    paddingBottom: 4,
  },
  errorBox: {
    backgroundColor: "rgba(220,38,38,0.08)",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.2)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "500",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldSpacing: {
    marginTop: 14,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(49,47,184,0.15)",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1a1a2e",
    backgroundColor: "#fafafe",
  },
  phoneRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    width: "100%",
  },
  countrySelectWrap: {
    width: 118,
    zIndex: 20,
    flexShrink: 0,
  },
  countrySelect: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(49,47,184,0.14)",
    backgroundColor: "#f7f6ff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  countryMenu: {
    position: "absolute",
    top: 58,
    left: 0,
    right: 0,
    height: 132,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.12)",
    backgroundColor: "#fff",
    padding: 6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  countryMenuScroll: {
    flex: 1,
  },
  countryMenuScrollContent: {
    paddingBottom: 4,
  },
  countryOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    height: 40,
    paddingHorizontal: 10,
  },
  countryOptionActive: {
    backgroundColor: "rgba(49,47,184,0.08)",
  },
  countryFlag: {
    fontSize: 18,
    marginRight: 10,
  },
  countryMeta: {
    flex: 1,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1a1a2e",
    lineHeight: 18,
  },
  countryShort: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7b8194",
    lineHeight: 14,
    flexShrink: 1,
  },
  phoneInput: {
    flex: 1,
    width: 0,
  },
  helperError: {
    marginTop: 6,
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "500",
  },
  passwordWrap: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 52,
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 16,
  },
  submitWrap: {
    marginTop: 22,
    borderRadius: 14,
    overflow: "hidden",
  },
  submitWrapDisabled: {
    opacity: 0.86,
  },
  submitBtn: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  terms: {
    textAlign: "center",
    marginTop: 14,
    fontSize: 11,
    color: "#9b9db0",
    lineHeight: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },
  footerLink: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
});
