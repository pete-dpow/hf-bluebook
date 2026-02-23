-- 008: Add missing UNIQUE constraint on (project_id, issue_number)
-- This prevents duplicate issue numbers within a project

ALTER TABLE cde_issues
  ADD CONSTRAINT cde_issues_project_number_unique UNIQUE (project_id, issue_number);
