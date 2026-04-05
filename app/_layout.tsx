import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, TextInput } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from "@expo-google-fonts/outfit";
import { AuthProvider } from "../context/AuthContext";

// ── Font weight → Poppins family map ─────────────────────────

function normalizeWeight(fontWeight: unknown): number {
  if (typeof fontWeight === "number") return fontWeight;
  if (typeof fontWeight === "string") {
    if (fontWeight === "bold") return 700;
    if (fontWeight === "normal") return 400;
    const parsed = Number.parseInt(fontWeight, 10);
    return Number.isNaN(parsed) ? 400 : parsed;
  }
  return 400;
}

function outfitFamily(fontWeight: unknown) {
  const w = normalizeWeight(fontWeight);
  if (w >= 900) return "Outfit_900Black";
  if (w >= 800) return "Outfit_800ExtraBold";
  if (w >= 700) return "Outfit_700Bold";
  if (w >= 600) return "Outfit_600SemiBold";
  if (w >= 500) return "Outfit_500Medium";
  return "Outfit_400Regular";
}

// ── Global font patch ─────────────────────────────────────────
// Intercepts every Text and TextInput render and applies Poppins
// unless the element already has BebasNeue (logo) set.

const ReactAny = React as any;
if (!ReactAny.__fontPatchApplied) {
  (Text as any).defaultProps = {
    ...((Text as any).defaultProps ?? {}),
    style: [{ fontFamily: "Outfit_400Regular" }, (Text as any).defaultProps?.style].filter(Boolean),
  };
  (TextInput as any).defaultProps = {
    ...((TextInput as any).defaultProps ?? {}),
    style: [{ fontFamily: "Outfit_400Regular" }, (TextInput as any).defaultProps?.style].filter(Boolean),
  };

  const originalCreateElement = ReactAny.createElement.bind(ReactAny);

  ReactAny.createElement = (type: any, props: any, ...children: any[]) => {
    const isTextLike = type === Text || type === TextInput;
    if (!isTextLike) return originalCreateElement(type, props, ...children);

    const nextProps = props ?? {};
    const flatStyle = StyleSheet.flatten(nextProps.style) ?? {};

    // Leave BebasNeue (logo in splash + header) untouched
    if (flatStyle.fontFamily === "BebasNeue") {
      return originalCreateElement(type, nextProps, ...children);
    }

    const patchedStyle = {
      ...flatStyle,
      fontFamily: outfitFamily(flatStyle.fontWeight),
    } as any;

    // Remove fontWeight — Poppins already encodes it in the family name
    delete patchedStyle.fontWeight;

    return originalCreateElement(type, { ...nextProps, style: patchedStyle }, ...children);
  };

  ReactAny.__fontPatchApplied = true;
}

// ── Root layout ───────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BebasNeue: BebasNeue_400Regular,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
