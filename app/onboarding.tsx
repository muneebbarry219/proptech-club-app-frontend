import { useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { storage } from "../utils/storage";

const { width } = Dimensions.get("window");
const ONBOARDED_KEY = "proptech_onboarded";

const SLIDES = [
  {
    id: 1,
    icon: "👥",
    title: "Connect with verified\nreal estate stakeholders",
    subtitle: "Developers, investors, brokers and architects — all in one trusted network.",
    accent: "#5DCAA5",
  },
  {
    id: 2,
    icon: "💼",
    title: "Discover projects,\ncapital & opportunities",
    subtitle: "Browse the Deal Flow marketplace. Find investment opportunities or post your own.",
    accent: "#C8C5FF",
  },
  {
    id: 3,
    icon: "🔒",
    title: "Access private\nindustry rooms",
    subtitle: "Exclusive circles for developers, investors, and the GCC corridor. Members only.",
    accent: "#F0997B",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    } else {
      handleDone();
    }
  };

  const handleDone = async () => {
    await storage.setItem(ONBOARDED_KEY, "true");
    router.replace("/home");
  };

  const handleScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  const slide = SLIDES[currentIndex];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0f0e7a", "#1a18a0", "#312FB8"]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Skip */}
      <TouchableOpacity onPress={handleDone} style={styles.skipBtn}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s) => (
          <View key={s.id} style={[styles.slide, { width }]}>
            {/* Icon circle */}
            <View style={[styles.iconCircle, { borderColor: s.accent + "40" }]}>
              <View style={[styles.iconInner, { backgroundColor: s.accent + "20" }]}>
                <Text style={styles.iconText}>{s.icon}</Text>
              </View>
            </View>

            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.subtitle}>{s.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
                i === currentIndex && { backgroundColor: slide.accent },
              ]}
            />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity onPress={handleNext} style={styles.btn} activeOpacity={0.85}>
          <LinearGradient
            colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.1)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
          />
          <Text style={styles.btnText}>
            {currentIndex === SLIDES.length - 1 ? "Get Started" : "Continue"}
          </Text>
          <Text style={styles.btnArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skipBtn: { position: "absolute", top: 60, right: 24, zIndex: 10, padding: 8 },
  skipText: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: "600" },
  slide: {
    flex: 1, paddingHorizontal: 36,
    justifyContent: "center", alignItems: "flex-start",
    paddingTop: 80, paddingBottom: 40,
  },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center",
    marginBottom: 40,
  },
  iconInner: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: "center", justifyContent: "center",
  },
  iconText: { fontSize: 42 },
  title: {
    color: "#fff", fontSize: 28, fontWeight: "900",
    lineHeight: 36, letterSpacing: -0.5, marginBottom: 16,
  },
  subtitle: {
    color: "rgba(255,255,255,0.6)", fontSize: 15,
    lineHeight: 24, fontWeight: "400",
  },
  bottom: { paddingHorizontal: 28, paddingBottom: 52, gap: 28 },
  dots: { flexDirection: "row", gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)" },
  dotActive: { width: 24, borderRadius: 3 },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, height: 56, borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  btnArrow: { color: "rgba(255,255,255,0.7)", fontSize: 18, fontWeight: "700" },
});
