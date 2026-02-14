# hf.bluebook — Architecture

> **The definitive technical specification. One source of truth.**
> Supersedes all previous versions (v2, v3, v5, v6, v6.5). All decisions are final.

---

## 1. What hf.bluebook Is

**hf.bluebook makes every Harmony Fire team member instantly competent on fire protection products and UK building safety regulations.**

```
hf.bluebook = dpow.chat (keep 100%) + Product Intelligence + Compliance + Golden Thread
```

### Three Pillars

| Pillar | What | Example Query |
|--------|------|---------------|
| **Product Intelligence** | Scraped manufacturer catalogs as searchable data | "Find FD60 doors from Quelfire" |
| **Compliance Knowledge** | UK fire regulations parsed and queryable | "What fire door inspection frequency does the law require?" |
| **Melvin AI** | Cross-references products + compliance + project data + test certs | "Can I use this Quelfire collar on 110mm PVC through BG plasterboard at 60 min?" |

### Plus

- **Golden Thread Module** — BSA 2022 compliant export packages (the killer differentiator)
- **Quote Generator** — Excel + PDF export with product catalog integration
- **Operational Backbone** — Project management, file analysis, reports, multi-org (inherited from dpow.chat)

### What It Is NOT

- Not a rewrite. The existing dpow.chat codebase is kept 100%.
- Not dpow.chat with a new skin. It's a new product deployed to a fresh Supabase project.
- dpow.chat continues running independently.

---

## 2. Technical Constraints — DO NOT CHANGE

These are resolved. Each has a specific technical reason.

| Decision | Reason | Wrong Alternative |
|----------|--------|-------------------|
| **Playwright** for scraping (via Inngest) | Inngest jobs run on Inngest infrastructure (NOT Vercel), so Playwright works — full Chromium, no binary limits, free, debuggable | ~~Browserless.io~~ (costs money), ~~Cheerio~~ (no JS rendering) |
| **Inngest** for background jobs | Single API route on Vercel, no Redis/separate server | ~~Bull/BullMQ~~, ~~raw polling~~ |
| **Postgres SEQUENCE** for quote numbers | `nextval()` is atomic, no race conditions | ~~SELECT max() + 1~~ |
| **text-embedding-3-small (1536 dims)** | Matches existing `VECTOR(1536)` columns and `match_excel_rows` RPC | ~~text-embedding-3-large (3072)~~ |
| **5 pillars**: fire_doors, dampers, fire_stopping, retro_fire_stopping, auro_lume | Harmony Fire's actual product divisions | ~~Generic categories~~ |
| **Status 'cancelled'** on quotes | Admin soft-delete | ~~Missing from CHECK constraint~~ |
| **Single playwrightScraper.ts** | One scraper for products AND regulations | ~~Separate scrapers per site~~ |
| **Structure-aware chunking** for RAG | Fire test configs are atomic units — naive 500-token splits destroy relationships | ~~Fixed-size token chunking~~ |
| **pdf-lib** for quote PDFs, **Playwright page.pdf()** for Golden Thread handover packs | pdf-lib already in deps; Playwright handles complex HTML-to-PDF with headers/footers/photos | ~~Puppeteer~~ (redundant, Playwright does this) |

---

## 3. AI Model Decisions

| Model | Where | Why |
|-------|-------|-----|
| **text-embedding-3-small** (1536 dims) | ALL embeddings: products, bluebook chunks, regulation sections, excel rows | One model, one dimension, consistent, cheap |
| **GPT-4o-mini** | GENERAL, PROJECT, PRODUCT modes; classification; quick chat | Fast, cheap, good for structured queries |
| **Claude claude-sonnet-4-5** | KNOWLEDGE and FULL modes | Document reasoning over test certificates, regulation interpretation, conditional clauses — Claude genuinely wins here |
| **GPT-4o** (full) | AI Normalizer — structured spec extraction from scraped HTML | Accuracy matters for data extraction; mini makes too many mistakes on complex tables |

