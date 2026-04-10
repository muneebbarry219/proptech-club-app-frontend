import { SUPABASE_URL } from "../constants/supabase";

const PUBLIC_ARTICLES_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/articles/`;

function extractArticlesObjectPath(value: string) {
  const normalized = value.trim();

  if (!normalized) return null;

  const storageMarker = "/storage/v1/object/";
  const storageIndex = normalized.indexOf(storageMarker);

  if (storageIndex >= 0) {
    const storagePath = normalized.slice(storageIndex + storageMarker.length);
    const publicPrefix = "public/";
    const withoutPublicPrefix = storagePath.startsWith(publicPrefix)
      ? storagePath.slice(publicPrefix.length)
      : storagePath;

    if (withoutPublicPrefix.startsWith("articles/")) {
      return withoutPublicPrefix.slice("articles/".length).split("?")[0];
    }
  }

  if (normalized.startsWith("articles/")) {
    return normalized.slice("articles/".length).split("?")[0];
  }

  if (!normalized.startsWith("http")) {
    return normalized.split("?")[0];
  }

  return null;
}

export function getArticleCoverUrl(value?: string | null) {
  if (!value) return null;

  const objectPath = extractArticlesObjectPath(value);
  if (objectPath) {
    return `${PUBLIC_ARTICLES_PREFIX}${objectPath}`;
  }

  return value;
}
