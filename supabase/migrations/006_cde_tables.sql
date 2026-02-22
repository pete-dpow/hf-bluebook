-- ============================================================
-- 006_cde_tables.sql — Common Data Environment tables
-- All tables prefixed with cde_ — does NOT touch existing tables
-- ============================================================

-- ── Clients ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cde_clients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  short_code    TEXT NOT NULL UNIQUE,
  sharepoint_library_name TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Projects ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cde_projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES cde_clients(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  project_code  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_hold','completed','archived')),
  start_date    DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, project_code)
);

-- ── Documents ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cde_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES cde_projects(id) ON DELETE CASCADE,
  doc_number        TEXT NOT NULL,
  title             TEXT NOT NULL,
  doc_type          TEXT NOT NULL,
  functional        TEXT,
  spatial           TEXT,
  role              TEXT,
  revision          TEXT NOT NULL DEFAULT 'A',
  version           INTEGER NOT NULL DEFAULT 1,
  status            TEXT NOT NULL DEFAULT 'S0' CHECK (status IN ('S0','S1','S3','S4','A','B','C','CR')),
  discipline        TEXT,
  building          TEXT,
  level             TEXT,
  file_name         TEXT,
  file_size         BIGINT,
  sharepoint_item_id TEXT,
  sharepoint_url    TEXT,
  author_id         UUID,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_latest         BOOLEAN NOT NULL DEFAULT true,
  needs_metadata    BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (project_id, doc_number)
);

CREATE INDEX idx_cde_documents_project ON cde_documents(project_id);
CREATE INDEX idx_cde_documents_status ON cde_documents(status);
CREATE INDEX idx_cde_documents_doc_type ON cde_documents(doc_type);

-- ── Document Versions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cde_document_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       UUID NOT NULL REFERENCES cde_documents(id) ON DELETE CASCADE,
  version_number    INTEGER NOT NULL,
  revision          TEXT NOT NULL,
  file_name         TEXT,
  sharepoint_item_id TEXT,
  uploaded_by       UUID,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  superseded_at     TIMESTAMPTZ
);

CREATE INDEX idx_cde_doc_versions_doc ON cde_document_versions(document_id);

-- ── Mail / Correspondence ────────────────────────────────────
CREATE TABLE IF NOT EXISTS cde_mail (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES cde_projects(id) ON DELETE CASCADE,
  mail_number   TEXT NOT NULL,
  mail_type     TEXT NOT NULL CHECK (mail_type IN ('RFI','SI','QRY')),
  subject       TEXT NOT NULL,
  body          TEXT,
  from_user_id  UUID,
  to_user_id    UUID,
  status        TEXT NOT NULL DEFAULT 'outstanding' CHECK (status IN ('outstanding','overdue','responded','closed')),
  priority      TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  due_date      DATE,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at     TIMESTAMPTZ,
  UNIQUE (project_id, mail_number)
);

CREATE INDEX idx_cde_mail_project ON cde_mail(project_id);
CREATE INDEX idx_cde_mail_status ON cde_mail(status);

-- ── Mail Responses ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cde_mail_responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_id       UUID NOT NULL REFERENCES cde_mail(id) ON DELETE CASCADE,
  response_body TEXT NOT NULL,
  from_user_id  UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cde_mail_responses_mail ON cde_mail_responses(mail_id);

-- ── Field Issues ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cde_issues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES cde_projects(id) ON DELETE CASCADE,
  issue_number    TEXT NOT NULL,
  issue_type      TEXT NOT NULL CHECK (issue_type IN ('FD-DEF','FS-DEF','CM-BRE','DM-DEF','AOV-DEF','SNG','NCN','GEN')),
  title           TEXT NOT NULL,
  description     TEXT,
  building        TEXT,
  level           TEXT,
  location_detail TEXT,
  assigned_to     UUID,
  priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','work_done','ready_to_inspect','closed')),
  raised_by       UUID,
  raised_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date        DATE,
  closed_at       TIMESTAMPTZ
);

CREATE INDEX idx_cde_issues_project ON cde_issues(project_id);
CREATE INDEX idx_cde_issues_status ON cde_issues(status);

-- ── Workflows ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cde_workflows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID REFERENCES cde_documents(id) ON DELETE SET NULL,
  project_id      UUID NOT NULL REFERENCES cde_projects(id) ON DELETE CASCADE,
  workflow_type   TEXT NOT NULL DEFAULT 'approval',
  current_step    INTEGER NOT NULL DEFAULT 1,
  total_steps     INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  started_by      UUID,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date        DATE,
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_cde_workflows_project ON cde_workflows(project_id);
CREATE INDEX idx_cde_workflows_status ON cde_workflows(status);