**Dependencies**: `openai` (existing) + `@anthropic-ai/sdk` (new)

---

## 4. Melvin Chat Modes (5)

| Mode | Searches | Model | Example |
|------|----------|-------|---------|
| **GENERAL** | Nothing — model knowledge only | GPT-4o-mini | "What is fire stopping?" |
| **PROJECT** | User's Excel/project data (pgvector) | GPT-4o-mini | "How many doors on my project?" |
| **PRODUCT** | Product catalog (structured DB + pgvector) | GPT-4o-mini | "Find FD60 doors from Quelfire" |
| **KNOWLEDGE** | Bluebook PDFs + compliance regulations (both vector stores) | Claude | "What's the QWR detail for 60-min walls?" |
| **FULL** | Everything combined — project + products + knowledge | Claude | "Which catalogue details apply to my penetrations?" |

The classifier (GPT-4o-mini, temp=0) picks the mode. KNOWLEDGE and FULL use Claude for generation because document reasoning quality matters.

---

## 5. Five Pillars

| Pillar Key | Display Name | Description |
|------------|-------------|-------------|
| `fire_doors` | Fire Doors | FD30/FD60 doorsets, ironmongery, seals, closers |
| `dampers` | Dampers | Fire dampers, smoke dampers, HVAC penetrations |
| `fire_stopping` | Fire Stopping | Intumescent collars, wraps, sealants, batts, penetration seals |
| `retro_fire_stopping` | Retro Fire Stopping | Retrospective cavity barriers, retrofit solutions |
| `auro_lume` | Auro Lume | Emergency lighting, photoluminescent signage, exit signs |

### Pillar Schema Fields

Each pillar has specific required fields in the `pillar_schemas` table:

**fire_doors**: fire_rating, leaf_material, leaf_thickness_mm, glass_type, certification_body, test_standard, max_leaf_size, ironmongery_compatibility, smoke_seal_type, intumescent_strip_type

**dampers**: fire_rating, damper_type (fire/smoke/combination), blade_material, actuator_type, duct_size_range, orientation, test_standard, reset_type, fusible_link_temp_c

**fire_stopping**: fire_rating, penetration_type, service_type, pipe_material, pipe_diameter_range_mm, wall_floor_type, seal_depth_mm, movement_capability_mm, test_standard, annular_gap_mm

**retro_fire_stopping**: fire_rating, application_type, substrate_compatibility, cavity_width_range_mm, linear_gap_seal_type, test_standard, installation_method, accessibility

**auro_lume**: luminance_mcd_m2, duration_minutes, material, mounting_type, sign_type, bs_standard, photoluminescent_class, excitation_time_minutes

---

## 6. Database Schema

### 6.1 Existing Tables (dpow.chat — keep unchanged)

```
users, organizations, organization_members, organization_invites,
projects, files, chat_messages, chat_sessions,
excel_files, excel_rows, embeddings, user_memories, waitlist
```

These are already in production with RLS policies. Do not modify.

### 6.2 Product Catalog Tables

```sql
-- Manufacturers / Suppliers
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

-- Products
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

-- Product Files (dual storage: Supabase <10MB, SharePoint >10MB)
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

-- Scrape Jobs
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

-- Pillar Schemas (seed data — defines required fields per pillar)
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

-- Supplier Requests (staff request new manufacturers)
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
```

### 6.3 Quote Tables

```sql
-- Quote Number Sequence (race-safe)
CREATE SEQUENCE quote_number_seq START WITH 1 INCREMENT BY 1;

-- Quotes
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

-- Quote Line Items
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
```

### 6.4 RAG Knowledge Base Tables

```sql
-- Bluebook Chunks (from manufacturer PDFs via OneDrive)
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

-- Ingestion Tracking
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
```

### 6.5 Compliance Library Tables

```sql
-- Regulations (structured metadata)
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

-- Regulation Sections (chunked + embedded for RAG)
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

-- Product ↔ Regulation join (which products satisfy which standards)
CREATE TABLE product_regulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  regulation_id UUID NOT NULL REFERENCES regulations(id) ON DELETE CASCADE,
  compliance_notes TEXT,
  test_evidence_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, regulation_id)
);
```

