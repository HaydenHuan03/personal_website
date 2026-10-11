import { readdir } from 'node:fs/promises';
import { projects } from '../src/data/projects';
import { EMBEDDING_MODEL } from '../src/lib/rag';
import { chunkMarkdown, type Chunk } from './lib/chunk';

const INDEX = 'personal-website-rag';
const KNOWLEDGE_DIR = new URL('../knowledge/', import.meta.url).pathname;
const BATCH = 20;

const dryRun = process.argv.includes('--dry-run');
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!dryRun && (!account || !token)) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Workers AI + Vectorize edit), or pass --dry-run.');
  process.exit(1);
}

const api = `https://api.cloudflare.com/client/v4/accounts/${account}`;
const headers = { Authorization: `Bearer ${token}` };

const plain = (s: string) => s.replace(/\*\*/g, '');

async function loadChunks(): Promise<Chunk[]> {
  const chunks: Chunk[] = [];
  for (const name of (await readdir(KNOWLEDGE_DIR)).filter((f) => f.endsWith('.md')).sort()) {
    const markdown = await Bun.file(KNOWLEDGE_DIR + name).text();
    chunks.push(...chunkMarkdown(name.replace(/\.md$/, ''), markdown));
  }
  for (const p of projects) {
    const source = `Project - ${p.title}`;
    const text = [
      `${source} (${p.date}): ${p.description}`,
      `Tech: ${p.tech.join(', ')}`,
      ...p.highlights.map((h) => `- ${plain(h)}`),
    ].join('\n');
    chunks.push({ id: `project-${p.slug}`, source, text });
  }
  return chunks;
}

async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${api}/ai/run/${EMBEDDING_MODEL}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: texts }),
  });
  const json = (await res.json()) as { success: boolean; result?: { data: number[][] }; errors?: unknown };
  if (!res.ok || !json.success || !json.result) {
    throw new Error(`Embedding failed: ${res.status} ${JSON.stringify(json.errors)}`);
  }
  return json.result.data;
}

async function upsert(rows: object[]) {
  const res = await fetch(`${api}/vectorize/v2/indexes/${INDEX}/upsert`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-ndjson' },
    body: rows.map((r) => JSON.stringify(r)).join('\n'),
  });
  if (!res.ok) throw new Error(`Upsert failed: ${res.status} ${await res.text()}`);
}

// Ids are positional, so a removed or shortened section leaves its old vector behind. Run after the upsert and drop anything not in this run.
async function deleteStale(keep: Set<string>) {
  const stale: string[] = [];
  let cursor: string | undefined;
  do {
    const res = await fetch(`${api}/vectorize/v2/indexes/${INDEX}/list?count=1000${cursor ? `&cursor=${cursor}` : ''}`, { headers });
    const json = (await res.json()) as { success: boolean; result?: { vectors: { id: string }[]; isTruncated: boolean; nextCursor?: string } };
    if (!res.ok || !json.success || !json.result) throw new Error(`List failed: ${res.status} ${JSON.stringify(json)}`);
    stale.push(...json.result.vectors.map((v) => v.id).filter((id) => !keep.has(id)));
    cursor = json.result.isTruncated ? json.result.nextCursor : undefined;
  } while (cursor);
  for (let i = 0; i < stale.length; i += 1000) {
    const res = await fetch(`${api}/vectorize/v2/indexes/${INDEX}/delete_by_ids`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: stale.slice(i, i + 1000) }),
    });
    if (!res.ok) throw new Error(`Delete failed: ${res.status} ${await res.text()}`);
  }
  console.log(`Deleted ${stale.length} stale vectors`);
}

const chunks = await loadChunks();
console.log(`${chunks.length} chunks from ${KNOWLEDGE_DIR} and src/data/projects.ts`);

if (dryRun) {
  for (const c of chunks) console.log(`\n[${c.id}] ${c.source}\n${c.text}`);
  process.exit(0);
}

for (let i = 0; i < chunks.length; i += BATCH) {
  const batch = chunks.slice(i, i + BATCH);
  const vectors = await embed(batch.map((c) => c.text));
  await upsert(batch.map((c, j) => ({ id: c.id, values: vectors[j], metadata: { source: c.source, text: c.text } })));
  console.log(`Upserted ${i + batch.length}/${chunks.length}`);
}

await deleteStale(new Set(chunks.map((c) => c.id)));
