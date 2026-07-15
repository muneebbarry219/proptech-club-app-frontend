import Constants from "expo-constants";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

type GoogleAuthExtra = {
  webClientId?: string;
  iosClientId?: string;
  androidClientId?: string;
};

export type GoogleAccount = {
  email: string;
  fullName: string;
  googleId: string;
};

const missingClientId = "missing-google-client-id";

function getGoogleOAuthExtra(): GoogleAuthExtra {
  const extra = Constants.expoConfig?.extra as { googleOAuth?: GoogleAuthExtra } | undefined;
  return extra?.googleOAuth ?? {};
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return decodeURIComponent(
    binary
      .split("")
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("")
  );
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    return JSON.parse(decodeBase64Url(payload));
  } catch {
    return null;
  }
}

function configuredClientId(extra: GoogleAuthExtra) {
  if (Platform.OS === "ios") return extra.iosClientId;
  if (Platform.OS === "android") return extra.androidClientId;
  return extra.webClientId;
}

export function useGoogleAuthRequest() {
  const googleOAuth = getGoogleOAuthExtra();
  const hasConfig = !!configuredClientId(googleOAuth);
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: googleOAuth.androidClientId || missingClientId,
    iosClientId: googleOAuth.iosClientId || missingClientId,
    webClientId: googleOAuth.webClientId || missingClientId,
    selectAccount: true,
  });

  const prompt = async (): Promise<{ account?: GoogleAccount; error?: string }> => {
    if (!hasConfig) {
      return {
        error:
          "Google sign-in is not configured yet. Add the Google OAuth client ID for this platform to your Expo config.",
      };
    }

    const result = await promptAsync();
    if (result.type !== "success") {
      return { error: result.type === "cancel" ? "Google sign-in was cancelled." : "Google sign-in failed." };
    }

    const idToken = result.params.id_token;
    const payload = idToken ? decodeJwtPayload(idToken) : null;
    const email = typeof payload?.email === "string" ? payload.email.toLowerCase() : "";
    const googleId = typeof payload?.sub === "string" ? payload.sub : "";
    const fullName =
      typeof payload?.name === "string" && payload.name.trim()
        ? payload.name.trim()
        : email.split("@")[0] || "Google User";

    if (!email || !googleId) {
      return { error: "Google did not return the account details needed to continue." };
    }

    return { account: { email, fullName, googleId } };
  };

  return { disabled: !request, hasConfig, prompt };
}

export function isMissingGooglePasswordAccount(error?: string) {
  if (!error) return false;
  const normalized = error.toLowerCase();
  return normalized.includes("invalid login") || normalized.includes("invalid credentials");
}
