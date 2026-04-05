import { storage } from "./storage";

export interface PendingSignupDraft {
  fullName: string;
  whatsapp: string;
  email: string;
  password: string;
}

const PENDING_SIGNUP_KEY = "proptech_pending_signup_v1";

export async function getPendingSignupDraft(): Promise<PendingSignupDraft | null> {
  const raw = await storage.getItem(PENDING_SIGNUP_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PendingSignupDraft;
  } catch (error) {
    console.warn("[pending-signup] Failed to parse draft.", error);
    await clearPendingSignupDraft();
    return null;
  }
}

export async function setPendingSignupDraft(draft: PendingSignupDraft) {
  await storage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(draft));
}

export async function clearPendingSignupDraft() {
  await storage.removeItem(PENDING_SIGNUP_KEY);
}
