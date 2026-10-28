import type { ChatMessage } from '@/lib/chat';

export class ChatError extends Error {
  constructor(message: string, readonly resting = false) {
    super(message);
  }
}

/** Posts the conversation to /api/chat and reads the server-sent events it streams back. */
export async function streamChat(messages: ChatMessage[], onToken: (token: string) => void, signal: AbortSignal) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; resting?: boolean };
    throw new ChatError(body.error ?? 'Something went wrong. Please try again.', body.resting);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += value;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
      try {
        const event = JSON.parse(line.slice(6)) as { response?: string };
        if (event.response) onToken(event.response);
      } catch {
        // A malformed event is skipped; the next one carries on the reply.
      }
    }
  }
}
