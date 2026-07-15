import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Application from "expo-application";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AUTH_URL, SUPABASE_ANON_KEY } from "../../constants/supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPasswordResetRedirectUrl() {
  const isDevelopmentApp = Application.applicationId === "pk.landtrack.proptech.club.dev";
  const scheme = isDevelopmentApp ? "proptechclubdev" : "proptechclub";

  return `${scheme}://auth/reset-password`;
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const initialEmail = Array.isArray(params.email) ? params.email[0] : params.email;

  const [email, setEmail] = useState(initialEmail ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const sendResetLink = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const redirectTo = getPasswordResetRedirectUrl();
      const response = await fetch(`${AUTH_URL}/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error_description ?? data.msg ?? "Could not send the reset link. Please try again.");
        return;
      }

      setEmail(normalizedEmail);
      setSent(true);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#0f0e7a", "#1a18a0", "#312FB8"]}
      start={{ x: 0, y: 1 }}
      end={{ x: 0, y: 0 }}
      style={styles.screen}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.screen}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 24) + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
            <ArrowLeft size={18} color="#fff" strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.iconCircle}>
              {sent ? (
                <CheckCircle2 size={34} color="#312FB8" strokeWidth={2} />
              ) : (
                <Mail size={34} color="#312FB8" strokeWidth={2} />
              )}
            </View>

            <Text style={styles.title}>{sent ? "Check your inbox" : "Forgot your password?"}</Text>
            <Text style={styles.subtitle}>
              {sent
                ? `If an account exists for ${email}, you'll receive a password reset link shortly.`
                : "Enter the email linked to your account and we'll send you a password reset link."}
            </Text>

            <View style={styles.card}>
              {!sent ? (
                <>
                  {!!error && (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <Text style={styles.label}>EMAIL ADDRESS</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      if (error) setError("");
                    }}
                    placeholder="you@example.com"
                    placeholderTextColor="#aaa"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    returnKeyType="send"
                    onSubmitEditing={sendResetLink}
                  />

                  <TouchableOpacity onPress={sendResetLink} disabled={loading} activeOpacity={0.85} style={styles.submitWrap}>
                    <LinearGradient colors={["#312FB8", "#1B196A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitButton}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Send Reset Link</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.helpText}>Didn't receive the email? Check your spam folder or try sending it again.</Text>
                  <TouchableOpacity onPress={() => setSent(false)} activeOpacity={0.8} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Send Again</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity onPress={() => router.replace("/auth/sign-in")} style={styles.signInLink} activeOpacity={0.8}>
              <Text style={styles.signInLinkText}>Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    alignItems: "center",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Outfit_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
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
    fontFamily: "Outfit_400Regular",
  },
  label: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    color: "#555",
    marginBottom: 6,
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(49,47,184,0.15)",
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
    color: "#1a1a2e",
    backgroundColor: "#fafafe",
  },
  submitWrap: {
    marginTop: 20,
    borderRadius: 14,
    overflow: "hidden",
  },
  submitButton: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
  },
  helpText: {
    color: "#555b70",
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
  },
  secondaryButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(49,47,184,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  secondaryButtonText: {
    color: "#312FB8",
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
  },
  signInLink: {
    marginTop: 24,
    paddingVertical: 8,
  },
  signInLinkText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
    textDecorationLine: "underline",
  },
});
