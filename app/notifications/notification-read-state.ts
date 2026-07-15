import { storage } from "../../utils/storage";

export interface ConnectionNotificationSnapshotRecord {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined";
}

function notificationSeenKey(userId: string) {
  return `proptech_notifications_seen_at_${userId}`;
}

function notificationSnapshotKey(userId: string) {
  return `proptech_notifications_connection_snapshot_${userId}`;
}

function notificationReadKeysKey(userId: string) {
  return `proptech_notifications_read_keys_${userId}`;
}

export function connectionNotificationSnapshot(records: ConnectionNotificationSnapshotRecord[]) {
  return records
    .filter((record) => record.status !== "pending" || Boolean(record.receiver_id))
    .map((record) => `${record.id}:${record.requester_id}:${record.receiver_id}:${record.status}`)
    .sort()
    .join("|");
}

export async function getNotificationsSeenAt(userId: string) {
  const raw = await storage.getItem(notificationSeenKey(userId));
  const seenAt = raw ? Number(raw) : 0;
  return Number.isFinite(seenAt) ? seenAt : 0;
}

export async function getSeenConnectionNotificationSnapshot(userId: string) {
  return (await storage.getItem(notificationSnapshotKey(userId))) ?? "";
}

export async function getReadNotificationKeys(userId: string) {
  const raw = await storage.getItem(notificationReadKeysKey(userId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function markNotificationKeysRead(userId: string, notificationKeys: string[]) {
  if (!notificationKeys.length) return;

  const current = await getReadNotificationKeys(userId);
  const next = Array.from(new Set([...current, ...notificationKeys]));
  await storage.setItem(notificationReadKeysKey(userId), JSON.stringify(next));
}

export async function markNotificationsOpened(
  userId: string,
  connectionRecords: ConnectionNotificationSnapshotRecord[] = []
) {
  await storage.setItem(notificationSeenKey(userId), String(Date.now()));
  await storage.setItem(notificationSnapshotKey(userId), connectionNotificationSnapshot(connectionRecords));
}
