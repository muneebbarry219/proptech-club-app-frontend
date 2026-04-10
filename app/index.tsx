import { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Animated,
  TouchableOpacity, Image, Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { storage } from "../utils/storage";

const { width } = Dimensions.get("window");
const ONBOARDED_KEY = "proptech_onboarded";
const FLAG_URIS = {
  ksa: "https://flagcdn.com/w80/sa.png",
  pk: "https://flagcdn.com/w80/pk.png",
  uae: "https://flagcdn.com/w80/ae.png",
} as const;

function CountryFlag({ country }: { country: "ksa" | "pk" | "uae" }) {
  return (
    <Image
      source={{ uri: FLAG_URIS[country] }}
      style={s.flagImage}
      resizeMode="cover"
    />
  );
}

export default function SplashScreen() {
  const primaryTagline = "Grow Your Network,";
  const secondaryTagline = "Grow Your Networth";
  const router = useRouter();
  const { isLoading, isAuthenticated, profile } = useAuth();
  const [canEnter, setCanEnter] = useState(false);

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(20)).current;
  const logoLiftY = useRef(new Animated.Value(0)).current;
  const flagsLiftY = useRef(new Animated.Value(0)).current;
  const taglineOp = useRef(new Animated.Value(0)).current;
  const taglinePrimaryX = useRef(new Animated.Value(-42)).current;
  const taglineSecondaryX = useRef(new Animated.Value(-54)).current;
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
    logoLiftY.setValue(0);
    flagsLiftY.setValue(0);
    taglinePrimaryX.setValue(-42);
    taglineSecondaryX.setValue(-54);

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

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 800, delay: 300, useNativeDriver: true }),
        Animated.timing(logoY, { toValue: 0, duration: 800, delay: 300, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(taglineOp, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(logoLiftY, { toValue: -48, duration: 600, useNativeDriver: true }),
        Animated.timing(flagsLiftY, { toValue: -30, duration: 600, useNativeDriver: true }),
        Animated.timing(taglinePrimaryX, { toValue: 0, duration: 720, useNativeDriver: true }),
        Animated.timing(taglineSecondaryX, { toValue: 0, duration: 820, delay: 120, useNativeDriver: true }),
      ]),
      Animated.timing(btnOp, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    const prog = Animated.timing(progressW, {
      toValue: width - 80,
      duration: 5000,
      useNativeDriver: false,
    });
    prog.start(({ finished }) => { if (finished) setCanEnter(true); });
    return () => {
      prog.stop();
    };
  }, [
    particles,
    progressW,
    logoOpacity,
    logoY,
    logoLiftY,
    flagsLiftY,
    taglineOp,
    taglinePrimaryX,
    taglineSecondaryX,
    btnOp,
  ]);

  const handleEnter = async () => {
    if (isLoading || !canEnter) return;

    if (isAuthenticated) {
      if (!profile) {
        router.replace("/auth/profile");
        return;
      }
      router.replace("/home");
      return;
    }

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
        start={{ x: 0.3, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />

      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
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
          <Animated.View
            style={[
              s.logoWrap,
              { opacity: logoOpacity, transform: [{ translateY: logoY }, { translateY: logoLiftY }] },
            ]}
          >
            <Image
              source={require("../assets/logo.png")}
              style={s.logoImage}
              resizeMode="contain"
            />
            <Text style={s.logoName}>The PropTech Club</Text>
          </Animated.View>

          <Animated.View
            style={[s.flagsRow, { opacity: taglineOp, transform: [{ translateY: flagsLiftY }] }]}
          >
            <CountryFlag country="ksa" />
            <CountryFlag country="pk" />
            <CountryFlag country="uae" />
          </Animated.View>

          <Animated.View style={[s.taglineWrap, { opacity: taglineOp }]}>
            <Animated.View
              style={{ transform: [{ translateX: taglinePrimaryX }] }}
            >
              <Text style={s.taglinePrimary}>{primaryTagline}</Text>
            </Animated.View>
            <Animated.View
              style={{ transform: [{ translateX: taglineSecondaryX }], marginTop: 6 }}
            >
              <Text style={s.taglineSecondary}>{secondaryTagline}</Text>
            </Animated.View>
          </Animated.View>

          <Animated.View style={[s.btnWrap, { opacity: btnOp }]}>
            <TouchableOpacity
              onPress={handleEnter}
              style={[s.btn, !canEnter && s.btnDisabled]}
              activeOpacity={0.85}
              disabled={!canEnter}
            >
              <Text style={s.btnText}>Enter Ecosystem</Text>
              <View style={[s.btnArrow, !canEnter && s.btnArrowDisabled]}>
                <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.4} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={s.bottom}>
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressBar, { width: progressW }]} />
          </View>
          <Text style={s.tapLabel}>PRESS THE BUTTON TO CONTINUE</Text>
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
  logoWrap: { alignItems: "center", marginBottom: 10 },
  logoImage: { width: 132, height: 132 },
  logoName: { fontSize: 38, color: "#fff", fontFamily: "BebasNeue", letterSpacing: 1.5, textAlign: "center", marginTop: 8 },
  flagsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 26,
  },
  flagImage: {
    width: 38,
    height: 24,
    borderRadius: 2,
    overflow: "hidden",
  },
  taglineWrap: {
    alignItems: "center",
    marginTop: 18,
    marginBottom: 78,
  },
  taglinePrimary: {
    color: "rgba(255,255,255,0.82)",
    fontFamily: "Outfit_300Light",
    fontSize: 34,
    lineHeight: 34,
    letterSpacing: -1.05,
    textAlign: "center",
  },
  taglineSecondary: {
    color: "#FFFFFF",
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 31,
    lineHeight: 35,
    letterSpacing: -0.9,
    textAlign: "center",
  },
  btnWrap: { alignSelf: "center" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontSize: 16, fontFamily: "Outfit_300Light", color: "#312FB8" },
  btnArrow: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#312FB8", alignItems: "center", justifyContent: "center" },
  btnArrowDisabled: { backgroundColor: "rgba(49,47,184,0.5)" },
  bottom: { flexDirection: "row", alignItems: "center", gap: 14 },
  progressTrack: { flex: 1, height: 2, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" },
  progressBar: { height: "100%", backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 2 },
  tapLabel: { color: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "Outfit_400Regular", letterSpacing: 0.5 },
});
