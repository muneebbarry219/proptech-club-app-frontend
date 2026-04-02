import {
  createContext, useContext, useState,
  useEffect, useRef, useCallback, type ReactNode,
} from "react";
import { storage } from "../utils/storage";
import { SUPABASE_URL, SUPABASE_ANON_KEY, AUTH_URL, DB_URL } from "../constants/supabase";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type UserRole     = "developer" | "investor" | "broker" | "architect" | "tech";
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

interface StoredSession {
  user: { id: string; email: string };
  access_token: string;
  refresh_token: string;
}

interface AuthContextType {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  membership: Membership | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  createProfile: (data: Omit<Profile, "id" | "is_verified" | "created_at">) => Promise<{ error?: string }>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
  getAccessToken: () => string | null;
}

// ─────────────────────────────────────────────────────────────
// Storage key
// ─────────────────────────────────────────────────────────────

const SESSION_KEY = "proptech_club_session_v2";

// ─────────────────────────────────────────────────────────────
// Supabase auth helpers
// ─────────────────────────────────────────────────────────────

const authHeaders = {
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
};

function logBackendPayload(url: string, method: string, body?: unknown) {
  if (body === undefined) return;
  console.log("[Backend Payload]", { method, url, body });
}

async function supabaseSignUp(email: string, password: string) {
  const payload = { email, password };
  logBackendPayload(`${AUTH_URL}/signup`, "POST", payload);
  const res = await fetch(`${AUTH_URL}/signup`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(payload),
  });
  return { res, data: await res.json() };
}

async function supabaseSignIn(email: string, password: string) {
  const payload = { email, password };
  logBackendPayload(`${AUTH_URL}/token?grant_type=password`, "POST", payload);
  const res = await fetch(`${AUTH_URL}/token?grant_type=password`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(payload),
  });
  return { res, data: await res.json() };
}

async function supabaseRefresh(refresh_token: string) {
  const payload = { refresh_token };
  logBackendPayload(`${AUTH_URL}/token?grant_type=refresh_token`, "POST", payload);
  const res = await fetch(`${AUTH_URL}/token?grant_type=refresh_token`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(payload),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token
    ? { access_token: data.access_token, refresh_token: data.refresh_token }
    : null;
}

// ─────────────────────────────────────────────────────────────
// DB helpers — direct Supabase REST calls
// ─────────────────────────────────────────────────────────────

function dbHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    Prefer: "return=representation",
  };
}

