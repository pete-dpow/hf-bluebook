import { createClient } from '@supabase/supabase-js';
import { generateQueryEmbedding } from './embeddingService';
import { extractKeywordsFromQuery } from './excelProcessor';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface SearchResult {
  rowId: string;
  rowIndex: number;
  rowData: Record<string, any>;
  rowText: string;
  similarity: number;
  matchType: 'vector' | 'keyword' | 'hybrid';
}

export interface SearchOptions {
  limit?: number;
  minSimilarity?: number;
  useKeywordFallback?: boolean;
}

export async function hybridSearch(
  fileId: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const {
    limit = 10,
    minSimilarity = 0.5,
    useKeywordFallback = true,
  } = options;

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const queryEmbedding = await generateQueryEmbedding(query);

    const { data: embeddingResults, error: embeddingError } = await supabase.rpc(
      'match_excel_rows',
      {
        query_embedding: queryEmbedding,
        file_id_param: fileId,
        match_threshold: minSimilarity,
        match_count: limit,
      }
    );

    if (embeddingError) {
      console.error('Vector search error:', embeddingError);
      if (!useKeywordFallback) {
        throw embeddingError;
      }
    }

    if (embeddingResults && embeddingResults.length > 0) {
      return embeddingResults.map((result: any) => ({
        rowId: result.row_id,
        rowIndex: result.row_index,
        rowData: result.row_data,
        rowText: result.row_text,
        similarity: result.similarity,
        matchType: 'vector' as const,
      }));
    }

    if (useKeywordFallback) {
      const keywords = extractKeywordsFromQuery(query);

      if (keywords.length > 0) {
        const { data: rows, error: rowsError } = await supabase
          .from('excel_rows')
          .select('id, row_index, row_data, row_text')
          .eq('file_id', fileId)
          .limit(100);

        if (rowsError) {
          throw rowsError;
        }

        if (rows && rows.length > 0) {
          const keywordMatches = rows
            .filter((row) => {
              const text = row.row_text.toLowerCase();
              return keywords.some((keyword) => text.includes(keyword));
            })
            .map((row) => {
              const text = row.row_text.toLowerCase();
              const matchCount = keywords.filter((keyword) =>
                text.includes(keyword)
              ).length;
              const similarity = matchCount / keywords.length;

              return {
                rowId: row.id,
                rowIndex: row.row_index,
                rowData: row.row_data,
                rowText: row.row_text,
                similarity,
                matchType: 'keyword' as const,
              };
            })
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

          return keywordMatches;
        }
      }
    }

    return [];
  } catch (error) {
    console.error('Hybrid search error:', error);
    throw error;
  }
}

export async function getLatestFileId(): Promise<string | null> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('excel_files')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.id;
}

export async function getFileMetadata(fileId: string) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('excel_files')
    .select('*')
    .eq('id', fileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
