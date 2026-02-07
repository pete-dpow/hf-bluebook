import OpenAI from 'openai';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;
const BATCH_SIZE = 100;

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface EmbeddingResult {
  text: string;
  embedding: number[];
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
    encoding_format: 'float',
  });

  return response.data[0].embedding;
}

export async function generateEmbeddingsBatch(texts: string[]): Promise<EmbeddingResult[]> {
  const client = getOpenAIClient();
  const results: EmbeddingResult[] = [];

  const validTexts = texts.filter(text => text && text.trim().length > 0);

  if (validTexts.length === 0) {
    return [];
  }

  for (let i = 0; i < validTexts.length; i += BATCH_SIZE) {
    const batch = validTexts.slice(i, i + BATCH_SIZE);

    const truncatedBatch = batch.map(text => text.slice(0, 8000).trim());

    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncatedBatch,
      encoding_format: 'float',
    });

    batch.forEach((originalText, index) => {
      results.push({
        text: originalText,
        embedding: response.data[index].embedding,
      });
    });
  }

  return results;
}

export async function generateQueryEmbedding(query: string): Promise<number[]> {
  return generateEmbedding(query);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

export const EMBEDDING_CONFIG = {
  model: EMBEDDING_MODEL,
  dimension: EMBEDDING_DIMENSION,
  batchSize: BATCH_SIZE,
};
