import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";

export default function SplashScreen() {
  const router = useRouter();
  const { isLoading } = useAuth();
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
    { left: "8%", top: "12%" },
    { left: "82%", top: "8%" },
    { left: "18%", top: "72%" },
    { left: "72%", top: "58%" },
    { left: "48%", top: "86%" },
    { left: "90%", top: "42%" },
  ];

  useEffect(() => {
    setCanEnter(false);
    progressW.setValue(0);

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
      Animated.timing(taglineOp, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(btnOp, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    const progressAnimation = Animated.timing(progressW, {
      toValue: 200,
      duration: 5000,
      useNativeDriver: false,
    });

    progressAnimation.start(({ finished }) => {
      if (finished) {
        setCanEnter(true);
      }
    });

    return () => {
      progressAnimation.stop();
    };
  }, [isLoading]);

  const handleEnter = async () => {
    if (isLoading || !canEnter) return;
    router.replace("/home");
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#0f0e7a", "#1a18a0", "#312FB8", "#2820C2"]}
        start={{ x: 0.3, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />

      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <View key={i} style={[styles.gridLine, { left: `${6 + i * 13}%` as const, opacity: 0.025 + i * 0.004 }]} />
      ))}

      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[styles.particle, POSITIONS[i] as any, { opacity: p.opacity, transform: [{ translateY: p.y }] }]}
        />
      ))}

      <View style={styles.content}>
        <View style={styles.center}>
          <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ translateY: logoY }] }]}>
            {/* <View style={styles.logoMarkOuter}> */}
            {/* <View style={styles.logoMarkInner}> */}
            <Image source={require("../assets/logo.png")} style={styles.logoImage} resizeMode="cover" />
            {/* </View> */}
            {/* </View> */}
            <Text style={styles.logoName}>The PropTech Club</Text>
          </Animated.View>

          <Animated.Text style={[styles.flags, { opacity: taglineOp }]}>
            {"🇵🇰 | 🇸🇦"}
          </Animated.Text>

          <Animated.Text style={[styles.tagline, { opacity: taglineOp }]}>
            Where Real Estate , Capital & Technology Align
          </Animated.Text>

          <Animated.View style={[styles.btnWrap, { opacity: btnOp }]}>
            <TouchableOpacity
              onPress={handleEnter}
              style={[styles.btn, !canEnter && styles.btnDisabled]}
              activeOpacity={0.85}
              disabled={!canEnter}
            >
              <Text style={styles.btnText}>Enter Ecosystem</Text>
              <View style={[styles.btnArrow, !canEnter && styles.btnArrowDisabled]}>
                <Text style={styles.btnArrowText}>{"\u2192"}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: progressW }]} />
          </View>
          <Text style={styles.tapSkip}>PRESS THE BUTTON TO CONTINUE</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gridLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,1)",
  },
  particle: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 44,
    justifyContent: "space-between",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 22,
  },
  logoMarkOuter: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 6,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
  logoMarkInner: {
    width: 142,
    height: 142,
    borderRadius: 71,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  logoImage: {
    width: 132,
    height: 132,
  },
  logoName: {
    fontSize: 40,
    fontFamily: "BebasNeue",
    color: "#fff",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
    margin: 0
  },
  flags: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 38,
    marginTop: -15,
  },
  tagline: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 28,
    textAlign: "center",
    maxWidth: 320,
    marginBottom: 100,
  },
  btnWrap: {
    alignSelf: "center",
  },
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
    marginBottom: 20,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#312FB8",
  },
  btnArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#312FB8",
    alignItems: "center",
    // justifyContent: "center",
  },
  btnArrowDisabled: {
    backgroundColor: "rgba(49,47,184,0.7)",
  },
  btnArrowText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  progressTrack: {
    flex: 1,
    height: 2,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 2,
  },
  tapSkip: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
});
