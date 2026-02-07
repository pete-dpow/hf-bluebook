/*
  # Create Vector Similarity Search Function

  1. Functions
    - `match_excel_rows` - Performs vector similarity search on embeddings
      - Takes query embedding, file ID, similarity threshold, and match count
      - Returns matching rows with similarity scores
      - Joins embeddings with excel_rows to get full row data
*/

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION match_excel_rows(
  query_embedding vector(1536),
  file_id_param uuid,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  row_id uuid,
  row_index integer,
  row_data jsonb,
  row_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    er.id AS row_id,
    er.row_index,
    er.row_data,
    er.row_text,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM embeddings e
  JOIN excel_rows er ON e.row_id = er.id
  WHERE er.file_id = file_id_param
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
