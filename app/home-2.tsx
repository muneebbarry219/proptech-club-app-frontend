import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import BottomNav from "../components/navigation/BottomNav";

const { width } = Dimensions.get("window");

const HERO_IMAGE = "https://images.unsplash.com/photo-1571917687771-094c2a557ed4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.headerTitle}>PROPTECH</Text>
          <Text style={styles.headerSubtitle}>CONVENTION 2026</Text>
        </View>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <Image source={{ uri: HERO_IMAGE }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          <LinearGradient
            colors={["rgba(27,25,106,0.88)", "rgba(49,47,184,0.78)", "rgba(120,60,200,0.72)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>TECH-ENABLED{"\n"}REAL ESTATE</Text>
            <Text style={styles.heroSubtitle}>FOR THE NEXT BILLION</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            onPress={() => router.push("/speakers" as any)}
            activeOpacity={0.85}
            style={styles.actionCard}
          >
            <LinearGradient
              colors={["#312FB8", "#1B196A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.actionCircleLg} />
            <View style={styles.actionCircleSm} />
            <Text style={styles.actionLabel}>View all speakers</Text>
            <Text style={styles.actionTitle}>Speakers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/exhibitors" as any)}
            activeOpacity={0.85}
            style={styles.actionCard}
          >
            <LinearGradient
              colors={["#312FB8", "#1B196A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.actionCircleLg} />
            <View style={styles.actionCircleSm} />
            <Text style={styles.actionLabel}>Explore exhibitors</Text>
            <Text style={styles.actionTitle}>Exhibitors</Text>
          </TouchableOpacity>
        </View>

        {/* Partners & Sponsors */}
        <View style={styles.partnersSection}>
          <Text style={styles.sectionTitle}>Partners & Sponsors</Text>
          <LinearGradient
            colors={["#12103d", "#1B196A", "#2a277a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.partnersCard}
          >
            <Text style={styles.organizedByText}>ORGANIZED BY</Text>
            <View style={styles.partnersRow}>
              <View style={styles.partnerBadge}>
                <Text style={styles.landtrackText}>
                  landtrack<Text style={styles.landtrackPk}>.pk</Text>
                </Text>
                <Text style={styles.partnerRole}>Official Organizer</Text>
              </View>
              <View style={styles.partnerDivider} />
              <View style={styles.partnerBadge}>
                <Text style={styles.buildAsiaText}>18th BUILD ASIA</Text>
                <Text style={styles.partnerRole}>Co-Partner</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Event Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>DATE</Text>
            <Text style={styles.infoValue}>22–24 January 2026</Text>
          </View>
          <View style={[styles.infoCard, { marginLeft: 12 }]}>
            <Text style={styles.infoLabel}>VENUE</Text>
            <Text style={styles.infoValue}>Expo Center Karachi</Text>
          </View>
        </View>

      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    alignItems: "center",
    backgroundColor: "#fff",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(49,47,184,0.06)",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1B196A",
    letterSpacing: 3,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#312FB8",
    letterSpacing: 2,
    marginTop: 2,
  },
  heroBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    height: 220,
    overflow: "hidden",
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 20,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: "#C8C5FF",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  actionCard: {
    flex: 1,
    height: 100,
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  actionCircleLg: {
    position: "absolute",
    right: -18,
    top: -18,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  actionCircleSm: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  actionLabel: {
    color: "#C8C5FF",
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
  },
  actionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  partnersSection: {
    marginHorizontal: 16,
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a2e",
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  partnersCard: {
    borderRadius: 20,
    padding: 20,
  },
  organizedByText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  partnersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  partnerBadge: { alignItems: "center", gap: 6 },
  landtrackText: { color: "#fff", fontSize: 18, fontWeight: "300", fontStyle: "italic" },
  landtrackPk: { fontStyle: "normal", fontWeight: "700", fontSize: 11 },
  buildAsiaText: { color: "#fff", fontSize: 13, fontWeight: "900", letterSpacing: 1 },
  partnerRole: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: "500" },
  partnerDivider: { width: 1, height: 50, backgroundColor: "rgba(255,255,255,0.12)" },
  infoSection: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#f8f8fc",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(49,47,184,0.07)",
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9ba3b8",
    letterSpacing: 1,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a2e",
  },
});
