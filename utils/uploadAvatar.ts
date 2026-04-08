import * as FileSystem from "expo-file-system/legacy";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../constants/supabase";

const STORAGE_URL = `${SUPABASE_URL}/storage/v1`;

function getMime(uri: string): { ext: string; mimeType: string } {
  const clean = uri.split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return { ext: "png", mimeType: "image/png" };
  if (clean.endsWith(".webp")) return { ext: "webp", mimeType: "image/webp" };
  return { ext: "jpg", mimeType: "image/jpeg" };
}

async function uploadFileToSupabase(
  localUri: string,
  mimeType: string,
  bucket: string,
  fileName: string,
  accessToken: string
): Promise<string | null> {
  try {
    const uploadUrl = `${STORAGE_URL}/object/${bucket}/${fileName}`;

    const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
      httpMethod: "POST",
      uploadType: 1,
      headers: {
        "Content-Type": mimeType,
        "Authorization": `Bearer ${accessToken}`,
        "apikey": SUPABASE_ANON_KEY,
        "x-upsert": "true",
      },
    });

    if (result.status < 200 || result.status >= 300) {
      console.warn(`[upload] ${bucket}/${fileName} failed (${result.status}):`, result.body);
      return null;
    }

    return `${STORAGE_URL}/object/public/${bucket}/${fileName}`;
  } catch (e) {
    console.warn("[upload] error:", e);
    return null;
  }
}

// ── Public functions ───────────────────────────────────────────
// All accept localUri (file:// path from ImagePicker) directly

export async function uploadAvatar(
  localUri: string,
  userId: string,
  accessToken: string
): Promise<string | null> {
  const { ext, mimeType } = getMime(localUri);
  return uploadFileToSupabase(localUri, mimeType, "avatars", `${userId}/avatar.${ext}`, accessToken);
}

export async function uploadArticleCover(
  localUri: string,
  articleId: string,
  accessToken: string
): Promise<string | null> {
  const { ext, mimeType } = getMime(localUri);
  return uploadFileToSupabase(localUri, mimeType, "articles", `${articleId}/cover.${ext}`, accessToken);
}

export async function uploadEventCover(
  localUri: string,
  eventId: string,
  accessToken: string
): Promise<string | null> {
  const { ext, mimeType } = getMime(localUri);
  return uploadFileToSupabase(localUri, mimeType, "event-gallery", `${eventId}/cover.${ext}`, accessToken);
}

export async function uploadEventGalleryImage(
  localUri: string,
  eventId: string,
  imageId: string,
  accessToken: string
): Promise<string | null> {
  const { ext, mimeType } = getMime(localUri);
  return uploadFileToSupabase(localUri, mimeType, "event-gallery", `${eventId}/${imageId}.${ext}`, accessToken);
}
