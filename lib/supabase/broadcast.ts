import "server-only";
import { supabaseAdmin } from "./admin";

// Send a curated Realtime Broadcast to a per-session topic from the server,
// using the secret-key client. Big screens subscribe to these topics with the
// publishable key and re-render. `channel.send()` on an unsubscribed channel
// posts over HTTP, so this works fine from a stateless Route Handler.
export async function broadcast(
  topic: string,
  event: string,
  payload: unknown
): Promise<void> {
  const channel = supabaseAdmin().channel(topic, {
    config: { broadcast: { ack: false } },
  });
  try {
    await channel.send({ type: "broadcast", event, payload });
  } finally {
    await supabaseAdmin().removeChannel(channel);
  }
}

export const revealTopic = (sessionId: string) => `reveal:${sessionId}`;
export const showcaseTopic = (sessionId: string) => `showcase:${sessionId}`;
