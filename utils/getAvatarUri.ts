export function getAvatarUri(avatarUrl?: string | null, updatedAt?: string | null) {
  if (!avatarUrl) return null;

  const stamp = updatedAt ?? "1";
  return avatarUrl.includes("?")
    ? `${avatarUrl}&t=${encodeURIComponent(stamp)}`
    : `${avatarUrl}?t=${encodeURIComponent(stamp)}`;
}
