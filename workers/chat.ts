import { CHAT_MODEL, EMBEDDING_MODEL, type ChunkMetadata } from '../src/lib/rag';

const TOP_K = 5;
const MIN_SCORE = 0.3;
const MAX_ANSWER_TOKENS = 700;
const MAX_MESSAGES = 6;
const MAX_MESSAGE_CHARS = 500;
const MAX_BODY_BYTES = 10_000;

const SYSTEM_PROMPT = `You answer questions about Hayden Huan on his portfolio site, for recruiters and other visitors.
Use only the context below. If it does not contain the answer, say you don't have that information about Hayden and suggest contacting him directly. Do not guess or invent details.
Refer to Hayden in the third person. Answer with the specific details from the context, not a one-line summary: for a role, give the company, dates, what Hayden built and the technologies he used; for a project, what it does, how he built it and the stack. For broad questions (his experience, projects or skills), cover each relevant item in the context with its key details, one short paragraph per item. Decline requests that are not about Hayden, his work, or his background. Wrap key skills, technologies and employers in **double asterisks** to bold them. Use no other markdown (no bullets, headings or links). Hayden's email, resume and GitHub are shown as buttons under your reply when you mention them in a sentence (e.g. "you can email Hayden or view his resume"). Never list them as separate lines like "Email: ..." or write out addresses or URLs.`;

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

  // Browsers always send Origin on POST, so this blocks other sites; a script can still fake it.
  const origin = request.headers.get('Origin') ?? '';
  if (origin !== 'https://haydenhuan.com' && !origin.startsWith('http://localhost:')) return json({ error: 'Forbidden' }, 403);

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const { success } = await env.CHAT_LIMITER.limit({ key: ip });
  if (!success) return json({ error: 'Too many messages. Try again in a minute.' }, 429);
  // Caps total model calls across all visitors so a crowd or many IPs can't drain the AI quota.
  const global = await env.CHAT_GLOBAL_LIMITER.limit({ key: 'global' });
  if (!global.success) return json({ error: 'The assistant is busy right now. Try again in a minute.' }, 429);

  // Stops a huge body being parsed; a chunked upload sends no length and gets past this.
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) return json({ error: 'Message too large.' }, 413);

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
