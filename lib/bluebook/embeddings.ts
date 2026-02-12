/**
 * Bluebook embedding wrapper.
 * Re-uses the central embeddingService (text-embedding-3-small, 1536 dims).
 */

import {
  generateEmbedding,
  generateEmbeddingsBatch,
  type EmbeddingResult,
} from "@/lib/embeddingService";
import type { Chunk } from "./chunker";

export { generateEmbedding, generateEmbeddingsBatch };

export interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

/**
 * Generate embeddings for an array of chunks.
 * Returns chunks with their embedding vectors attached.
 */
export async function embedChunks(chunks: Chunk[]): Promise<EmbeddedChunk[]> {
  if (chunks.length === 0) return [];

  const texts = chunks.map((c) => c.text);
  const results: EmbeddingResult[] = await generateEmbeddingsBatch(texts);

  return chunks.map((chunk, i) => ({
    ...chunk,
    embedding: results[i].embedding,
  }));
}
