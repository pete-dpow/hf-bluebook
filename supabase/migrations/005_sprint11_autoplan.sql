-- Sprint 11: AutoPlan Module — 5 tables, 1 sequence, 8 indexes, 12 RLS policies
-- Building fire strategy plans: floor upload, AI analysis, symbol placement, approval workflow

-- ============================================================
-- 1. TABLES
-- ============================================================

-- autoplan_buildings — building metadata for fire strategy plans
CREATE TABLE IF NOT EXISTS autoplan_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  postcode TEXT,
  jurisdiction TEXT NOT NULL CHECK (jurisdiction IN ('england','scotland','wales')),
  height_metres NUMERIC(8,2),
  number_of_storeys INTEGER,
  building_use TEXT NOT NULL CHECK (building_use IN ('residential_high_rise','residential_low_rise','mixed_use','care_home','student_accommodation','hotel','office','retail')),
  evacuation_strategy TEXT NOT NULL CHECK (evacuation_strategy IN ('stay_put','simultaneous','phased','progressive_horizontal','defend_in_place')),
  has_sprinklers BOOLEAN DEFAULT FALSE,
  has_dry_riser BOOLEAN DEFAULT FALSE,
  has_wet_riser BOOLEAN DEFAULT FALSE,
  number_of_firefighting_lifts INTEGER DEFAULT 0,
  responsible_person TEXT,
  rp_contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- autoplan_floors — uploaded floor plan images per building
CREATE TABLE IF NOT EXISTS autoplan_floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES autoplan_buildings(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  floor_number INTEGER NOT NULL,
  floor_name TEXT,
  storage_path TEXT NOT NULL,
  preview_storage_path TEXT,
  original_filename TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  page_width_px INTEGER,
  page_height_px INTEGER,
  scale TEXT,
  ai_analysis_status TEXT DEFAULT 'pending' CHECK (ai_analysis_status IN ('pending','analyzing','completed','failed')),
  ai_analysis_result JSONB,
  ai_confidence NUMERIC(4,3) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  ai_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (building_id, floor_number)
);

-- autoplan_plans — generated fire strategy plans per floor
CREATE TABLE IF NOT EXISTS autoplan_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES autoplan_floors(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES autoplan_buildings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  plan_reference TEXT UNIQUE NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','review','approved','superseded')),
  symbol_data JSONB DEFAULT '[]'::jsonb,
  annotations JSONB DEFAULT '[]'::jsonb,
  canvas_viewport JSONB,
  final_pdf_path TEXT,
  final_pdf_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- autoplan_approvals — approval records for plans
CREATE TABLE IF NOT EXISTS autoplan_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES autoplan_plans(id) ON DELETE CASCADE,
  approved_by UUID NOT NULL REFERENCES auth.users(id),
  approver_name TEXT NOT NULL,
  approver_qualifications TEXT,
  approver_company TEXT DEFAULT 'Harmony Fire',
  attestation TEXT DEFAULT 'I confirm that I have reviewed this fire strategy plan and that it accurately represents the fire safety provisions for the building. The plan has been prepared in accordance with the relevant regulatory requirements and approved codes of practice.',
  checklist_results JSONB NOT NULL,
  approved_at TIMESTAMPTZ DEFAULT NOW()
);

-- autoplan_audit_log — immutable audit trail for all autoplan actions
CREATE TABLE IF NOT EXISTS autoplan_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. SEQUENCE
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS autoplan_number_seq START 1 INCREMENT 1;

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_autoplan_buildings_org ON autoplan_buildings(organization_id);
CREATE INDEX IF NOT EXISTS idx_autoplan_buildings_created_by ON autoplan_buildings(created_by);
CREATE INDEX IF NOT EXISTS idx_autoplan_floors_building ON autoplan_floors(building_id);
CREATE INDEX IF NOT EXISTS idx_autoplan_floors_status ON autoplan_floors(ai_analysis_status);
CREATE INDEX IF NOT EXISTS idx_autoplan_plans_floor ON autoplan_plans(floor_id);
CREATE INDEX IF NOT EXISTS idx_autoplan_plans_org ON autoplan_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_autoplan_plans_status ON autoplan_plans(status);
CREATE INDEX IF NOT EXISTS idx_autoplan_audit_log_entity ON autoplan_audit_log(entity_type, entity_id);

-- ============================================================
-- 4. RLS
-- ============================================================

ALTER TABLE autoplan_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE autoplan_floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE autoplan_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE autoplan_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE autoplan_audit_log ENABLE ROW LEVEL SECURITY;

-- autoplan_buildings: members can view their org's buildings
CREATE POLICY autoplan_buildings_select ON autoplan_buildings FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- autoplan_buildings: members can create buildings in their org
CREATE POLICY autoplan_buildings_insert ON autoplan_buildings FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- autoplan_buildings: admins can update
CREATE POLICY autoplan_buildings_update ON autoplan_buildings FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- autoplan_buildings: admins can delete
CREATE POLICY autoplan_buildings_delete ON autoplan_buildings FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- autoplan_floors: members can view via building org membership
CREATE POLICY autoplan_floors_select ON autoplan_floors FOR SELECT USING (
  building_id IN (
    SELECT id FROM autoplan_buildings WHERE organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
);

-- autoplan_floors: members can manage via building org membership
CREATE POLICY autoplan_floors_all ON autoplan_floors FOR ALL USING (
  building_id IN (
    SELECT id FROM autoplan_buildings WHERE organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
);

-- autoplan_plans: members can view their org's plans
CREATE POLICY autoplan_plans_select ON autoplan_plans FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- autoplan_plans: members can manage their org's plans
CREATE POLICY autoplan_plans_all ON autoplan_plans FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- autoplan_approvals: members can view via plan org membership
CREATE POLICY autoplan_approvals_select ON autoplan_approvals FOR SELECT USING (
  plan_id IN (
    SELECT id FROM autoplan_plans WHERE organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
);

-- autoplan_approvals: admins can insert via plan org membership
CREATE POLICY autoplan_approvals_insert ON autoplan_approvals FOR INSERT WITH CHECK (
  plan_id IN (
    SELECT id FROM autoplan_plans WHERE organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
);

-- autoplan_audit_log: users can view their own audit entries
CREATE POLICY autoplan_audit_log_select ON autoplan_audit_log FOR SELECT USING (
  user_id = auth.uid()
);

-- ============================================================
-- 5. STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('autoplan', 'autoplan', false, 104857600)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload to autoplan bucket
CREATE POLICY autoplan_storage_insert ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'autoplan' AND auth.role() = 'authenticated');

CREATE POLICY autoplan_storage_select ON storage.objects FOR SELECT
USING (bucket_id = 'autoplan' AND auth.role() = 'authenticated');

CREATE POLICY autoplan_storage_delete ON storage.objects FOR DELETE
USING (bucket_id = 'autoplan' AND auth.role() = 'authenticated');
