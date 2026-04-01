import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { API_BASE_URL, API_BASE_URL_CANDIDATES } from "../constants/api";
import { storage } from "../utils/storage";

const STORAGE_KEY = "proptech_club_session";
const API_BASE = `${API_BASE_URL}/api/auth`;

const getNetworkErrorMessage = (endpoint: string, error: unknown) => {
  const detail = error instanceof Error ? error.message : String(error);
  return `Could not reach ${endpoint}. Check that the backend is running and reachable from this device. Details: ${detail}`;
};

export type UserRole = "developer" | "investor" | "broker" | "architect" | "tech";
export type UserLocation = "karachi" | "lahore" | "islamabad" | "uae" | "ksa" | "other";
export type MembershipTier = "free" | "starter" | "professional" | "enterprise";

export interface Profile {
  id: string;
  full_name: string;
  company: string | null;
  role: UserRole | null;
  current_focus: string | null;
  looking_for: string[];
  location: UserLocation;
  whatsapp: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface Membership {
  tier: MembershipTier;
  status: "active" | "expired" | "cancelled";
  expires_at: string | null;
}

interface Session {
  user: { id: string; email: string };
  token: string;
}

interface SignUpPayload {
  fullName: string;
  phoneNumber: string;
  company: string;
  designation: string;
}

interface SignUpResult {
  error?: string;
}

interface AuthContextType {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  membership: Membership | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, payload?: SignUpPayload) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  createProfile: (data: Omit<Profile, "id" | "is_verified" | "created_at">) => Promise<{ error?: string }>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const DEFAULT_MEMBERSHIP: Membership = {
  tier: "free",
  status: "active",
  expires_at: null,
};

const normalizeProfile = (value: any): Profile => ({
  id: String(value.id),
  full_name: value.full_name ?? "",
  company: value.company ?? null,
  role: value.role ?? null,
  current_focus: value.current_focus ?? null,
  looking_for: Array.isArray(value.looking_for) ? value.looking_for : [],
  location: value.location ?? "karachi",
  whatsapp: value.whatsapp ?? null,
  bio: value.bio ?? null,
  avatar_url: value.avatar_url ?? null,
  is_verified: Boolean(value.is_verified),
  created_at: value.created_at ?? new Date().toISOString(),
});

const getAuthApiCandidates = () => API_BASE_URL_CANDIDATES.map((baseUrl) => `${baseUrl}/api/auth`);

const tryAuthRequest = async (path: string, options?: RequestInit): Promise<Response> => {
  const candidates = getAuthApiCandidates();
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      return await fetch(`${candidate}${path}`, options);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("No API base URL candidates were reachable.");
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  const saveSession = async (session: Session) => {
    tokenRef.current = session.token;
    setUser(session.user);
    setMembership(DEFAULT_MEMBERSHIP);
    await storage.setItem(STORAGE_KEY, JSON.stringify(session));
  };

  const clearSession = async () => {
    tokenRef.current = null;
    setUser(null);
    setProfile(null);
    setMembership(null);
    await storage.removeItem(STORAGE_KEY);
  };

  const apiFetch = useCallback(async (path: string, options?: RequestInit): Promise<Response> => {
    const token = tokenRef.current;

    return tryAuthRequest(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!tokenRef.current) {
      return;
    }

    try {
      const res = await apiFetch("/me", { method: "GET" });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          await clearSession();
        }
        return;
      }

      const nextProfile = normalizeProfile(data.user);
      setProfile(nextProfile);
      setUser({ id: nextProfile.id, email: data.user.email });
      setMembership(DEFAULT_MEMBERSHIP);
    } catch {
      // Keep the last local session/profile state if the network is temporarily unavailable.
    }
  }, [apiFetch]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem(STORAGE_KEY);
        if (!raw) {
          return;
        }

        const session: Session = JSON.parse(raw);
        tokenRef.current = session.token;
        setUser(session.user);
        setMembership(DEFAULT_MEMBERSHIP);
        await refreshProfile();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshProfile]);

  const signUp = async (email: string, password: string, payload?: SignUpPayload): Promise<SignUpResult> => {
    try {
      const res = await tryAuthRequest("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: payload?.fullName,
          phoneNumber: payload?.phoneNumber,
          company: payload?.company,
          designation: payload?.designation,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { error: data.message ?? data.error ?? "Signup failed" };
      }

      const nextProfile = normalizeProfile(data.user);
      await saveSession({
        user: { id: nextProfile.id, email: data.user.email },
        token: data.token,
      });
      setProfile(nextProfile);
      return {};
    } catch (error) {
      console.error("[AuthContext.signUp] Signup request failed", error);
      return { error: getNetworkErrorMessage(`${API_BASE}/signup`, error) };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const res = await tryAuthRequest("/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { error: data.message ?? data.error ?? "Login failed" };
      }

      const nextProfile = normalizeProfile(data.user);
      await saveSession({
        user: { id: nextProfile.id, email: data.user.email },
        token: data.token,
      });
      setProfile(nextProfile);
      return {};
    } catch (error) {
      console.error("[AuthContext.signIn] Signin request failed", error);
      return { error: getNetworkErrorMessage(`${API_BASE}/signin`, error) };
    }
  };

  const signOut = async () => {
    await clearSession();
  };

  const createProfile = async (data: Omit<Profile, "id" | "is_verified" | "created_at">): Promise<{ error?: string }> => {
    return updateProfile(data);
  };

  const updateProfile = async (data: Partial<Profile>): Promise<{ error?: string }> => {
    if (!tokenRef.current) {
      return { error: "Not authenticated" };
    }

    try {
      const res = await apiFetch("/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (!res.ok) {
        return { error: result.message ?? "Update failed" };
      }

      setProfile(normalizeProfile(result.user));
      return {};
    } catch (error) {
      return { error: `Error: ${error}` };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        membership,
        isLoading,
        isAuthenticated: !!user,
        signUp,
        signIn,
        signOut,
        createProfile,
        updateProfile,
        refreshProfile,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