### 6.6 Golden Thread Tables

```sql
-- Golden Thread Packages (BSA 2022 compliant exports)
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

-- Golden Thread Audit Log
CREATE TABLE golden_thread_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES golden_thread_packages(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('generated','exported','delivered','accessed','regenerated')),
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  details JSONB DEFAULT '{}',
  ip_address INET
);
```

### 6.7 Indexes

```sql
-- Product Catalog
CREATE INDEX idx_manufacturers_org ON manufacturers(organization_id);
CREATE INDEX idx_products_org ON products(organization_id);
CREATE INDEX idx_products_manufacturer ON products(manufacturer_id);
CREATE INDEX idx_products_pillar ON products(organization_id, pillar);
CREATE INDEX idx_products_status ON products(organization_id, status);
CREATE INDEX idx_products_embedding ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
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
CREATE INDEX idx_bluebook_chunks_embedding ON bluebook_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Compliance Library
CREATE INDEX idx_regulations_org ON regulations(organization_id);
CREATE INDEX idx_regulations_category ON regulations(organization_id, category);
CREATE INDEX idx_regulation_sections_reg ON regulation_sections(regulation_id);
CREATE INDEX idx_regulation_sections_embedding ON regulation_sections USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_product_regulations_product ON product_regulations(product_id);
CREATE INDEX idx_product_regulations_regulation ON product_regulations(regulation_id);

-- Golden Thread
CREATE INDEX idx_gt_packages_project ON golden_thread_packages(project_id);
CREATE INDEX idx_gt_packages_org ON golden_thread_packages(organization_id);
CREATE INDEX idx_gt_audit_package ON golden_thread_audit(package_id);
```

### 6.8 RPC Functions

```sql
-- Product vector search
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

-- Bluebook chunk search (PDF knowledge)
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

-- Regulation section search
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
```

### 6.9 RLS Policies

```sql
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

-- PRODUCT_FILES (2 policies — member SELECT + admin ALL, Postgres OR's them)
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

-- QUOTE_LINE_ITEMS (2 policies — SELECT for members, ALL for admins)
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view line items" ON quote_line_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM quotes q JOIN organization_members om ON om.organization_id = q.organization_id WHERE q.id = quote_line_items.quote_id AND om.user_id = auth.uid()));
CREATE POLICY "Admins can manage line items" ON quote_line_items FOR ALL
  USING (EXISTS (SELECT 1 FROM quotes q JOIN organization_members om ON om.organization_id = q.organization_id WHERE q.id = quote_line_items.quote_id AND om.user_id = auth.uid() AND om.role = 'admin'));

-- SCRAPE_JOBS (3 policies — including UPDATE for Inngest status changes)
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

-- PILLAR_SCHEMAS (2 policies — public read, admin write)
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

-- GOLDEN_THREAD_AUDIT (1 policy — read via package)
ALTER TABLE golden_thread_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view GT audit" ON golden_thread_audit FOR SELECT
  USING (EXISTS (SELECT 1 FROM golden_thread_packages gtp JOIN organization_members om ON om.organization_id = gtp.organization_id WHERE gtp.id = golden_thread_audit.package_id AND om.user_id = auth.uid()));
```

**Total: 38 RLS policies across 15 new tables.**

---

## 7. Auth Helper

**File:** `lib/authHelper.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) throw new Error('Unauthorized');

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error('Unauthorized');

  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', user.user_metadata?.active_organization_id)
    .single();

  return {
    user,
    isAdmin: membership?.role === 'admin' || membership?.role === 'owner',
    organizationId: user.user_metadata?.active_organization_id,
  };
}
```

---

## 8. Inngest Functions (7)

