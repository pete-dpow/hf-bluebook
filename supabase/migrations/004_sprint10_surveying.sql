-- Sprint 10: Surveying Module — 4 tables, 1 sequence, 7 indexes, 10 RLS policies
-- Point cloud upload, floor/wall detection, plan export

-- ============================================================
-- 1. TABLES
-- ============================================================

-- survey_scans — uploaded point cloud files
CREATE TABLE IF NOT EXISTS survey_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  scan_name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_format TEXT NOT NULL CHECK (file_format IN ('las','laz','e57')),
  storage_path TEXT NOT NULL,
  converted_storage_path TEXT,
  file_size_bytes BIGINT NOT NULL,
  point_count BIGINT,
  decimated_storage_path TEXT,
  decimated_point_count INTEGER,
  bounds_min JSONB,
  bounds_max JSONB,
  coordinate_system TEXT,
  scanner_model TEXT DEFAULT 'Leica BLK360',
  scan_date TIMESTAMPTZ,
  processing_status TEXT DEFAULT 'uploaded' CHECK (processing_status IN ('uploaded','converting','processing','ready','failed')),
  processing_error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- survey_floors — detected floor levels per scan
CREATE TABLE IF NOT EXISTS survey_floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES survey_scans(id) ON DELETE CASCADE,
  floor_label TEXT NOT NULL,
  z_height_m NUMERIC(8,3) NOT NULL,
  z_range_min NUMERIC(8,3) NOT NULL,
  z_range_max NUMERIC(8,3) NOT NULL,
  point_count INTEGER,
  confidence NUMERIC(5,2),
  is_confirmed BOOLEAN DEFAULT FALSE,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- survey_walls — detected walls per floor
CREATE TABLE IF NOT EXISTS survey_walls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES survey_floors(id) ON DELETE CASCADE,
  wall_label TEXT,
  start_x NUMERIC(10,3) NOT NULL,
  start_y NUMERIC(10,3) NOT NULL,
  end_x NUMERIC(10,3) NOT NULL,
  end_y NUMERIC(10,3) NOT NULL,
  thickness_mm NUMERIC(8,1),
  length_mm NUMERIC(10,1) NOT NULL,
  wall_type TEXT DEFAULT 'detected' CHECK (wall_type IN ('detected','manual','adjusted')),
  confidence NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- survey_plans — generated PDF/DXF exports
CREATE TABLE IF NOT EXISTS survey_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES survey_floors(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_reference TEXT UNIQUE NOT NULL,
  plan_format TEXT NOT NULL CHECK (plan_format IN ('pdf','dxf')),
  paper_size TEXT DEFAULT 'A3' CHECK (paper_size IN ('A1','A3','A4')),
  scale TEXT DEFAULT '1:100',
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- ============================================================
-- 2. SEQUENCE
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS plan_number_seq START 1 INCREMENT 1;

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_survey_scans_org ON survey_scans(organization_id);
CREATE INDEX IF NOT EXISTS idx_survey_scans_project ON survey_scans(project_id);
CREATE INDEX IF NOT EXISTS idx_survey_scans_status ON survey_scans(processing_status);
CREATE INDEX IF NOT EXISTS idx_survey_floors_scan ON survey_floors(scan_id);
CREATE INDEX IF NOT EXISTS idx_survey_walls_floor ON survey_walls(floor_id);
CREATE INDEX IF NOT EXISTS idx_survey_plans_floor ON survey_plans(floor_id);
CREATE INDEX IF NOT EXISTS idx_survey_plans_org ON survey_plans(organization_id);

-- ============================================================
-- 4. RLS
-- ============================================================

ALTER TABLE survey_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_walls ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_plans ENABLE ROW LEVEL SECURITY;

-- survey_scans: members can view their org's scans
CREATE POLICY survey_scans_select ON survey_scans FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- survey_scans: members can upload
CREATE POLICY survey_scans_insert ON survey_scans FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- survey_scans: admins can update
CREATE POLICY survey_scans_update ON survey_scans FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- survey_scans: admins can delete
CREATE POLICY survey_scans_delete ON survey_scans FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- survey_floors: viewable via scan org membership
CREATE POLICY survey_floors_select ON survey_floors FOR SELECT USING (
  scan_id IN (
    SELECT id FROM survey_scans WHERE organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  )
);

-- survey_floors: service role manages (Inngest writes)
CREATE POLICY survey_floors_service ON survey_floors FOR ALL USING (
  auth.role() = 'service_role'
);

-- survey_walls: viewable via floor → scan → org
CREATE POLICY survey_walls_select ON survey_walls FOR SELECT USING (
  floor_id IN (
    SELECT id FROM survey_floors WHERE scan_id IN (
      SELECT id FROM survey_scans WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  )
);

-- survey_walls: service role manages (Inngest writes)
CREATE POLICY survey_walls_service ON survey_walls FOR ALL USING (
  auth.role() = 'service_role'
);

-- survey_plans: viewable by org members
CREATE POLICY survey_plans_select ON survey_plans FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- survey_plans: members can generate
CREATE POLICY survey_plans_insert ON survey_plans FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- 5. STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('survey-scans', 'survey-scans', false, 524288000)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload to their org path
CREATE POLICY survey_scans_storage_insert ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'survey-scans' AND auth.role() = 'authenticated');

CREATE POLICY survey_scans_storage_select ON storage.objects FOR SELECT
USING (bucket_id = 'survey-scans' AND auth.role() = 'authenticated');

CREATE POLICY survey_scans_storage_delete ON storage.objects FOR DELETE
USING (bucket_id = 'survey-scans' AND auth.role() = 'authenticated');
