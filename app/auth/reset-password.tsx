import { useEffect, useState } from "react";
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
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AUTH_URL, SUPABASE_ANON_KEY } from "../../constants/supabase";
import { useAuth } from "../../context/AuthContext";
import {
  captureRecoveryToken,
  clearRecoveryToken,
  getRecoveryToken,
} from "../../utils/password-recovery";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const [token, setToken] = useState(() => getRecoveryToken());
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) return;

    void Linking.getInitialURL().then((url) => {
      if (captureRecoveryToken(url)) {
        setToken(getRecoveryToken());
      }
    });
  }, [token]);

  const updatePassword = async () => {
    if (!token) {
      setError("This reset link is invalid or has expired. Please request a new one.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${AUTH_URL}/user`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error_description ?? data.msg ?? "Could not update your password. Please request a new reset link.");
        return;
      }

      await signOut();
      clearRecoveryToken();
      setSuccess(true);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordInput = (
    value: string,
    onChangeText: (value: string) => void,
    visible: boolean,
    toggleVisible: () => void,
    placeholder: string,
    submit = false,
  ) => (
    <View style={styles.inputWrap}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(nextValue) => {
          onChangeText(nextValue);
          if (error) setError("");
        }}
        placeholder={placeholder}
        placeholderTextColor="#aaa"
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        returnKeyType={submit ? "done" : "next"}
        onSubmitEditing={submit ? updatePassword : undefined}
      />
      <TouchableOpacity onPress={toggleVisible} style={styles.eyeButton} accessibilityLabel={visible ? "Hide password" : "Show password"}>
        {visible ? <EyeOff size={18} color="#7b8194" /> : <Eye size={18} color="#7b8194" />}
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient colors={["#0f0e7a", "#1a18a0", "#312FB8"]} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.screen}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              {success ? <CheckCircle2 size={34} color="#312FB8" /> : <KeyRound size={34} color="#312FB8" />}
            </View>

            <Text style={styles.title}>{success ? "Password updated" : "Create new password"}</Text>
            <Text style={styles.subtitle}>
              {success
                ? "Your password has been changed successfully. You can now sign in with your new password."
                : "Choose a secure password with at least 6 characters."}
            </Text>

            <View style={styles.card}>
              {success ? (
                <TouchableOpacity onPress={() => router.replace("/auth/sign-in")} activeOpacity={0.85} style={styles.submitWrap}>
                  <LinearGradient colors={["#312FB8", "#1B196A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitButton}>
                    <Text style={styles.submitText}>Continue to Sign In</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <>
                  {!!error && (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <Text style={styles.label}>NEW PASSWORD</Text>
                  {renderPasswordInput(password, setPassword, showPassword, () => setShowPassword((value) => !value), "Enter new password")}

                  <Text style={[styles.label, styles.confirmLabel]}>CONFIRM PASSWORD</Text>
                  {renderPasswordInput(confirmPassword, setConfirmPassword, showConfirmPassword, () => setShowConfirmPassword((value) => !value), "Confirm new password", true)}

                  <TouchableOpacity onPress={updatePassword} disabled={loading} activeOpacity={0.85} style={styles.submitWrap}>
                    <LinearGradient colors={["#312FB8", "#1B196A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitButton}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Update Password</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {!success && !token && (
              <TouchableOpacity onPress={() => router.replace("/auth/forgot-password")} style={styles.requestLink}>
                <Text style={styles.requestLinkText}>Request a new reset link</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 },
  content: { width: "100%", maxWidth: 420, alignSelf: "center", alignItems: "center" },
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
  title: { color: "#fff", fontSize: 26, fontFamily: "Outfit_700Bold", textAlign: "center", marginBottom: 8 },
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
  errorText: { color: "#dc2626", fontSize: 13, fontFamily: "Outfit_400Regular" },
  label: { fontSize: 11, fontFamily: "Outfit_600SemiBold", color: "#555", marginBottom: 6 },
  confirmLabel: { marginTop: 14 },
  inputWrap: { position: "relative" },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(49,47,184,0.15)",
    paddingLeft: 16,
    paddingRight: 52,
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
    color: "#1a1a2e",
    backgroundColor: "#fafafe",
  },
  eyeButton: { position: "absolute", right: 14, top: 16, paddingHorizontal: 2 },
  submitWrap: { marginTop: 22, borderRadius: 14, overflow: "hidden" },
  submitButton: { height: 52, alignItems: "center", justifyContent: "center" },
  submitText: { color: "#fff", fontSize: 16, fontFamily: "Outfit_600SemiBold" },
  requestLink: { marginTop: 24, paddingVertical: 8 },
  requestLinkText: { color: "#fff", fontSize: 14, fontFamily: "Outfit_600SemiBold", textDecorationLine: "underline" },
});