| Function | Event | What It Does |
|----------|-------|-------------|
| `scrapeManufacturer` | `manufacturer/scrape.requested` | Playwright scrapes product pages, upserts to DB, updates scrape_jobs status |
| `generateProductEmbeddings` | `products/embeddings.requested` | Embeds product text with text-embedding-3-small, saves to products.embedding |
| `sendQuoteEmail` | `quote/send.requested` | Generates PDF, sends via Resend, updates quote status to 'sent' |
| `parseProductFile` | `product-file/uploaded` | Extracts text from PDF/DXF, saves parsed_data to product_files |
| `ingestBluebookPDFs` | `bluebook/ingest.requested` | Downloads PDFs from OneDrive, structure-aware chunking, embeds, stores in bluebook_chunks |
| `scrapeRegulation` | `regulation/scrape.requested` | Playwright scrapes gov.uk/BSI pages, parses sections, embeds, stores in regulation_sections |
| `generateGoldenThread` | `golden-thread/generate.requested` | Compiles project data, validates BSA compliance, generates JSON/PDF/CSV exports |

**Setup:**
- Client: `lib/inngest/client.ts` — `new Inngest({ id: 'hf-bluebook' })`
- Functions: `lib/inngest/functions.ts`
- Serve: `app/api/inngest/route.ts`

---

## 9. Scraper Architecture

**Single scraper:** `lib/scrapers/playwrightScraper.ts`

Used for BOTH manufacturer products AND regulation documents. Runs on Inngest infrastructure (not Vercel).

**Manufacturer scraper config** (stored in `manufacturers.scraper_config`):
```json
{
  "product_list_url": "https://quelfire.co.uk/products",
  "product_list_selector": ".product-card",
  "product_name_selector": "h3.title",
  "product_link_selector": "a.card-link",
  "product_detail_selectors": {
    "description": ".product-description",
    "specs": ".specifications-table tr",
    "price": ".price-value",
    "pdf_link": "a[href$='.pdf']"
  },
  "pagination": { "type": "next_button", "selector": ".next-page", "max_pages": 50 }
}
```

**Regulation scraper config** (stored in `regulations.scraper_config`):
```json
{
  "source_url": "https://www.legislation.gov.uk/ukpga/2022/30/contents",
  "section_selector": ".LegP1GroupTitle, .LegP2Container",
  "content_selector": ".LegP2Para",
  "section_ref_selector": ".LegP1GroupTitleFirst"
}
```

---

## 10. RAG Architecture

### PDF Ingestion Pipeline

1. Admin triggers ingestion (or selects OneDrive folder)
2. Inngest job `ingestBluebookPDFs` starts
3. Downloads PDFs from OneDrive via M365 Graph API (tokens from existing OAuth)
4. Extracts text per page using `pdf-parse`
5. **Structure-aware chunking**: splits on section headers and table boundaries, NOT fixed token counts. Fire test configurations are kept as atomic units.
6. Auto-detects pillar from filename/content keywords
7. Generates embeddings (text-embedding-3-small, 1536 dims)
8. Batch inserts to `bluebook_chunks`
9. Logs progress to `bluebook_ingestion_log`

### Pillar Auto-Detection

```javascript
const PILLAR_KEYWORDS = {
  fire_doors: ['fire door', 'FD30', 'FD60', 'doorset', 'ironmongery'],
  dampers: ['fire damper', 'smoke damper', 'HVAC', 'ductwork'],
  fire_stopping: ['intumescent', 'fire collar', 'fire seal', 'ablative', 'penetration seal'],
  retro_fire_stopping: ['retrospective', 'cavity barrier', 'retrofit'],
  auro_lume: ['emergency lighting', 'exit sign', 'luminaire', 'photoluminescent']
};
```

---

## 11. Compliance Library

### Starting Regulations (14)

| Category | Regulations |
|----------|------------|
| **Legislation** | Building Safety Act 2022, Fire Safety (England) Regulations 2022, Regulatory Reform (Fire Safety) Order 2005 |
| **Approved Documents** | AD B Fire Safety (Vol 1 & 2), AD B Regulation 7 (combustibility ban 18m+) |
| **British Standards** | BS 9999 (fire safety design), BS 9991 (residential), BS 476 Parts 20-24 (fire tests), BS 8214 (fire door assemblies) |
| **European Standards** | BS EN 1366-3 (penetration seals), BS EN 1366-2 (fire dampers), BS EN 15650 (damper product standard) |
| **Industry Guidance** | ASFP TGD 19 (fire stopping best practice), BS 5499-4 (photoluminescent signage) |

