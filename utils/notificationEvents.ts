export type NotificationEventType = "signup_welcome" | "connection_request" | "direct_message";

type ApiFetch = (path: string, options?: RequestInit) => Promise<Response>;

export async function recordNotificationEvent(
  apiFetch: ApiFetch,
  event: {
    type: NotificationEventType;
    recipientId: string;
    actorId?: string | null;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }
) {
  try {
    const res = await apiFetch("/push_notification_events", {
      method: "POST",
      body: JSON.stringify({
        type: event.type,
        recipient_id: event.recipientId,
        actor_id: event.actorId ?? null,
        title: event.title,
        body: event.body,
        data: event.data ?? {},
      }),
    });

    if (!res.ok) {
      console.warn("[notifications] Could not record notification event.", await res.text());
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[notifications] Event recording failed.", error);
    return false;
  }
}
