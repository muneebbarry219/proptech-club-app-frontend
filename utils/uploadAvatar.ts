import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../constants/supabase";

const STORAGE_URL = `${SUPABASE_URL}/storage/v1`;

function getMime(localUri: string): { ext: string; mimeType: string } {
  const clean = localUri.split("?")[0].toLowerCase();
  if (clean.endsWith(".png"))  return { ext: "png",  mimeType: "image/png" };
  if (clean.endsWith(".webp")) return { ext: "webp", mimeType: "image/webp" };
  return { ext: "jpg", mimeType: "image/jpeg" };
}

function decodeBase64(base64: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup: number[] = new Array(256).fill(0);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  const len    = base64.length;
  const bytes  = Math.floor((len * 3) / 4)
    - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  const result = new Uint8Array(bytes);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const a = lookup[base64.charCodeAt(i)];
    const b = lookup[base64.charCodeAt(i + 1)];
    const c = lookup[base64.charCodeAt(i + 2)];
    const d = lookup[base64.charCodeAt(i + 3)];
    if (p < bytes) result[p++] = (a << 2) | (b >> 4);
    if (p < bytes) result[p++] = ((b & 15) << 4) | (c >> 2);
    if (p < bytes) result[p++] = ((c & 3) << 6) | d;
  }
  return result;
}

async function uploadBase64(
  base64: string,
  mimeType: string,
  bucket: string,
  fileName: string,
  accessToken: string
): Promise<string | null> {
  try {
    const binary = Uint8Array.from(decodeBase64(base64));
    const body = new Blob([binary], { type: mimeType });

    const res = await fetch(`${STORAGE_URL}/object/${bucket}/${fileName}`, {
      method: "POST",
      headers: {
        "Content-Type":  mimeType,
        "Authorization": `Bearer ${accessToken}`,
        "apikey":        SUPABASE_ANON_KEY,
        "x-upsert":      "true",
      },
      body,
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn(`[upload] ${bucket}/${fileName} failed (${res.status}):`, err);
      return null;
    }

    // Clean permanent public URL — no cache busting, no encoding issues
    return `${STORAGE_URL}/object/public/${bucket}/${fileName}`;
  } catch (e) {
    console.warn("[upload] error:", e);
    return null;
  }
}

// Upload avatar — accepts base64 string from ImagePicker
export async function uploadAvatar(
  base64: string,
  userId: string,
  accessToken: string,
  mimeType = "image/jpeg"
): Promise<string | null> {
  const ext = mimeType.includes("png") ? "png" : "jpg";
  return uploadBase64(base64, mimeType, "avatars", `${userId}/avatar.${ext}`, accessToken);
}

export async function uploadArticleCover(
  base64: string,
  articleId: string,
  accessToken: string,
  mimeType = "image/jpeg"
): Promise<string | null> {
  const ext = mimeType.includes("png") ? "png" : "jpg";
  return uploadBase64(base64, mimeType, "articles", `${articleId}/cover.${ext}`, accessToken);
}

export async function uploadEventCover(
  base64: string,
  eventId: string,
  accessToken: string,
  mimeType = "image/jpeg"
): Promise<string | null> {
  const ext = mimeType.includes("png") ? "png" : "jpg";
  return uploadBase64(base64, mimeType, "event-gallery", `${eventId}/cover.${ext}`, accessToken);
}

export async function uploadEventGalleryImage(
  base64: string,
  eventId: string,
  imageId: string,
  accessToken: string,
  mimeType = "image/jpeg"
): Promise<string | null> {
  const ext = mimeType.includes("png") ? "png" : "jpg";
  return uploadBase64(base64, mimeType, "event-gallery", `${eventId}/${imageId}.${ext}`, accessToken);
}