All 14 are scraped from live sources (gov.uk, BSI summaries, ASFP) using Playwright on Inngest. Each card has an "Update" CTA for future re-scraping.

### Cross-Links

- **Products → Regulations**: via `product_regulations` join table. Shows which standards each product satisfies.
- **Quotes → Compliance**: compliance tab on quote detail shows which regulations the quoted products meet (golden thread traceability for BSA 2022).
- **Projects → Regulations**: auto-linked based on building type and active pillars.

---

## 12. Golden Thread Module

### What It Is

BSA 2022 (Sections 88/91) requires structured digital records of all fire safety work on higher-risk buildings. hf.bluebook already captures this data through its workflow — Golden Thread packages it for compliant handover.

### Data Flow

```
Survey → Design → Quotation → Installation → Testing → Certification → O&M
  ↓        ↓         ↓            ↓            ↓          ↓            ↓
Building  Product   Scope      Work         Verify     Compliance   Lifecycle
Info      Specs     & Cost     Records      Records    Documents    Data
  └──────────────────────┬────────────────────────────────────┘
                    Golden Thread Package
                     (JSON / PDF / CSV)
```

### Export Formats

- **JSON**: Machine-readable BSA-compliant structured data
- **PDF**: Client-branded handover pack (cover page, TOC, PCI, installation records, certs, O&M, audit trail)
- **CSV**: ZIP containing products.csv, installations.csv, testing.csv, certificates.csv, audit_trail.csv

### Compliance Validation

Before export, the system validates:
- **Section 88**: Has installation records with dates, personnel, and product references
- **Section 91**: Has complete audit trail in structured digital format
- Warnings generated for missing data

### PDF Generation

Uses Playwright `page.pdf()` running on Inngest infrastructure — same as scraper. Handles complex HTML layouts with headers, footers, photos, tables.

---

## 13. API Routes

### Existing (keep — 46 routes)

```
/api/chat, /api/freemium-chat, /api/hybrid-chat, /api/debug-chat
/api/upload-file, /api/upload-excel, /api/upload-excel-freemium
/api/load-file, /api/list-files, /api/set-active-file, /api/delete-file, /api/archive-file
/api/create-project, /api/load-project, /api/list-projects, /api/set-active-project
/api/rename-project, /api/delete-project, /api/archive-project
/api/generate-summary, /api/summary-report, /api/memory, /api/smart-save
/api/microsoft/{auth,callback,disconnect,files,import,libraries,sharepoint-files,sites}
/api/organizations/{create,list,invite,accept-invite,invite-info,switch}
/api/create-checkout-session, /api/stripe/{create-portal-session,webhook}
/api/whatsapp/{send-test,webhook}
/api/gdpr/{delete-account,export}
/api/test-env, /api/test-supabase, /api/waitlist/submit
```

