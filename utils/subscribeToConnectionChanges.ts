import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../constants/supabase";

type ConnectionRecord = {
  requester_id?: string;
  receiver_id?: string;
};

function extractConnectionRecord(message: any): ConnectionRecord | null {
  if (message?.event !== "postgres_changes") return null;

  const payload = message.payload?.data ?? message.payload ?? {};

  return (
    payload.record ??
    payload.old_record ??
    payload.new ??
    payload.old ??
    null
  );
}

export function subscribeToConnectionChanges(userId: string, onChange: () => void) {
  const wsUrl = `${SUPABASE_URL}/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`
    .replace("https://", "wss://")
    .replace("http://", "ws://");

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        topic: `realtime:connections_watch:${userId}`,
        event: "phx_join",
        payload: {
          config: {
            broadcast: { self: false },
            presence: { key: "" },
            postgres_changes: [
              {
                event: "*",
                schema: "public",
                table: "connections",
              },
            ],
          },
        },
        ref: "1",
      })
    );
  };

  ws.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      const record = extractConnectionRecord(parsed);

      if (record && (record.requester_id === userId || record.receiver_id === userId)) {
        onChange();
      }
    } catch {
      // Ignore malformed realtime messages.
    }
  };

  ws.onerror = () => {};
  ws.onclose = () => {};

  return () => {
    ws.close();
  };
}
