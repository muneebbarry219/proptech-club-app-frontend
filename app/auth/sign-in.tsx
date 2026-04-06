import { useState } from "react";
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
import { ArrowLeft, Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");
    const result = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.replace("/home");
  };

  return (
    <LinearGradient colors={["#0f0e7a", "#1a18a0", "#312FB8"]} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <ArrowLeft size={18} color="#fff" strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.logoMark}>
                <Image source={require("../../assets/proptech logo colored.png")} style={styles.logoImage} resizeMode="contain" />
              </View>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to PropTech Club</Text>
            </View>

            <View style={styles.card}>
              {!!error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Text style={styles.label}>EMAIL ADDRESS</Text>
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

              <Text style={[styles.label, { marginTop: 14 }]}>PASSWORD</Text>
              <View style={{ position: "relative" }}>
                <TextInput
                  style={[styles.input, { paddingRight: 52 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#aaa"
                  secureTextEntry={!showPass}
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                />
                <TouchableOpacity onPress={() => setShowPass((value) => !value)} style={styles.eyeBtn}>
                  {showPass ? (
                    <EyeOff size={18} color="#7b8194" strokeWidth={2} />
                  ) : (
                    <Eye size={18} color="#7b8194" strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleSignIn} disabled={loading} activeOpacity={0.85} style={styles.submitWrap}>
                <LinearGradient colors={["#312FB8", "#1B196A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitBtn}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Sign In</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/auth/sign-up")}>
                <Text style={styles.footerLink}>Sign up</Text>
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
    top: 50,
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
    marginTop: -28,
  },
  header: {
    width: "100%",
    alignItems: "center",
    marginBottom: 34,
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
    fontFamily: "Outfit_700Bold",
    letterSpacing: 0,
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    letterSpacing: 0,
    textAlign: "center",
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
    letterSpacing: 0,
  },
  label: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    color: "#555",
    letterSpacing: 0,
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
    letterSpacing: 0,
    color: "#1a1a2e",
    backgroundColor: "#fafafe",
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
  submitBtn: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    letterSpacing: 0,
  },
  footerLink: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0,
    textDecorationLine: "underline",
  },
});