### New Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/manufacturers` | GET, POST | List/create manufacturers |
| `/api/manufacturers/[id]` | GET, PATCH, DELETE | Read/update/archive manufacturer |
| `/api/manufacturers/[id]/scrape` | POST | Trigger scrape job |
| `/api/products` | GET, POST | List/create products |
| `/api/products/[id]` | GET, PATCH, DELETE | Read/update/delete product |
| `/api/products/[id]/review` | POST | Admin approve product |
| `/api/products/search` | POST | Vector + keyword search |
| `/api/product-files` | POST | Upload product file |
| `/api/product-files/[id]` | GET, DELETE | Download/delete file |
| `/api/quotes` | GET, POST | List/create quotes |
| `/api/quotes/[id]` | GET, PATCH, DELETE | Read/update/delete quote |
| `/api/quotes/[id]/line-items` | POST, DELETE | Add/remove line items |
| `/api/quotes/[id]/generate-excel` | POST | Generate .xlsx |
| `/api/quotes/[id]/generate-pdf` | POST | Generate .pdf |
| `/api/quotes/[id]/send` | POST | Email to client |
| `/api/quotes/next-number` | GET | Race-safe quote number |
| `/api/supplier-requests` | GET, POST | List/create requests |
| `/api/supplier-requests/[id]` | PATCH | Approve/reject |
| `/api/normalize` | POST | AI spec extraction |
| `/api/scraper/status` | GET | Poll job progress |
| `/api/bluebook/ingest` | POST | Trigger PDF ingestion |
| `/api/bluebook/search` | POST | Vector search bluebook |
| `/api/bluebook/status` | GET | Knowledge base status |
| `/api/compliance` | GET, POST | List/create regulations |
| `/api/compliance/[id]` | GET, PATCH | Read/update regulation |
| `/api/compliance/[id]/scrape` | POST | Re-scrape regulation |
| `/api/compliance/search` | POST | Vector search regulations |
| `/api/golden-thread/generate` | POST | Generate GT package |
| `/api/golden-thread/packages` | GET | List packages for project |
| `/api/golden-thread/packages/[id]` | GET | Package status + files |
| `/api/golden-thread/packages/[id]/download` | GET | Download export |
| `/api/golden-thread/packages/[id]/audit` | GET | View audit trail |
| `/api/microsoft/upload-product-file` | POST | Upload to SharePoint |
| `/api/inngest` | POST | Inngest serve endpoint |

---

## 14. Pages

### Existing (keep/update)

| Route | Status | Notes |
|-------|--------|-------|
| `/` | UPDATE | Becomes Melvin chat with pill mode cards |
| `/chat` | KEEP | Main chat interface |
| `/dashboard` | ENHANCE | 4-tile hub with DashboardCard |
| `/report` | KEEP | HF colors only |
| `/scope` | KEEP | HF colors only |
| `/summary`, `/preview` | KEEP | HF colors only |
| `/auth`, `/auth/callback` | KEEP | Rebrand text |
| `/invite/[token]` | KEEP | Rebrand text |
| `/pricing` | KEEP | Disabled |
| `/demo` | KEEP | May not use |
| `/list`, `/procure`, `/tidp`, `/wlca`, `/assign` | KEEP | Waitlist pages |

### New Pages

| Route | Purpose | Lucide Icon |
|-------|---------|-------------|
| `/manufacturers` | Manufacturer list + search (card grid) | `Factory` |
| `/manufacturers/new` | Add manufacturer form (admin) | — |
| `/manufacturers/[id]` | Detail + scraper config + trigger UI | — |
| `/products` | Product grid/list toggle + filters | `Package` |
| `/products/new` | Add product form (pillar-aware) | — |
| `/products/[id]` | Product detail + files + compliance links | — |
| `/quotes` | Quote table + filters | `FileText` |
| `/quotes/new` | Create quote + product search | — |
| `/quotes/[id]` | Edit quote + line items + generate/send | — |
| `/compliance` | Searchable regulation card grid + filters | `ShieldCheck` |
| `/compliance/[id]` | Regulation detail with key sections | — |
| `/golden-thread` | Project GT packages + generate | `Scroll` |
| `/golden-thread/[id]` | Package detail + downloads + audit | — |
| `/data-mining` | Scrape jobs dashboard + progress | `PickaxeIcon` or `Search` |
| `/supplier-requests` | Admin approval page | — |
| `/surveying` | Placeholder — "Coming Soon" | `Ruler` |

---

## 15. New Components

