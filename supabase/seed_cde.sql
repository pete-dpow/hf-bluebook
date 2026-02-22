-- ============================================================
-- seed_cde.sql — Seed data for CDE module
-- Run after 006_cde_tables.sql migration
-- ============================================================

-- ── Clients ─────────────────────────────────────────────────
INSERT INTO cde_clients (id, name, short_code, sharepoint_library_name) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'London Borough of Camden', 'LBC', 'CDE-LBC'),
  ('c0000001-0000-0000-0000-000000000002', 'Peabody Housing Association', 'PHA', 'CDE-PHA'),
  ('c0000001-0000-0000-0000-000000000003', 'L&Q Group', 'LNQ', 'CDE-LNQ')
ON CONFLICT (short_code) DO NOTHING;

-- ── Projects ────────────────────────────────────────────────
INSERT INTO cde_projects (id, client_id, name, project_code, status, start_date) VALUES
  ('p0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'Camden Towers Fire Safety', 'LBC-CTF', 'active', '2025-03-01'),
  ('p0000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'Gospel Oak Estate', 'LBC-GOE', 'active', '2025-06-15'),
  ('p0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000002', 'Peabody Thamesmead', 'PHA-THM', 'active', '2025-01-10'),
  ('p0000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000003', 'Barking Riverside Phase 2', 'LNQ-BR2', 'on_hold', '2025-09-01')
ON CONFLICT (client_id, project_code) DO NOTHING;

-- ── Sample Residents (Camden Towers) ────────────────────────
INSERT INTO cde_residents (client_id, project_id, building, flat_ref, level, first_name, last_name, mobile, email, sms_opt_in, email_opt_in, availability_notes) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'p0000001-0000-0000-0000-000000000001', 'Block A', 'A-101', '1', 'Sarah', 'Johnson', '+447700900001', 'sarah.johnson@example.com', true, true, 'Available weekdays 9am-5pm'),
  ('c0000001-0000-0000-0000-000000000001', 'p0000001-0000-0000-0000-000000000001', 'Block A', 'A-205', '2', 'James', 'Okafor', '+447700900002', 'james.okafor@example.com', true, true, 'Work from home Tue/Thu'),
  ('c0000001-0000-0000-0000-000000000001', 'p0000001-0000-0000-0000-000000000001', 'Block A', 'A-312', '3', 'Maria', 'Garcia', '+447700900003', 'maria.garcia@example.com', false, true, NULL),
  ('c0000001-0000-0000-0000-000000000001', 'p0000001-0000-0000-0000-000000000001', 'Block B', 'B-102', '1', 'David', 'Patel', '+447700900004', 'david.patel@example.com', true, true, 'Keys with concierge'),
  ('c0000001-0000-0000-0000-000000000001', 'p0000001-0000-0000-0000-000000000001', 'Block B', 'B-208', '2', 'Emma', 'Williams', NULL, 'emma.williams@example.com', false, true, 'Fridays only'),
  ('c0000001-0000-0000-0000-000000000002', 'p0000001-0000-0000-0000-000000000002', 'Tower 1', 'T1-04', '0', 'Robert', 'Brown', '+447700900006', 'robert.brown@example.com', true, true, NULL),
  ('c0000001-0000-0000-0000-000000000002', 'p0000001-0000-0000-0000-000000000002', 'Tower 1', 'T1-15', '1', 'Aisha', 'Khan', '+447700900007', 'aisha.khan@example.com', true, false, 'Available after 3pm')
ON CONFLICT DO NOTHING;

-- ── Sample Visits ───────────────────────────────────────────
INSERT INTO cde_visits (project_id, client_id, visit_date, start_time, end_time, visit_type, lead_surveyor, buildings, flat_access_required, notes_for_residents) VALUES
  ('p0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', CURRENT_DATE + INTERVAL '7 days', '09:00', '17:00', 'fire_door_survey', 'Mark Stevens', ARRAY['Block A'], true, 'We will need access to all flats in Block A for fire door inspections. Please ensure someone is home or leave keys with the concierge.'),
  ('p0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', CURRENT_DATE + INTERVAL '14 days', '10:00', '15:00', 'fire_stopping_works', 'Rachel Cooper', ARRAY['Block A', 'Block B'], false, 'Fire stopping works in common areas. No flat access needed.'),
  ('p0000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000002', CURRENT_DATE + INTERVAL '21 days', '08:30', '16:30', 'damper_inspection', 'Tom Richards', ARRAY['Tower 1'], true, 'Damper inspection in all risers.')
ON CONFLICT DO NOTHING;
