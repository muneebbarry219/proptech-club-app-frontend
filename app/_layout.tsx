import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, TextInput } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from "@expo-google-fonts/outfit";
import { AuthProvider } from "../context/AuthContext";

// ── Weight → Outfit family ────────────────────────────────────

function outfitFamily(fontWeight: unknown): string {
  let w = 400;
  if (typeof fontWeight === "number") {
    w = fontWeight;
  } else if (typeof fontWeight === "string") {
    if (fontWeight === "bold") w = 700;
    else if (fontWeight === "normal") w = 400;
    else {
      const n = parseInt(fontWeight, 10);
      if (!isNaN(n)) w = n;
    }
  }
  if (w >= 900) return "Outfit_900Black";
  if (w >= 800) return "Outfit_800ExtraBold";
  if (w >= 700) return "Outfit_700Bold";
  if (w >= 600) return "Outfit_600SemiBold";
  if (w >= 500) return "Outfit_500Medium";
  if (w >= 400) return "Outfit_400Regular";
  return "Outfit_300Light";
}

// ── Apply patch ───────────────────────────────────────────────

function applyFontPatch() {
  const ReactAny = React as any;
  if (ReactAny.__outfitPatchApplied) return;

  const _createElement = ReactAny.createElement.bind(ReactAny);

  ReactAny.createElement = (type: any, props: any, ...children: any[]) => {
    if (type !== Text && type !== TextInput) {
      return _createElement(type, props, ...children);
    }

    const p    = props ?? {};
    const flat = (StyleSheet.flatten(p.style) ?? {}) as any;

    // Leave BebasNeue untouched
    if (flat.fontFamily === "BebasNeue") {
      return _createElement(type, p, ...children);
    }

    const family  = outfitFamily(flat.fontWeight);
    const patched = { ...flat, fontFamily: family };
    delete patched.fontWeight;

    return _createElement(type, { ...p, style: patched }, ...children);
  };

  // Also set defaultProps so text without any style gets Outfit too
  (Text as any).defaultProps = (Text as any).defaultProps ?? {};
  (Text as any).defaultProps.style = { fontFamily: "Outfit_400Regular" };

  (TextInput as any).defaultProps = (TextInput as any).defaultProps ?? {};
  (TextInput as any).defaultProps.style = { fontFamily: "Outfit_400Regular" };

  ReactAny.__outfitPatchApplied = true;
}

// ── Root layout ───────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BebasNeue:            BebasNeue_400Regular,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
  });

  // Apply patch only after fonts are confirmed loaded
  useEffect(() => {
    if (fontsLoaded) {
      applyFontPatch();
    }
  }, [fontsLoaded]);

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