| Component | Purpose |
|-----------|---------|
| `DashboardCard` | Action tiles on dashboard |
| `ManufacturerCard` | Supplier grid card |
| `ProductCard` | Product grid card (visual browsing) |
| `ProductListRow` | Compact list row |
| `ProductFilter` | Pillar/manufacturer/price/status filters |
| `ProductSearchModal` | Search products for adding to quotes |
| `QuoteBuilder` | Line item editor |
| `QuoteLineItemRow` | Single editable line |
| `QuoteTableRow` | Quote list table row |
| `QuoteTotals` | Subtotal/VAT/total display |
| `ScraperProgress` | Job progress bar |
| `SupplierRequestCard` | Approval card |
| `RequestSupplierModal` | Staff request form |
| `PDFViewer` | Product spec PDF viewer |
| `RegulationCard` | Compliance library card |
| `RegulationDetail` | Full regulation view with sections |
| `GoldenThreadModal` | GT generation options modal |
| `GoldenThreadPackageCard` | Package status/download card |
| `ComplianceTab` | Quote compliance cross-reference |

---

## 16. New Lib Files

```
lib/authHelper.ts                  — getAuthUser + isAdmin
lib/productSearch.ts               — vector + keyword + spec search
lib/productEmbeddings.ts           — generate product embeddings
lib/quoteGenerator.ts              — Excel (exceljs) + PDF (pdf-lib) output
lib/sharepointUploader.ts          — upload to SharePoint (>10MB files)
lib/scrapers/playwrightScraper.ts  — browser scraping (products + regulations)
lib/parsers/pdfParser.ts           — PDF text extraction (pdf-parse)
lib/parsers/dxfParser.ts           — CAD dimension extraction
lib/normalizer/aiExtractor.ts      — GPT-4o spec extraction from text
lib/normalizer/schemaValidator.ts  — validate against pillar schemas
lib/bluebook/chunker.ts            — structure-aware text chunking
lib/bluebook/embeddings.ts         — OpenAI embedding wrapper
lib/bluebook/pillarDetector.ts     — auto-detect pillar from content
lib/compliance/regulationScraper.ts — regulation-specific scraping logic
lib/goldenThread/compiler.ts       — compile project data for GT export
lib/goldenThread/validator.ts      — BSA compliance validation
lib/goldenThread/pdfGenerator.ts   — Playwright page.pdf() for handover packs
lib/inngest/client.ts              — Inngest client init
lib/inngest/functions.ts           — all 7 job definitions
```

---

## 17. Repurposed Components

| Component | Was | Now |
|-----------|-----|-----|
| `SmartSavePrompt` | "Sign in to save" freemium prompt | Unsaved changes warning on navigation |
| `SignInDrawer` | Sign-in drawer for anonymous users | Session expiry/re-auth prompt |
| `useFreemiumUpload` hook | localStorage-based upload for anonymous | Renamed to `useFileUpload`, always saves to DB (login required) |

---

## 18. Auth & Roles

- **Login required for everything** — no freemium/anonymous paths
- **Microsoft Entra ID** — primary login. Uses Azure AD OAuth (`/common/` endpoint, any MS tenant). Redirect URI: `https://hf-bluebook.vercel.app/api/microsoft/callback`. App registration: `crane@dpow.co.uk` Azure Portal.
- **Magic link OTP** — secondary login via Supabase Auth (fallback if Entra not available)
- **PKCE flow** — Supabase uses `flowType: 'pkce'` with code exchange, NOT implicit flow
- **Auto-provisioning** — `POST /api/setup` creates `users` row, `organizations` (from email domain), `organization_members` (admin role) on first login. Called automatically by `AuthGuard` on session detect. Idempotent.
- **AuthGuard** — client-side wrapper in `app/layout.tsx`. Checks Supabase session, shows `AuthDrawer` overlay when not authenticated, calls `/api/setup` on session detect.
- **Roles**: `admin` (full CRUD, scraper, GT export) / `member` (read + create quotes)
- **Multi-org**: users can belong to multiple orgs, switch via profile
- **Azure AD scopes granted**: `User.Read`, `email`, `profile`, `openid`, `offline_access`, `Files.ReadWrite.All`, `Sites.Read.All`, `Sites.ReadWrite.All`, `Sites.Manage.All`, `Mail.Send`, `Calendars.ReadWrite`, `Contacts.Read`, `Tasks.ReadWrite`

