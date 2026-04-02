import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, TextInput } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from "@expo-google-fonts/poppins";
import { AuthProvider } from "../context/AuthContext";

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

function poppinsFamilyForWeight(fontWeight: unknown) {
  const weight = normalizeWeight(fontWeight);
  if (weight >= 900) return "Poppins_900Black";
  if (weight >= 800) return "Poppins_800ExtraBold";
  if (weight >= 700) return "Poppins_700Bold";
  if (weight >= 600) return "Poppins_600SemiBold";
  if (weight >= 500) return "Poppins_500Medium";
  return "Poppins_400Regular";
}

const ReactAny = React as any;
if (!ReactAny.__poppinsTextPatchApplied) {
  const originalCreateElement = ReactAny.createElement.bind(ReactAny);

  ReactAny.createElement = (type: any, props: any, ...children: any[]) => {
    const isTextLike = type === Text || type === TextInput;
    if (!isTextLike) {
      return originalCreateElement(type, props, ...children);
    }

    const nextProps = props ?? {};
    const flatStyle = StyleSheet.flatten(nextProps.style) ?? {};

    // Keep explicit Bebas labels untouched (PropTech Club).
    if (flatStyle.fontFamily === "BebasNeue") {
      return originalCreateElement(type, nextProps, ...children);
    }

    const styleWithPoppins = {
      ...flatStyle,
      fontFamily: poppinsFamilyForWeight(flatStyle.fontWeight),
    } as any;

    delete styleWithPoppins.fontWeight;

    return originalCreateElement(type, { ...nextProps, style: styleWithPoppins }, ...children);
  };

  ReactAny.__poppinsTextPatchApplied = true;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BebasNeue: BebasNeue_400Regular,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
