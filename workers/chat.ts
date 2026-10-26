import { buildSystemPrompt, CHAT_MODEL, MAX_MESSAGE_CHARS, MAX_MESSAGES, type ChatMessage } from '../src/lib/chat';

/** Chats allowed per UTC day across all visitors, so a flood cannot burn the Workers AI allowance. */
const DAILY_CAP = 300;
const MAX_ANSWER_TOKENS = 300;

// Everything Hayden wants the assistant to know. It is small enough to send whole with every question.
const files = import.meta.glob('../knowledge/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const KNOWLEDGE = Object.keys(files)
  .sort()
  .map((path) => files[path].replace(/<!--[\s\S]*?-->/g, '').trim())
  .join('\n\n');
const SYSTEM_PROMPT = buildSystemPrompt(KNOWLEDGE);

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function parseMessages(body: unknown): ChatMessage[] | null {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw)) return null;
  const messages = raw.slice(-MAX_MESSAGES).map((m) => ({
    role: m?.role === 'assistant' ? ('assistant' as const) : ('user' as const),
    content: String(m?.content ?? '').slice(0, MAX_MESSAGE_CHARS),
  }));
  const last = messages.at(-1);
  return last?.role === 'user' && last.content.trim() ? messages : null;
}

/** Counts this chat against today's cap. KV is eventually consistent, so the cap can overshoot slightly. */
async function underDailyCap(env: Env) {
  const key = `chats:${new Date().toISOString().slice(0, 10)}`;
  const used = Number((await env.CHAT_KV.get(key)) ?? 0);
  if (used >= DAILY_CAP) return false;
  await env.CHAT_KV.put(key, String(used + 1), { expirationTtl: 60 * 60 * 48 });
  return true;
}

export async function handleChat(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const { success } = await env.CHAT_LIMITER.limit({ key: ip });
  if (!success) return json({ error: 'Too many messages. Try again in a minute.' }, 429);

  const messages = parseMessages(await request.json().catch(() => null));
  if (!messages) return json({ error: 'Send a non-empty question.' }, 400);

  if (!(await underDailyCap(env))) return json({ error: 'The chat is resting for today.', resting: true }, 503);

  try {
    const answer = (await env.AI.run(CHAT_MODEL, {
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      stream: true,
      max_tokens: MAX_ANSWER_TOKENS,
    })) as unknown as ReadableStream<Uint8Array>;

    return new Response(answer, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('chat failed', err);
    return json({ error: 'The assistant is unavailable right now.' }, 502);
  }
}
