import { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Animated,
  TouchableOpacity, Image, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { storage } from "../utils/storage";

const { width } = Dimensions.get("window");
const ONBOARDED_KEY = "proptech_onboarded";

export default function SplashScreen() {
  const router = useRouter();
  const { isLoading, isAuthenticated, profile } = useAuth();
  const [canEnter, setCanEnter] = useState(false);

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(20)).current;
  const taglineOp = useRef(new Animated.Value(0)).current;
  const btnOp = useRef(new Animated.Value(0)).current;
  const progressW = useRef(new Animated.Value(0)).current;

  const particles = useRef(
    Array.from({ length: 6 }, () => ({
      opacity: new Animated.Value(0.15),
      y: new Animated.Value(0),
    }))
  ).current;

  const POSITIONS = [
    { left: "8%", top: "12%" }, { left: "82%", top: "8%" },
    { left: "18%", top: "72%" }, { left: "72%", top: "58%" },
    { left: "48%", top: "86%" }, { left: "90%", top: "42%" },
  ];

  useEffect(() => {
    setCanEnter(false);
    progressW.setValue(0);

    // Floating particles
    particles.forEach((p, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 350),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(p.opacity, { toValue: 0.5, duration: 1600, useNativeDriver: true }),
              Animated.timing(p.opacity, { toValue: 0.15, duration: 1600, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(p.y, { toValue: -14, duration: 1600, useNativeDriver: true }),
              Animated.timing(p.y, { toValue: 0, duration: 1600, useNativeDriver: true }),
            ]),
          ]),
        ])
      ).start();
    });

    // Main animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 800, delay: 300, useNativeDriver: true }),
        Animated.timing(logoY, { toValue: 0, duration: 800, delay: 300, useNativeDriver: true }),
      ]),
      Animated.timing(taglineOp, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(btnOp, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // Progress bar
    const prog = Animated.timing(progressW, {
      toValue: width - 80,
      duration: 5000,
      useNativeDriver: false,
    });
    prog.start(({ finished }) => { if (finished) setCanEnter(true); });
    return () => prog.stop();
  }, [isLoading]);

  const handleEnter = async () => {
    if (isLoading || !canEnter) return;

    if (isAuthenticated) {
      // Signed in but no profile — send to profile setup
      if (!profile) {
        router.replace("/auth/profile");
        return;
      }
      // Fully set up — go home
      router.replace("/home");
      return;
    }

    // Not signed in — check if onboarded before
    const onboarded = await storage.getItem(ONBOARDED_KEY);
    router.replace(onboarded ? "/home" : "/onboarding");
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleEnter}
      style={{ flex: 1 }}
      disabled={!canEnter}
    >
      <LinearGradient
        colors={["#0f0e7a", "#1a18a0", "#312FB8", "#2820C2"]}
        start={{ x: 0.3, y: 1 }} end={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />

      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
        <View
          key={i}
          style={[s.gridLine, { left: `${6 + i * 13}%` as any, opacity: 0.025 + i * 0.004 }]}
        />
      ))}

      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[s.particle, POSITIONS[i] as any, {
            opacity: p.opacity,
            transform: [{ translateY: p.y }],
          }]}
        />
      ))}

      <View style={s.content}>
        <View style={s.center}>
          <Animated.View style={[s.logoWrap, { opacity: logoOpacity, transform: [{ translateY: logoY }] }]}>
            <Image
              source={require("../assets/logo.png")}
              style={s.logoImage}
              resizeMode="contain"
            />
            <Text style={s.logoName}>The PropTech Club</Text>
          </Animated.View>

          <Animated.Text style={[s.flags, { opacity: taglineOp }]}>
            {"🇵🇰 | 🇸🇦"}
          </Animated.Text>

          <Animated.Text style={[s.tagline, { opacity: taglineOp }]}>
            Where Real Estate, Capital &amp; Technology Align
          </Animated.Text>

          <Animated.View style={[s.btnWrap, { opacity: btnOp }]}>
            <TouchableOpacity
              onPress={handleEnter}
              style={[s.btn, !canEnter && s.btnDisabled]}
              activeOpacity={0.85}
              disabled={!canEnter}
            >
              <Text style={s.btnText}>Enter Ecosystem</Text>
              <View style={[s.btnArrow, !canEnter && s.btnArrowDisabled]}>
                <Text style={s.btnArrowText}>→</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={s.bottom}>
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressBar, { width: progressW }]} />
          </View>
          <Text style={s.tapLabel}>PRESS TO CONTINUE</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  gridLine: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,1)" },
  particle: { position: "absolute", width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.2)" },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 60, paddingBottom: 44, justifyContent: "space-between" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  logoWrap: { alignItems: "center", marginBottom: 22 },
  logoImage: { width: 132, height: 132 },
  logoName: { fontSize: 38, color: "#fff", fontFamily: "BebasNeue", letterSpacing: 1.5, textAlign: "center", marginTop: 8 },
  flags: { color: "#fff", fontFamily: "Poppins_700Bold", fontSize: 24, textAlign: "center", marginBottom: 16, marginTop: -8 },
  tagline: { color: "rgba(255,255,255,0.78)", fontFamily: "Poppins_500Medium", fontSize: 18, lineHeight: 26, textAlign: "center", maxWidth: 300, marginBottom: 52 },
  btnWrap: { alignSelf: "center" },
  btn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, fontWeight: "800", color: "#312FB8" },
  btnArrow: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#312FB8", alignItems: "center", justifyContent: "center" },
  btnArrowDisabled: { backgroundColor: "rgba(49,47,184,0.5)" },
  btnArrowText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  bottom: { flexDirection: "row", alignItems: "center", gap: 14 },
  progressTrack: { flex: 1, height: 2, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" },
  progressBar: { height: "100%", backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 2 },
  tapLabel: { color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: "600", letterSpacing: 1 },
});
