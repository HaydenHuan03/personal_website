export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StreamHandlers {
  onToken: (token: string) => void;
}

/** Posts the conversation to /api/chat and reads the server-sent events it streams back. */
export async function streamChat(messages: ChatMessage[], handlers: StreamHandlers, signal: AbortSignal) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!res.ok || !res.body) {
    const error = await res.json().then((b) => (b as { error?: string }).error).catch(() => undefined);
    throw new Error(error ?? 'Something went wrong. Please try again.');
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
      const event = JSON.parse(line.slice(6)) as { response?: string };
      if (event.response) handlers.onToken(event.response);
    }
  }
}
