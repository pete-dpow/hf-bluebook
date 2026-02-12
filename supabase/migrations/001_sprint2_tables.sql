-- Sprint 2: HF.bluebook — 15 new tables + sequence + indexes + RLS + RPC functions + seed data
-- Run against: odhvxoelxiffhocrgtll (dpowchat project)

-- ============================================================
-- 2.1: pgvector (already enabled separately)
-- ============================================================

-- ============================================================
-- 2.2: 15 NEW TABLES
-- ============================================================

-- Product Catalog Tables --

CREATE TABLE manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  website_url TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  trade_discount_percent NUMERIC(5,2),
  logo_url TEXT,
  scraper_config JSONB DEFAULT '{}',
  last_scraped_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pillar TEXT NOT NULL CHECK (pillar IN ('fire_doors','dampers','fire_stopping','retro_fire_stopping','auro_lume')),
  product_code TEXT,
  product_name TEXT NOT NULL,
  description TEXT,
  specifications JSONB DEFAULT '{}',
  list_price NUMERIC(10,2),
  trade_price NUMERIC(10,2),
  sell_price NUMERIC(10,2),
  currency TEXT DEFAULT 'GBP',
  unit TEXT DEFAULT 'each',
  lead_time_days INTEGER,
  minimum_order_quantity INTEGER DEFAULT 1,
  certifications JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','discontinued')),
  scraped_data JSONB,
  needs_review BOOLEAN DEFAULT TRUE,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (manufacturer_id, product_code)
);

CREATE TABLE product_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  file_type TEXT CHECK (file_type IN ('spec_pdf','cad_dxf','image','datasheet','installation_guide','certificate','other')),
  file_name TEXT NOT NULL,
  file_storage TEXT CHECK (file_storage IN ('supabase','sharepoint')),
  file_path TEXT,
  sharepoint_drive_id TEXT,
  sharepoint_item_id TEXT,
  file_url TEXT,
  file_size BIGINT,
  mime_type TEXT,
  parsed_data JSONB,
  thumbnail_path TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

CREATE TABLE scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id),
  started_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
  scrape_type TEXT DEFAULT 'full' CHECK (scrape_type IN ('full','incremental')),
  progress JSONB DEFAULT '{"current_page":0,"total_pages":0,"products_found":0}',
  error_log TEXT,
  products_created INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  files_downloaded INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

CREATE TABLE pillar_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  schema_version TEXT DEFAULT '1.0',
  required_fields JSONB NOT NULL,
  field_definitions JSONB NOT NULL,
  example_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE supplier_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  supplier_name TEXT NOT NULL,
  supplier_website TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quote Tables --

CREATE SEQUENCE quote_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  quote_number TEXT UNIQUE NOT NULL,
  quote_name TEXT,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  project_name TEXT,
  project_address TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sent','approved','rejected','cancelled')),
  quote_date DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  subtotal NUMERIC(10,2),
  vat_percent NUMERIC(5,2) DEFAULT 20.00,
  vat_amount NUMERIC(10,2),
  total NUMERIC(10,2),
  notes TEXT,
  terms TEXT,
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  manufacturer_name TEXT,
  product_code TEXT,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(10,2) NOT NULL,
  unit TEXT DEFAULT 'each',
  notes TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RAG Knowledge Base Tables --

CREATE TABLE bluebook_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_file TEXT NOT NULL,
  source_file_drive_id TEXT,
  page_number INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  chunk_type TEXT DEFAULT 'text' CHECK (chunk_type IN ('text','table','image_description')),
  pillar TEXT,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bluebook_ingestion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_file TEXT NOT NULL,
  source_file_drive_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','complete','error')),
  pages_processed INTEGER DEFAULT 0,
  chunks_created INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance Library Tables --

CREATE TABLE regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reference TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('legislation','approved_document','british_standard','european_standard','industry_guidance')),
  description TEXT,
  source_url TEXT,
  pillar_tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'in_force' CHECK (status IN ('in_force','under_revision','legacy','draft')),
  effective_date DATE,
  last_scraped_at TIMESTAMPTZ,
  scraper_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE regulation_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_id UUID NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
  section_ref TEXT,
  section_title TEXT,
  section_text TEXT NOT NULL,
  page_number INTEGER,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  regulation_id UUID NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
  compliance_notes TEXT,
  test_evidence_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, regulation_id)
);

-- Golden Thread Tables --

