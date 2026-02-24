-- 009: Vector search RPC functions for products, bluebook chunks, and regulation sections
-- These are called by /api/products/search and /api/hybrid-chat

-- ============================================================
-- match_products — vector similarity search on products table
-- ============================================================

CREATE OR REPLACE FUNCTION match_products(
  query_embedding vector(1536),
  match_org_id uuid,
  match_count int DEFAULT 10,
  match_threshold float DEFAULT 0.5,
  match_pillar text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  manufacturer_id uuid,
  product_name text,
  product_code text,
  pillar text,
  description text,
  specifications jsonb,
  list_price numeric,
  trade_price numeric,
  sell_price numeric,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.manufacturer_id,
    p.product_name,
    p.product_code,
    p.pillar,
    p.description,
    p.specifications,
    p.list_price,
    p.trade_price,
    p.sell_price,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM products p
  WHERE p.organization_id = match_org_id
    AND p.status = 'active'
    AND p.embedding IS NOT NULL
    AND (match_pillar IS NULL OR p.pillar = match_pillar)
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- match_bluebook_chunks — vector similarity search on bluebook_chunks
-- ============================================================

CREATE OR REPLACE FUNCTION match_bluebook_chunks(
  query_embedding vector(1536),
  match_org_id uuid,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.7,
  match_pillar text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  chunk_text text,
  chunk_type text,
  source_file text,
  page_number int,
  pillar text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bc.id,
    bc.chunk_text,
    bc.chunk_type,
    bc.source_file,
    bc.page_number,
    bc.pillar,
    bc.metadata,
    1 - (bc.embedding <=> query_embedding) AS similarity
  FROM bluebook_chunks bc
  WHERE bc.org_id = match_org_id
    AND bc.embedding IS NOT NULL
    AND (match_pillar IS NULL OR bc.pillar = match_pillar)
    AND 1 - (bc.embedding <=> query_embedding) > match_threshold
  ORDER BY bc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- match_regulation_sections — vector similarity on regulation_sections
-- Joins to regulations to get name/reference and org_id filter
-- ============================================================

CREATE OR REPLACE FUNCTION match_regulation_sections(
  query_embedding vector(1536),
  match_org_id uuid,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.7,
  match_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  regulation_id uuid,
  regulation_name text,
  regulation_ref text,
  section_ref text,
  section_title text,
  section_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rs.id,
    rs.regulation_id,
    r.name AS regulation_name,
    r.reference AS regulation_ref,
    rs.section_ref,
    rs.section_title,
    rs.section_text,
    1 - (rs.embedding <=> query_embedding) AS similarity
  FROM regulation_sections rs
  JOIN regulations r ON r.id = rs.regulation_id
  WHERE r.organization_id = match_org_id
    AND rs.embedding IS NOT NULL
    AND (match_category IS NULL OR r.category = match_category)
    AND 1 - (rs.embedding <=> query_embedding) > match_threshold
  ORDER BY rs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
