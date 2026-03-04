-- 011_missing_objects.sql
-- Creates missing database objects identified in v1.0 audit:
-- 1. nextval_quote_number RPC function (wraps quote_number_seq)
-- 2. HNSW vector indexes on products, bluebook_chunks, regulation_sections

-- ============================================================
-- 1. nextval_quote_number RPC
-- ============================================================
-- Wraps the Postgres sequence for race-safe quote number generation.
-- Returns the next integer from quote_number_seq.

CREATE OR REPLACE FUNCTION nextval_quote_number()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT nextval('quote_number_seq')::INTEGER;
$$;

-- ============================================================
-- 2. HNSW Vector Indexes (critical for search performance)
-- ============================================================
-- These replace the IVFFlat indexes that were commented out in 001.
-- HNSW doesn't require pre-existing data, unlike IVFFlat.

CREATE INDEX IF NOT EXISTS products_embedding_idx
ON products USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS bluebook_chunks_embedding_idx
ON bluebook_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS regulation_sections_embedding_idx
ON regulation_sections USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