CREATE TABLE golden_thread_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  package_reference TEXT UNIQUE NOT NULL,
  building_reference TEXT,
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','processing','complete','failed','delivered')),
  section_88_compliant BOOLEAN DEFAULT FALSE,
  section_91_compliant BOOLEAN DEFAULT FALSE,
  audit_trail_complete BOOLEAN DEFAULT FALSE,
  included_sections TEXT[],
  export_format TEXT CHECK (export_format IN ('json','pdf','csv','all')),
  include_photos BOOLEAN DEFAULT TRUE,
  include_certificates BOOLEAN DEFAULT TRUE,
  client_branding BOOLEAN DEFAULT TRUE,
  export_files JSONB DEFAULT '[]',
  file_size_bytes BIGINT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE golden_thread_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES golden_thread_packages(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('generated','exported','delivered','accessed','regenerated')),
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  details JSONB DEFAULT '{}',
  ip_address INET
);

-- ============================================================
-- 2.4: INDEXES
-- ============================================================

-- Product Catalog
CREATE INDEX idx_manufacturers_org ON manufacturers(organization_id);
CREATE INDEX idx_products_org ON products(organization_id);
CREATE INDEX idx_products_manufacturer ON products(manufacturer_id);
CREATE INDEX idx_products_pillar ON products(organization_id, pillar);
CREATE INDEX idx_products_status ON products(organization_id, status);
CREATE INDEX idx_product_files_product ON product_files(product_id);
CREATE INDEX idx_scrape_jobs_manufacturer ON scrape_jobs(manufacturer_id);
CREATE INDEX idx_scrape_jobs_status ON scrape_jobs(status);

-- Quotes
CREATE INDEX idx_quotes_org ON quotes(organization_id);
CREATE INDEX idx_quotes_status ON quotes(organization_id, status);
CREATE INDEX idx_quote_items_quote ON quote_line_items(quote_id);

-- RAG Knowledge Base
CREATE INDEX idx_bluebook_chunks_org ON bluebook_chunks(org_id);
CREATE INDEX idx_bluebook_chunks_pillar ON bluebook_chunks(org_id, pillar);

-- Compliance Library
CREATE INDEX idx_regulations_org ON regulations(organization_id);
CREATE INDEX idx_regulations_category ON regulations(organization_id, category);
CREATE INDEX idx_regulation_sections_reg ON regulation_sections(regulation_id);
CREATE INDEX idx_product_regulations_product ON product_regulations(product_id);
CREATE INDEX idx_product_regulations_regulation ON product_regulations(regulation_id);

-- Golden Thread
CREATE INDEX idx_gt_packages_project ON golden_thread_packages(project_id);
CREATE INDEX idx_gt_packages_org ON golden_thread_packages(organization_id);
CREATE INDEX idx_gt_audit_package ON golden_thread_audit(package_id);

-- NOTE: IVFFlat vector indexes require data to exist first.
-- These will be created after initial data ingestion:
-- CREATE INDEX idx_products_embedding ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX idx_bluebook_chunks_embedding ON bluebook_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX idx_regulation_sections_embedding ON regulation_sections USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- 2.5: RLS POLICIES (created but RLS not force-enabled — user has RLS off for testing)
-- ============================================================

-- MANUFACTURERS (4 policies)
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view manufacturers" ON manufacturers FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = manufacturers.organization_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can insert manufacturers" ON manufacturers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = manufacturers.organization_id AND om.user_id = auth.uid() AND om.role = 'admin'));
CREATE POLICY "Admins can update manufacturers" ON manufacturers FOR UPDATE
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = manufacturers.organization_id AND om.user_id = auth.uid() AND om.role = 'admin'));
CREATE POLICY "Admins can delete manufacturers" ON manufacturers FOR DELETE
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = manufacturers.organization_id AND om.user_id = auth.uid() AND om.role = 'admin'));

-- PRODUCTS (4 policies)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view products" ON products FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = products.organization_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can insert products" ON products FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = products.organization_id AND om.user_id = auth.uid() AND om.role = 'admin'));
CREATE POLICY "Admins can update products" ON products FOR UPDATE
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = products.organization_id AND om.user_id = auth.uid() AND om.role = 'admin'));
CREATE POLICY "Admins can delete products" ON products FOR DELETE
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = products.organization_id AND om.user_id = auth.uid() AND om.role = 'admin'));

