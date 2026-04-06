import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../constants/supabase";
import * as FileSystem from "expo-file-system/legacy";

const STORAGE_URL = `${SUPABASE_URL}/storage/v1`;

function normalizeExtension(localUri: string) {
  const cleanUri = localUri.split("?")[0];
  const ext = cleanUri.split(".").pop()?.toLowerCase();

  if (ext === "png") return { ext: "png", mimeType: "image/png" };
  if (ext === "webp") return { ext: "webp", mimeType: "image/webp" };
  return { ext: "jpg", mimeType: "image/jpeg" };
}

async function uploadToBucket(
  bucket: string,
  fileName: string,
  localUri: string,
  accessToken: string
) {
  const { mimeType } = normalizeExtension(localUri);

  try {
    const result = await FileSystem.uploadAsync(
      `${STORAGE_URL}/object/${bucket}/${fileName}`,
      localUri,
      {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          "Content-Type": mimeType,
          Authorization: `Bearer ${accessToken}`,
          apikey: SUPABASE_ANON_KEY,
          "x-upsert": "true",
        },
      }
    );

    if (!result || result.status < 200 || result.status >= 300) {
      console.warn(`[uploadToBucket] upload failed:`, result?.body);
      return null;
    }

    return `${STORAGE_URL}/object/public/${bucket}/${fileName}`;
  } catch (error) {
    console.warn("[uploadToBucket] error:", error);
    return null;
  }
}

/**
 * Uploads a local image URI to Supabase Storage avatars bucket.
 * Returns the public URL of the uploaded image, or null on failure.
 */
export async function uploadAvatar(
  localUri: string,
  userId: string,
  accessToken: string
): Promise<string | null> {
  try {
    const { ext } = normalizeExtension(localUri);
    const fileName = `${userId}/avatar.${ext}`;
    return await uploadToBucket("avatars", fileName, localUri, accessToken);
  } catch (e) {
    console.warn("[uploadAvatar] error:", e);
    return null;
  }
}

/**
 * Uploads a local image URI to Supabase Storage article-covers bucket.
 * Returns the public URL, or null on failure.
 */
export async function uploadArticleCover(
  localUri: string,
  articleId: string,
  accessToken: string
): Promise<string | null> {
  try {
    const { ext } = normalizeExtension(localUri);
    const fileName = `${articleId}/cover.${ext}`;
    return await uploadToBucket("article-covers", fileName, localUri, accessToken);
  } catch (e) {
    console.warn("[uploadArticleCover] error:", e);
    return null;
  }
}