---

## 19. File Storage

### Storage Architecture: Supabase = Brain, SharePoint = File Cabinet

| Layer | Purpose | What Lives Here |
|-------|---------|-----------------|
| **Supabase** (PostgreSQL + pgvector) | Metadata, search indexes, embeddings, app state | Product records, quote data, regulation sections, chat history, RLS-protected rows |
| **Supabase Storage** | Small files + fallback | Files <10MB when SharePoint not configured, temporary uploads |
| **SharePoint** (via Microsoft Graph API) | All documents (primary file store) | Scraped PDFs, datasheets, quote exports, Golden Thread packages, survey scans |

### SharePoint Folder Structure

```
/hf.bluebook/
  ├── Quotes/              HF-Q-0001.pdf, HF-Q-0001.xlsx
  ├── Products/            {manufacturer}/spec.pdf, datasheet.pdf
  ├── Compliance/          Regulation PDFs, scraped content
  ├── GoldenThread/        {package_ref}/handover.pdf, audit.csv
  └── Projects/            Project-specific files
```

### SharePoint Integration

- **Graph API**: `PUT /drives/{driveId}/items/{parentId}:/{filename}:/content` for uploads
- **Large files (>4MB)**: Use upload session API for chunked upload
- **Config**: `sharepoint_site_id` + `sharepoint_drive_id` stored on `organizations` table
- **Fallback**: If SharePoint not configured or token expired → Supabase Storage (no data loss)
- **File links**: UI shows SharePoint `webUrl` links that open in browser/SharePoint

### Legacy Storage (still works)

| Condition | Storage | Path |
|-----------|---------|------|
| File < 10MB (no SharePoint) | Supabase Storage | `product-files/{org_id}/{product_id}/{filename}` |
| Golden Thread exports (no SharePoint) | Supabase Storage | `golden-thread/{org_id}/{package_ref}/{filename}` |

---

## 20. External Integrations

| Service | Purpose | Existing? |
|---------|---------|-----------|
| **Supabase** | PostgreSQL + pgvector + Auth + Storage | Yes |
| **OpenAI** | GPT-4o-mini (chat), GPT-4o (normalizer), text-embedding-3-small (embeddings) | Yes |
| **Anthropic** | Claude claude-sonnet-4-5 (KNOWLEDGE/FULL modes) | NEW |
| **Inngest** | Background job queue (scraping, embeddings, emails, GT generation) | NEW |
| **Playwright** | Web scraping (runs on Inngest infrastructure) | NEW |
| **Resend** | Transactional email (quote sending, invites) | Yes |
| **Stripe** | Payments (disabled for now) | Yes |
| **Twilio** | WhatsApp integration | Yes |
| **Microsoft Graph** | OneDrive/SharePoint file access (OAuth) | Yes |

---

## 21. Key Patterns

### HSL Theming (shadcn/ui)
CSS custom properties in `globals.css` use HSL format: `--primary: 209 100% 33%`. Tailwind maps via `hsl(var(--primary))`.

### Custom Events
Components communicate via `window.dispatchEvent(new CustomEvent('eventName', { detail }))`. Examples: `toggleProjectsPanel`, `openProfileDrawer`, `activeProjectChanged`.

### Drawer Architecture
Right-side drawers (About, Help, Legal, Profile, Settings) open via custom events. LeftSidebar is fixed 64px. ProjectsPanel slides from left.

### Blue Gradient Mouse Tracker
The body background includes a blue gradient that follows the mouse cursor. This is a core visual element — do NOT remove or override it when making changes to `app/layout.tsx` or `app/page.tsx`.

### HF Brand Colors
- Primary Blue: `#0056a7` (HSL 209 100% 33%)
- Button Blue: `#1863dc` (HSL 217 80% 48%)
- Cyan Accent: `#0693e3` (HSL 202 95% 46%)
- Text: `#212121` / Light Gray: `#f4f4f4` / Border: `#ebebeb`
