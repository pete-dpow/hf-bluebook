-- ============================================================
-- 007_cde_fix_statuses.sql — Fix CHECK constraints to UPPERCASE
-- Safety migration for databases where 006 was applied with lowercase
-- ============================================================

-- Mail status: 'outstanding' → 'OPEN', all uppercase
ALTER TABLE cde_mail DROP CONSTRAINT IF EXISTS cde_mail_status_check;
UPDATE cde_mail SET status = UPPER(CASE WHEN status = 'outstanding' THEN 'OPEN' ELSE status END) WHERE status != UPPER(status) OR status = 'outstanding';
ALTER TABLE cde_mail ADD CONSTRAINT cde_mail_status_check CHECK (status IN ('OPEN','OVERDUE','RESPONDED','CLOSED'));
ALTER TABLE cde_mail ALTER COLUMN status SET DEFAULT 'OPEN';

-- Mail priority
ALTER TABLE cde_mail DROP CONSTRAINT IF EXISTS cde_mail_priority_check;
UPDATE cde_mail SET priority = UPPER(priority) WHERE priority != UPPER(priority);
ALTER TABLE cde_mail ADD CONSTRAINT cde_mail_priority_check CHECK (priority IN ('CRITICAL','HIGH','MEDIUM','LOW'));
ALTER TABLE cde_mail ALTER COLUMN priority SET DEFAULT 'MEDIUM';

-- Issue status: 'ready_to_inspect' → 'INSPECT', all uppercase
ALTER TABLE cde_issues DROP CONSTRAINT IF EXISTS cde_issues_status_check;
UPDATE cde_issues SET status = CASE
  WHEN status = 'ready_to_inspect' THEN 'INSPECT'
  ELSE UPPER(status)
END WHERE status != UPPER(status) OR status = 'ready_to_inspect';
ALTER TABLE cde_issues ADD CONSTRAINT cde_issues_status_check CHECK (status IN ('OPEN','WORK_DONE','INSPECT','CLOSED'));
ALTER TABLE cde_issues ALTER COLUMN status SET DEFAULT 'OPEN';

-- Issue priority
ALTER TABLE cde_issues DROP CONSTRAINT IF EXISTS cde_issues_priority_check;
UPDATE cde_issues SET priority = UPPER(priority) WHERE priority != UPPER(priority);
ALTER TABLE cde_issues ADD CONSTRAINT cde_issues_priority_check CHECK (priority IN ('CRITICAL','HIGH','MEDIUM','LOW'));
ALTER TABLE cde_issues ALTER COLUMN priority SET DEFAULT 'MEDIUM';

-- Workflow status
ALTER TABLE cde_workflows DROP CONSTRAINT IF EXISTS cde_workflows_status_check;
UPDATE cde_workflows SET status = UPPER(status) WHERE status != UPPER(status);
ALTER TABLE cde_workflows ADD CONSTRAINT cde_workflows_status_check CHECK (status IN ('ACTIVE','COMPLETED','CANCELLED'));
ALTER TABLE cde_workflows ALTER COLUMN status SET DEFAULT 'ACTIVE';

-- Workflow step status
ALTER TABLE cde_workflow_steps DROP CONSTRAINT IF EXISTS cde_workflow_steps_status_check;
UPDATE cde_workflow_steps SET status = UPPER(status) WHERE status != UPPER(status);
ALTER TABLE cde_workflow_steps ADD CONSTRAINT cde_workflow_steps_status_check CHECK (status IN ('PENDING','ACTIVE','COMPLETED','SKIPPED'));
ALTER TABLE cde_workflow_steps ALTER COLUMN status SET DEFAULT 'PENDING';

-- Notification channel
ALTER TABLE cde_notifications_log DROP CONSTRAINT IF EXISTS cde_notifications_log_channel_check;
UPDATE cde_notifications_log SET channel = UPPER(channel) WHERE channel != UPPER(channel);
ALTER TABLE cde_notifications_log ADD CONSTRAINT cde_notifications_log_channel_check CHECK (channel IN ('SMS','EMAIL','BOTH'));