async function fetchProfile(userId: string, token: string): Promise<Profile | null> {
  const res = await fetch(`${DB_URL}/profiles?id=eq.${userId}&select=*`, {
    headers: dbHeaders(token),
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] ?? null;
}

async function fetchMembership(userId: string, token: string): Promise<Membership | null> {
  const res = await fetch(
    `${DB_URL}/memberships?user_id=eq.${userId}&select=tier,status,expires_at&limit=1`,
    { headers: dbHeaders(token) }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] ?? null;
}

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,       setUser]       = useState<{ id: string; email: string } | null>(null);
  const [profile,    setProfile]    = useState<Profile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);

  const atRef = useRef<string | null>(null); // access token ref for sync access
  const rtRef = useRef<string | null>(null); // refresh token ref

  // ── Persist session ─────────────────────────────────────────

  const saveSession = async (session: StoredSession) => {
    atRef.current = session.access_token;
    rtRef.current = session.refresh_token;
    setUser(session.user);
    await storage.setItem(SESSION_KEY, JSON.stringify(session));
  };

  const clearSession = async () => {
    atRef.current = null;
    rtRef.current = null;
    setUser(null);
    setProfile(null);
    setMembership(null);
    await storage.removeItem(SESSION_KEY);
  };

  // ── Load user data (profile + membership) ───────────────────

  const loadUserData = async (userId: string, token: string) => {
    const [p, m] = await Promise.all([
      fetchProfile(userId, token),
      fetchMembership(userId, token),
    ]);
    if (p) setProfile(p);
    if (m) setMembership(m);
    else setMembership({ tier: "free", status: "active", expires_at: null });
  };

  // ── Restore session on app launch ───────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem(SESSION_KEY);
        if (!raw) return;

        const session: StoredSession = JSON.parse(raw);

        // Always refresh token on launch to get a fresh one
        const refreshed = await supabaseRefresh(session.refresh_token);
        const token = refreshed?.access_token ?? session.access_token;
        const rt    = refreshed?.refresh_token ?? session.refresh_token;

        atRef.current = token;
        rtRef.current = rt;
        setUser(session.user);

        // Update stored session with fresh tokens
        await storage.setItem(SESSION_KEY, JSON.stringify({
          ...session,
          access_token: token,
          refresh_token: rt,
        }));

        await loadUserData(session.user.id, token);
      } catch (e) {
        console.warn("[AuthContext] Failed to restore session", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── apiFetch — authenticated Supabase REST calls ─────────────

  const apiFetch = useCallback(async (path: string, options?: RequestInit): Promise<Response> => {
    const token = atRef.current;
    if (!token) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    const makeReq = (tok: string) =>
      (logBackendPayload(`${DB_URL}${path}`, options?.method ?? "GET", options?.body),
      fetch(`${DB_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${tok}`,
          Prefer: "return=representation",
          ...(options?.headers ?? {}),
        },
      }));

    let res = await makeReq(token);

    // Token expired — try one silent refresh
    if (res.status === 401 && rtRef.current) {
      const refreshed = await supabaseRefresh(rtRef.current);
      if (refreshed) {
        atRef.current = refreshed.access_token;
        rtRef.current = refreshed.refresh_token;
        res = await makeReq(refreshed.access_token);
      } else {
        await clearSession();
      }
    }

    return res;
  }, []);

  // ── Public auth actions ──────────────────────────────────────

  const signUp = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { res, data } = await supabaseSignUp(email, password);
      if (!res.ok) {
        return { error: data.error_description ?? data.msg ?? "Sign up failed" };
      }
      const session: StoredSession = {
        user: { id: data.user.id, email: data.user.email },
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      };
      await saveSession(session);
      return {};
    } catch (e) {
      return { error: "Network error. Please check your connection." };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { res, data } = await supabaseSignIn(email, password);
      if (!res.ok) {
        return { error: data.error_description ?? data.msg ?? "Sign in failed" };
      }
      const session: StoredSession = {
        user: { id: data.user.id, email: data.user.email },
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      };
      await saveSession(session);
      await loadUserData(data.user.id, data.access_token);
      return {};
    } catch (e) {
      return { error: "Network error. Please check your connection." };
    }
  };

  const signOut = async () => {
    await clearSession();
  };

  const createProfile = async (
    data: Omit<Profile, "id" | "is_verified" | "created_at">
  ): Promise<{ error?: string }> => {
    if (!user || !atRef.current) return { error: "Not authenticated" };
    try {
      const res = await apiFetch("/profiles", {
        method: "POST",
        body: JSON.stringify({ id: user.id, ...data, is_verified: false }),
      });
      const result = await res.json();
      if (!res.ok) {
        return { error: result[0]?.message ?? result.message ?? "Failed to create profile" };
      }
      const created = Array.isArray(result) ? result[0] : result;
      setProfile(created);
      setMembership({ tier: "free", status: "active", expires_at: null });
      return {};
    } catch (e) {
      return { error: `Error: ${e}` };
    }
  };

  const updateProfile = async (data: Partial<Profile>): Promise<{ error?: string }> => {
    if (!user || !atRef.current) return { error: "Not authenticated" };
    try {
      const payload = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined)
      );

      console.log("[AuthContext] updateProfile payload:", payload);

      const res = await apiFetch(`/profiles?id=eq.${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        console.error("[AuthContext] updateProfile failed:", result);
        return { error: result[0]?.message ?? "Update failed" };
      }

      const updated = Array.isArray(result) ? result[0] : result;
      console.log("[AuthContext] updateProfile patch response:", updated);

      // Verify by reading latest profile from Supabase immediately after patch.
      const latest = await fetchProfile(user.id, atRef.current);
      if (latest) {
        setProfile(latest);
        console.log("[AuthContext] updateProfile verified with fresh DB read:", latest);
      } else {
        // Fallback to patch response if fresh read fails.
        setProfile(updated);
        console.warn("[AuthContext] updateProfile patched but fresh DB read failed; using patch response.");
      }

      return {};
    } catch (e) {
      console.error("[AuthContext] updateProfile exception:", e);
      return { error: `Error: ${e}` };
    }
  };

  const refreshProfile = async () => {
    if (!user || !atRef.current) return;
    await loadUserData(user.id, atRef.current);
  };

  return (
    <AuthContext.Provider value={{
      user, profile, membership,
      isLoading, isAuthenticated: !!user,
      signUp, signIn, signOut,
      createProfile, updateProfile, refreshProfile,
      apiFetch,
      getAccessToken: () => atRef.current,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
