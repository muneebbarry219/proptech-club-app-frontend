// ─────────────────────────────────────────────────────────────
// Supabase config — replaces the old Express backend entirely
// ─────────────────────────────────────────────────────────────

export const SUPABASE_URL      = "https://hybafmqgclroqcdxdolq.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_Rabs3lMHWr_7yvI0_W3rSg_vn3UVz38";

// Supabase service endpoints
export const AUTH_URL = `${SUPABASE_URL}/auth/v1`;
export const DB_URL   = `${SUPABASE_URL}/rest/v1`;
