import { CHAT_MODEL, EMBEDDING_MODEL, type ChunkMetadata } from '../src/lib/rag';

const TOP_K = 5;
const MIN_SCORE = 0.3; // lenient: short questions score low against long chunks. Tune against real scores.
const MAX_ANSWER_TOKENS = 400;
const MAX_MESSAGES = 6;
const MAX_MESSAGE_CHARS = 500;

const SYSTEM_PROMPT = `You answer questions about Hayden Huan on his portfolio site, for recruiters and other visitors.
Use only the context below. If it does not contain the answer, say you don't have that information about Hayden and suggest contacting him directly. Do not guess or invent details.
Refer to Hayden in the third person. Keep answers short and plain. Decline requests that are not about Hayden, his work, or his background.`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function parseMessages(body: unknown): Message[] | null {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const messages = raw.slice(-MAX_MESSAGES).map((m) => ({
    role: m?.role === 'assistant' ? ('assistant' as const) : ('user' as const),
    content: String(m?.content ?? '').slice(0, MAX_MESSAGE_CHARS),
  }));
  return messages.at(-1)?.role === 'user' && messages.at(-1)!.content.trim() ? messages : null;
}

async function retrieve(env: Env, messages: Message[]): Promise<ChunkMetadata[]> {
  // The last two user turns, so a follow-up like "what did he build there?" still finds its topic.
  const query = messages
    .filter((m) => m.role === 'user')
    .slice(-2)
    .map((m) => m.content)
    .join('\n');
  const embedding = (await env.AI.run(EMBEDDING_MODEL, { text: [query] })) as { data: number[][] };
  const { matches } = await env.VECTORIZE.query(embedding.data[0], { topK: TOP_K, returnMetadata: 'all' });
  return matches
    .filter((m) => m.score >= MIN_SCORE)
    .map((m) => m.metadata as unknown as ChunkMetadata);
}

export async function handleChat(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const { success } = await env.CHAT_LIMITER.limit({ key: ip });
  if (!success) return json({ error: 'Too many messages. Try again in a minute.' }, 429);

  const messages = parseMessages(await request.json().catch(() => null));
  if (!messages) return json({ error: 'Send a non-empty question.' }, 400);

  try {
    const chunks = await retrieve(env, messages);
    const context = chunks.length ? chunks.map((c) => c.text).join('\n\n---\n\n') : '(nothing relevant found)';
    const answer = (await env.AI.run(CHAT_MODEL, {
      messages: [{ role: 'system', content: `${SYSTEM_PROMPT}\n\nContext:\n${context}` }, ...messages],
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
