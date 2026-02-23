// lib/cde/picklists.ts — CDE picklist constants (ISO 19650 fields)

// ── Document Types ──────────────────────────────────────────────
export const DOC_TYPES = [
  { code: "FRA", label: "Fire Risk Assessment" },
  { code: "FDS", label: "Fire Door Schedule" },
  { code: "FSC", label: "Fire Stopping Certificate" },
  { code: "DWG", label: "Drawing" },
  { code: "RPT", label: "Report" },
  { code: "SPC", label: "Specification" },
  { code: "SCH", label: "Schedule" },
  { code: "CAL", label: "Calculation" },
  { code: "CRT", label: "Certificate" },
  { code: "PHO", label: "Photograph" },
  { code: "COR", label: "Correspondence" },
  { code: "MIN", label: "Minutes" },
  { code: "PRG", label: "Programme" },
  { code: "HSE", label: "Health & Safety" },
  { code: "QAR", label: "QA Record" },
  { code: "GEN", label: "General" },
] as const;

export const DOC_TYPE_CODES = DOC_TYPES.map((d) => d.code);

// ── Functional Breakdown ────────────────────────────────────────
export const FUNCTIONAL_CODES = [
  { code: "FD", label: "Fire Doors" },
  { code: "FS", label: "Fire Stopping" },
  { code: "DM", label: "Dampers" },
  { code: "CM", label: "Compartmentation" },
  { code: "AO", label: "AOV Systems" },
  { code: "AL", label: "Alarm Systems" },
  { code: "SP", label: "Sprinkler Systems" },
  { code: "EM", label: "Emergency Lighting" },
  { code: "SG", label: "Signage" },
  { code: "ST", label: "Structural Fire Protection" },
  { code: "EX", label: "External Wall Systems" },
  { code: "GN", label: "General" },
] as const;

// ── Spatial / Zone ──────────────────────────────────────────────
export const SPATIAL_CODES = [
  { code: "ZZ", label: "All Zones / Site-wide" },
  { code: "BL", label: "Block / Building" },
  { code: "CO", label: "Common Areas" },
  { code: "RO", label: "Roof" },
  { code: "BS", label: "Basement" },
  { code: "EX", label: "External" },
  { code: "ST", label: "Stairwell" },
  { code: "CR", label: "Corridor" },
  { code: "RS", label: "Riser" },
  { code: "FL", label: "Flat / Unit" },
] as const;

// ── Roles ───────────────────────────────────────────────────────
export const ROLE_CODES = [
  { code: "A", label: "Architect" },
  { code: "C", label: "Contractor" },
  { code: "D", label: "Designer" },
  { code: "E", label: "Engineer" },
  { code: "F", label: "Fire Engineer" },
  { code: "I", label: "Inspector" },
  { code: "M", label: "Manager" },
  { code: "S", label: "Surveyor" },
  { code: "T", label: "Third Party" },
] as const;

// ── Document Status (ISO 19650 Suitability Codes) ───────────────
export const DOC_STATUSES = [
  { code: "S0", label: "Work in Progress", color: "#9ca3af" },
  { code: "S1", label: "For Coordination", color: "#3b82f6" },
  { code: "S3", label: "For Review & Comment", color: "#8b5cf6" },
  { code: "S4", label: "For Stage Approval", color: "#d97706" },
  { code: "A", label: "Approved", color: "#4d7c0f" },
  { code: "B", label: "Approved with Comments", color: "#4d7c0f" },
  { code: "C", label: "Not Approved", color: "#dc2626" },
  { code: "CR", label: "Closed / Archived", color: "#6b7280" },
] as const;

// ── Issue Types ─────────────────────────────────────────────────
export const ISSUE_TYPES = [
  { code: "FD-DEF", label: "Fire Door Defect" },
  { code: "FS-DEF", label: "Fire Stopping Defect" },
  { code: "CM-BRE", label: "Compartmentation Breach" },
  { code: "DM-DEF", label: "Damper Defect" },
  { code: "AOV-DEF", label: "AOV Defect" },
  { code: "SNG", label: "Snagging" },
  { code: "NCN", label: "Non-Conformance" },
  { code: "GEN", label: "General Issue" },
] as const;

// ── Mail Types ──────────────────────────────────────────────────
export const MAIL_TYPES = [
  { code: "RFI", label: "Request for Information" },
  { code: "SI", label: "Site Instruction" },
  { code: "QRY", label: "Query" },
] as const;

// ── Visit Types ─────────────────────────────────────────────────
export const VISIT_TYPES = [
  { code: "fire_door_survey", label: "Fire Door Survey" },
  { code: "fire_stopping_works", label: "Fire Stopping Works" },
  { code: "damper_inspection", label: "Damper Inspection" },
  { code: "general_survey", label: "General Survey" },
  { code: "access_check", label: "Access Check" },
] as const;

// ── Priority Levels ─────────────────────────────────────────────
export const PRIORITIES = [
  { code: "CRITICAL", label: "Critical", color: "#dc2626" },
  { code: "HIGH", label: "High", color: "#d97706" },
  { code: "MEDIUM", label: "Medium", color: "#3b82f6" },
  { code: "LOW", label: "Low", color: "#9ca3af" },
] as const;

// ── Project Statuses ────────────────────────────────────────────
export const PROJECT_STATUSES = [
  { code: "active", label: "Active", color: "#4d7c0f" },
  { code: "on_hold", label: "On Hold", color: "#d97706" },
  { code: "completed", label: "Completed", color: "#3b82f6" },
  { code: "archived", label: "Archived", color: "#9ca3af" },
] as const;

// ── Mail Statuses ──────────────────────────────────────────
export const MAIL_STATUSES = [
  { code: "OPEN", label: "Open", color: "#d97706" },
  { code: "OVERDUE", label: "Overdue", color: "#dc2626" },
  { code: "RESPONDED", label: "Responded", color: "#4d7c0f" },
  { code: "CLOSED", label: "Closed", color: "#6b7280" },
] as const;

// ── Issue Statuses ─────────────────────────────────────────
export const ISSUE_STATUSES = [
  { code: "OPEN", label: "Open", color: "#dc2626" },
  { code: "WORK_DONE", label: "Work Done", color: "#d97706" },
  { code: "INSPECT", label: "Inspect", color: "#ea580c" },
  { code: "CLOSED", label: "Closed", color: "#4d7c0f" },
] as const;