-- ── Workflow Steps ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cde_workflow_steps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     UUID NOT NULL REFERENCES cde_workflows(id) ON DELETE CASCADE,
  step_number     INTEGER NOT NULL,
  step_name       TEXT NOT NULL,
  assigned_to     UUID,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','skipped')),
  completed_by    UUID,
  completed_at    TIMESTAMPTZ,
  notes           TEXT
);

CREATE INDEX idx_cde_wf_steps_workflow ON cde_workflow_steps(workflow_id);

-- ── Audit Log (IMMUTABLE) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS cde_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     UUID,
  entity_ref    TEXT,
  user_id       UUID,
  user_name     TEXT,
  detail        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cde_audit_created ON cde_audit_log(created_at DESC);
CREATE INDEX idx_cde_audit_entity ON cde_audit_log(entity_type, entity_id);

-- Immutable trigger: block UPDATE and DELETE on cde_audit_log
CREATE OR REPLACE FUNCTION cde_audit_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'cde_audit_log is immutable — UPDATE and DELETE are not permitted';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cde_audit_immutable ON cde_audit_log;
CREATE TRIGGER trg_cde_audit_immutable
  BEFORE UPDATE OR DELETE ON cde_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION cde_audit_immutable();

-- ── Residents ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cde_residents (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               UUID NOT NULL REFERENCES cde_clients(id) ON DELETE CASCADE,
  project_id              UUID REFERENCES cde_projects(id) ON DELETE SET NULL,
  building                TEXT,
  flat_ref                TEXT,
  level                   TEXT,
  first_name              TEXT NOT NULL,
  last_name               TEXT NOT NULL,
  mobile                  TEXT,
  email                   TEXT,
  sms_opt_in              BOOLEAN NOT NULL DEFAULT false,
  email_opt_in            BOOLEAN NOT NULL DEFAULT true,
  portal_token            UUID UNIQUE DEFAULT gen_random_uuid(),
  portal_token_expires_at TIMESTAMPTZ,
  availability_notes      TEXT,
  last_active_at          TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cde_residents_client ON cde_residents(client_id);
CREATE INDEX idx_cde_residents_token ON cde_residents(portal_token);

-- ── Visits ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cde_visits (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES cde_projects(id) ON DELETE CASCADE,
  client_id             UUID NOT NULL REFERENCES cde_clients(id) ON DELETE CASCADE,
  visit_date            DATE NOT NULL,
  start_time            TIME,
  end_time              TIME,
  visit_type            TEXT NOT NULL CHECK (visit_type IN ('fire_door_survey','fire_stopping_works','damper_inspection','general_survey','access_check')),
  lead_surveyor         TEXT,
  buildings             TEXT[] DEFAULT '{}',
  flat_access_required  BOOLEAN NOT NULL DEFAULT false,
  notes_for_residents   TEXT,
  cal_event_id          TEXT,
  notified_at           TIMESTAMPTZ,
  created_by            UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cde_visits_project ON cde_visits(project_id);
CREATE INDEX idx_cde_visits_date ON cde_visits(visit_date);

-- ── Notifications Log ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cde_notifications_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id          UUID REFERENCES cde_visits(id) ON DELETE SET NULL,
  resident_ids      UUID[] DEFAULT '{}',
  channel           TEXT NOT NULL CHECK (channel IN ('sms','email','both')),
  subject           TEXT,
  body              TEXT,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by           UUID,
  resend_batch_id   TEXT,
  twilio_batch_id   TEXT,
  recipient_count   INTEGER NOT NULL DEFAULT 0,
  opened_count      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_cde_notif_visit ON cde_notifications_log(visit_id);

-- ============================================================
-- RLS Policies — all cde_ tables
-- ============================================================

ALTER TABLE cde_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cde_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cde_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cde_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cde_mail ENABLE ROW LEVEL SECURITY;
ALTER TABLE cde_mail_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cde_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE cde_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE cde_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE cde_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cde_residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cde_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cde_notifications_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users: full access (single-org: Harmony Fire)
CREATE POLICY "cde_clients_all" ON cde_clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cde_projects_all" ON cde_projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cde_documents_all" ON cde_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cde_document_versions_all" ON cde_document_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cde_mail_all" ON cde_mail FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cde_mail_responses_all" ON cde_mail_responses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cde_issues_all" ON cde_issues FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cde_workflows_all" ON cde_workflows FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cde_workflow_steps_all" ON cde_workflow_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cde_residents_all" ON cde_residents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cde_visits_all" ON cde_visits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cde_notifications_log_all" ON cde_notifications_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Audit log: INSERT only for authenticated, no UPDATE/DELETE (trigger also blocks)
CREATE POLICY "cde_audit_insert" ON cde_audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cde_audit_select" ON cde_audit_log FOR SELECT TO authenticated USING (true);

-- Service role (supabaseAdmin) bypasses RLS automatically
