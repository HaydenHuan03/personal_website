export const EMBEDDING_MODEL = '@cf/baai/bge-m3';
export const CHAT_MODEL = '@cf/meta/llama-3.2-1b-instruct';

export interface ChunkMetadata {
  source: string;
  text: string;
}
