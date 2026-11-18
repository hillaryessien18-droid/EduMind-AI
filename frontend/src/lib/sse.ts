import { API_URL, refreshAccessToken, tokens } from "./api";

export interface SSEHandlers {
  onDelta: (text: string) => void;
  onDone: (data: { message: unknown; title: string }) => void;
  onError: (detail: string) => void;
}

/** Parse a Server-Sent Events byte stream into (event, data) pairs. */
export function parseSSE(buffer: string): { events: { event: string; data: string }[]; rest: string } {
  const events: { event: string; data: string }[] = [];
  const blocks = buffer.split("\n\n");
  const rest = blocks.pop() ?? "";
  for (const block of blocks) {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trim());
    }
    if (data.length) events.push({ event, data: data.join("\n") });
  }
  return { events, rest };
}

/** POST a message and stream the tutor's reply. Uses fetch because axios can't stream in browsers. */
export async function streamTutorReply(conversationId: number, content: string, handlers: SSEHandlers, signal?: AbortSignal) {
  const send = () =>
    fetch(`${API_URL}/tutor/conversations/${conversationId}/messages/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens.access ?? ""}` },
      body: JSON.stringify({ content }),
      signal,
    });

  let res = await send();
  if (res.status === 401 && (await refreshAccessToken())) res = await send();

  if (!res.ok || !res.body) {
    let detail = "The tutor couldn't respond. Please try again.";
    try { detail = (await res.json()).detail ?? detail; } catch { /* not JSON */ }
    handlers.onError(detail);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseSSE(buffer);
    buffer = rest;
    for (const { event, data } of events) {
      const payload = JSON.parse(data);
      if (event === "delta") handlers.onDelta(payload.text);
      else if (event === "done") handlers.onDone(payload);
      else if (event === "error") handlers.onError(payload.detail);
    }
  }
}
