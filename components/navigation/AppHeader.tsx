import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

function initials(name: string) {
  return name.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase();
}

export default function AppHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, isAuthenticated } = useAuth();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.headerLeft}>
        <Image source={require("../../assets/proptech logo colored.png")} style={styles.logoMark} resizeMode="contain" />
        <Text style={styles.logoName}>PropTech Club</Text>
      </View>
      <View style={styles.headerRight}>
        {isAuthenticated ? (
          <TouchableOpacity onPress={() => router.push("/auth/profile" as any)} style={styles.avatarBtn}>
            <Text style={styles.avatarTxt}>{profile?.full_name ? initials(profile.full_name) : "?"}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.push("/auth/sign-in" as any)} style={styles.signInBtn}>
            <Text style={styles.signInTxt}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(49,47,184,0.08)",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  logoMark: { width: 48, height: 48 },
  logoName: { fontSize: 20, fontFamily: "BebasNeue", color: "#1B196A", letterSpacing: 0.3 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#312FB8", alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontSize: 12, fontFamily: "Outfit_600SemiBold", letterSpacing: 0 },
  signInBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: "#EEEDFE", borderWidth: 1, borderColor: "rgba(49,47,184,0.2)" },
  signInTxt: { fontSize: 13, fontFamily: "Outfit_300Light", letterSpacing: 0, color: "#312FB8" },
});
