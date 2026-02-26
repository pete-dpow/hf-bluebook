-- Add normalization tracking fields to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS normalized_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS normalization_confidence INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS normalization_warnings JSONB DEFAULT '[]';

-- Index for finding unnormalized products
CREATE INDEX IF NOT EXISTS idx_products_normalized_at ON products (normalized_at) WHERE normalized_at IS NULL;