-- PRODUCT_FILES (2 policies)
ALTER TABLE product_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view product files" ON product_files FOR SELECT
  USING (EXISTS (SELECT 1 FROM products p JOIN organization_members om ON om.organization_id = p.organization_id WHERE p.id = product_files.product_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can manage product files" ON product_files FOR ALL
  USING (EXISTS (SELECT 1 FROM products p JOIN organization_members om ON om.organization_id = p.organization_id WHERE p.id = product_files.product_id AND om.user_id = auth.uid() AND om.role = 'admin'));

-- QUOTES (4 policies)
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view quotes" ON quotes FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = quotes.organization_id AND om.user_id = auth.uid()));
CREATE POLICY "Members can create quotes" ON quotes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = quotes.organization_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can update quotes" ON quotes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = quotes.organization_id AND om.user_id = auth.uid() AND om.role = 'admin'));
CREATE POLICY "Admins can delete quotes" ON quotes FOR DELETE
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = quotes.organization_id AND om.user_id = auth.uid() AND om.role = 'admin'));

-- QUOTE_LINE_ITEMS (2 policies)
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view line items" ON quote_line_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM quotes q JOIN organization_members om ON om.organization_id = q.organization_id WHERE q.id = quote_line_items.quote_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can manage line items" ON quote_line_items FOR ALL
  USING (EXISTS (SELECT 1 FROM quotes q JOIN organization_members om ON om.organization_id = q.organization_id WHERE q.id = quote_line_items.quote_id AND om.user_id = auth.uid() AND om.role = 'admin'));

-- SCRAPE_JOBS (3 policies)
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view scrape jobs" ON scrape_jobs FOR SELECT
  USING (EXISTS (SELECT 1 FROM manufacturers m JOIN organization_members om ON om.organization_id = m.organization_id WHERE m.id = scrape_jobs.manufacturer_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can create scrape jobs" ON scrape_jobs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM manufacturers m JOIN organization_members om ON om.organization_id = m.organization_id WHERE m.id = scrape_jobs.manufacturer_id AND om.user_id = auth.uid() AND om.role = 'admin'));
CREATE POLICY "Admins can update scrape jobs" ON scrape_jobs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM manufacturers m JOIN organization_members om ON om.organization_id = m.organization_id WHERE m.id = scrape_jobs.manufacturer_id AND om.user_id = auth.uid() AND om.role = 'admin'));

-- SUPPLIER_REQUESTS (3 policies)
ALTER TABLE supplier_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view requests" ON supplier_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = supplier_requests.organization_id AND om.user_id = auth.uid()));
CREATE POLICY "Members can create requests" ON supplier_requests FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = supplier_requests.organization_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can update requests" ON supplier_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = supplier_requests.organization_id AND om.user_id = auth.uid() AND om.role = 'admin'));

-- PILLAR_SCHEMAS (2 policies)
ALTER TABLE pillar_schemas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pillar schemas" ON pillar_schemas FOR SELECT USING (true);
CREATE POLICY "Service role can manage pillar schemas" ON pillar_schemas FOR ALL USING (auth.role() = 'service_role');

-- BLUEBOOK_CHUNKS (2 policies)
ALTER TABLE bluebook_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view chunks" ON bluebook_chunks FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = bluebook_chunks.org_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can manage chunks" ON bluebook_chunks FOR ALL
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = bluebook_chunks.org_id AND om.user_id = auth.uid() AND om.role = 'admin'));

-- BLUEBOOK_INGESTION_LOG (2 policies)
ALTER TABLE bluebook_ingestion_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view ingestion log" ON bluebook_ingestion_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = bluebook_ingestion_log.org_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can manage ingestion log" ON bluebook_ingestion_log FOR ALL
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = bluebook_ingestion_log.org_id AND om.user_id = auth.uid() AND om.role = 'admin'));

-- REGULATIONS (2 policies)
ALTER TABLE regulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view regulations" ON regulations FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = regulations.organization_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can manage regulations" ON regulations FOR ALL
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = regulations.organization_id AND om.user_id = auth.uid() AND om.role = 'admin'));

