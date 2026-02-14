-- Phase A: SP.2 — Add SharePoint config columns to organizations table
-- Stores the SharePoint site + document library chosen by each org

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sharepoint_site_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sharepoint_drive_id TEXT;
