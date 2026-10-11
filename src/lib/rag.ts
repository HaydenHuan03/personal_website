/** Shared by the ingest script and the chat handler, so both use the same embedding space. */
export const EMBEDDING_MODEL = '@cf/baai/bge-m3';
export const CHAT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';

export interface ChunkMetadata {
  source: string;
  text: string;
}