-- REGULATION_SECTIONS (2 policies)
ALTER TABLE regulation_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view regulation sections" ON regulation_sections FOR SELECT
  USING (EXISTS (SELECT 1 FROM regulations r JOIN organization_members om ON om.organization_id = r.organization_id WHERE r.id = regulation_sections.regulation_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can manage regulation sections" ON regulation_sections FOR ALL
  USING (EXISTS (SELECT 1 FROM regulations r JOIN organization_members om ON om.organization_id = r.organization_id WHERE r.id = regulation_sections.regulation_id AND om.user_id = auth.uid() AND om.role = 'admin'));

-- PRODUCT_REGULATIONS (2 policies)
ALTER TABLE product_regulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view product regulations" ON product_regulations FOR SELECT
  USING (EXISTS (SELECT 1 FROM products p JOIN organization_members om ON om.organization_id = p.organization_id WHERE p.id = product_regulations.product_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can manage product regulations" ON product_regulations FOR ALL
  USING (EXISTS (SELECT 1 FROM products p JOIN organization_members om ON om.organization_id = p.organization_id WHERE p.id = product_regulations.product_id AND om.user_id = auth.uid() AND om.role = 'admin'));

-- GOLDEN_THREAD_PACKAGES (2 policies)
ALTER TABLE golden_thread_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view GT packages" ON golden_thread_packages FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = golden_thread_packages.organization_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can manage GT packages" ON golden_thread_packages FOR ALL
  USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = golden_thread_packages.organization_id AND om.user_id = auth.uid() AND om.role = 'admin'));

-- GOLDEN_THREAD_AUDIT (1 policy)
ALTER TABLE golden_thread_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view GT audit" ON golden_thread_audit FOR SELECT
  USING (EXISTS (SELECT 1 FROM golden_thread_packages gtp JOIN organization_members om ON om.organization_id = gtp.organization_id WHERE gtp.id = golden_thread_audit.package_id AND om.user_id = auth.uid()));

-- ============================================================
-- 2.6: RPC FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION match_products(
  query_embedding VECTOR(1536),
  match_org_id UUID,
  match_count INTEGER DEFAULT 10,
  match_pillar TEXT DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID, manufacturer_id UUID, product_name TEXT, product_code TEXT,
  pillar TEXT, description TEXT, specifications JSONB,
  list_price NUMERIC, trade_price NUMERIC, sell_price NUMERIC,
  similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.manufacturer_id, p.product_name, p.product_code,
    p.pillar, p.description, p.specifications,
    p.list_price, p.trade_price, p.sell_price,
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

CREATE OR REPLACE FUNCTION match_bluebook_chunks(
  query_embedding VECTOR(1536),
  match_org_id UUID,
  match_count INTEGER DEFAULT 5,
  match_pillar TEXT DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID, source_file TEXT, page_number INTEGER,
  chunk_text TEXT, chunk_type TEXT, pillar TEXT,
  metadata JSONB, similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT bc.id, bc.source_file, bc.page_number, bc.chunk_text,
    bc.chunk_type, bc.pillar, bc.metadata,
    1 - (bc.embedding <=> query_embedding) AS similarity
  FROM bluebook_chunks bc
  WHERE bc.org_id = match_org_id
    AND (match_pillar IS NULL OR bc.pillar = match_pillar)
    AND 1 - (bc.embedding <=> query_embedding) > match_threshold
  ORDER BY bc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION match_regulation_sections(
  query_embedding VECTOR(1536),
  match_org_id UUID,
  match_count INTEGER DEFAULT 5,
  match_category TEXT DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID, regulation_name TEXT, regulation_ref TEXT,
  section_ref TEXT, section_title TEXT, section_text TEXT,
  category TEXT, similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT rs.id, r.name, r.reference,
    rs.section_ref, rs.section_title, rs.section_text,
    r.category,
    1 - (rs.embedding <=> query_embedding) AS similarity
  FROM regulation_sections rs
  JOIN regulations r ON r.id = rs.regulation_id
  WHERE r.organization_id = match_org_id
    AND (match_category IS NULL OR r.category = match_category)
    AND 1 - (rs.embedding <=> query_embedding) > match_threshold
  ORDER BY rs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- 2.8: SEED PILLAR SCHEMAS
-- ============================================================

INSERT INTO pillar_schemas (pillar, display_name, required_fields, field_definitions) VALUES
('fire_doors', 'Fire Doors', '["fire_rating","leaf_material","test_standard"]'::jsonb, '{
  "fire_rating": {"type": "text", "label": "Fire Rating", "example": "FD60"},
  "leaf_material": {"type": "text", "label": "Leaf Material", "example": "Solid timber"},
  "leaf_thickness_mm": {"type": "number", "label": "Leaf Thickness (mm)", "example": 44},
  "glass_type": {"type": "text", "label": "Glass Type", "example": "Pyroguard"},
  "certification_body": {"type": "text", "label": "Certification Body", "example": "BM TRADA"},
  "test_standard": {"type": "text", "label": "Test Standard", "example": "BS 476-22"},
  "max_leaf_size": {"type": "text", "label": "Max Leaf Size", "example": "1100 x 2400mm"},
  "ironmongery_compatibility": {"type": "text", "label": "Ironmongery Compatibility", "example": "Dorma TS 93"},
  "smoke_seal_type": {"type": "text", "label": "Smoke Seal Type", "example": "Intumescent with brush"},
  "intumescent_strip_type": {"type": "text", "label": "Intumescent Strip Type", "example": "15x4mm graphite"}
}'::jsonb),
('dampers', 'Dampers', '["fire_rating","damper_type","test_standard"]'::jsonb, '{
  "fire_rating": {"type": "text", "label": "Fire Rating", "example": "120 minutes"},
  "damper_type": {"type": "text", "label": "Damper Type", "example": "fire", "options": ["fire","smoke","combination"]},
  "blade_material": {"type": "text", "label": "Blade Material", "example": "Galvanised steel"},
  "actuator_type": {"type": "text", "label": "Actuator Type", "example": "Spring return 24V"},
  "duct_size_range": {"type": "text", "label": "Duct Size Range", "example": "100-1200mm"},
  "orientation": {"type": "text", "label": "Orientation", "example": "Horizontal/Vertical"},
  "test_standard": {"type": "text", "label": "Test Standard", "example": "BS EN 15650"},
  "reset_type": {"type": "text", "label": "Reset Type", "example": "Manual/Automatic"},
  "fusible_link_temp_c": {"type": "number", "label": "Fusible Link Temp (C)", "example": 72}
}'::jsonb),
('fire_stopping', 'Fire Stopping', '["fire_rating","penetration_type","test_standard"]'::jsonb, '{
  "fire_rating": {"type": "text", "label": "Fire Rating", "example": "240 minutes"},
  "penetration_type": {"type": "text", "label": "Penetration Type", "example": "Pipe"},
  "service_type": {"type": "text", "label": "Service Type", "example": "Plastic pipe"},
  "pipe_material": {"type": "text", "label": "Pipe Material", "example": "uPVC"},
  "pipe_diameter_range_mm": {"type": "text", "label": "Pipe Diameter Range (mm)", "example": "32-160"},
  "wall_floor_type": {"type": "text", "label": "Wall/Floor Type", "example": "Concrete floor"},
  "seal_depth_mm": {"type": "number", "label": "Seal Depth (mm)", "example": 50},
  "movement_capability_mm": {"type": "number", "label": "Movement Capability (mm)", "example": 25},
  "test_standard": {"type": "text", "label": "Test Standard", "example": "BS EN 1366-3"},
  "annular_gap_mm": {"type": "number", "label": "Annular Gap (mm)", "example": 40}
}'::jsonb),
('retro_fire_stopping', 'Retro Fire Stopping', '["fire_rating","application_type","test_standard"]'::jsonb, '{
  "fire_rating": {"type": "text", "label": "Fire Rating", "example": "120 minutes"},
  "application_type": {"type": "text", "label": "Application Type", "example": "Cavity barrier"},
  "substrate_compatibility": {"type": "text", "label": "Substrate Compatibility", "example": "Masonry, concrete, steel"},
  "cavity_width_range_mm": {"type": "text", "label": "Cavity Width Range (mm)", "example": "50-300"},
  "linear_gap_seal_type": {"type": "text", "label": "Linear Gap Seal Type", "example": "Intumescent strip"},
  "test_standard": {"type": "text", "label": "Test Standard", "example": "BS EN 1366-4"},
  "installation_method": {"type": "text", "label": "Installation Method", "example": "Mechanical fix + adhesive"},
  "accessibility": {"type": "text", "label": "Accessibility", "example": "Accessible from one side"}
}'::jsonb),
('auro_lume', 'Auro Lume', '["luminance_mcd_m2","duration_minutes","bs_standard"]'::jsonb, '{
  "luminance_mcd_m2": {"type": "number", "label": "Luminance (mcd/m2)", "example": 210},
  "duration_minutes": {"type": "number", "label": "Duration (minutes)", "example": 60},
  "material": {"type": "text", "label": "Material", "example": "Rigid PVC"},
  "mounting_type": {"type": "text", "label": "Mounting Type", "example": "Self-adhesive / screw-fix"},
  "sign_type": {"type": "text", "label": "Sign Type", "example": "Exit sign"},
  "bs_standard": {"type": "text", "label": "BS Standard", "example": "BS ISO 17398"},
  "photoluminescent_class": {"type": "text", "label": "Photoluminescent Class", "example": "Class C"},
  "excitation_time_minutes": {"type": "number", "label": "Excitation Time (minutes)", "example": 15}
}'::jsonb);
