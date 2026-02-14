// lib/autoplan/types.ts — TypeScript interfaces for AutoPlan module

// ─── Database types ────────────────────────────────────────

export interface AutoplanBuilding {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  postcode: string;
  jurisdiction: "england" | "scotland" | "wales";
  height_metres?: number;
  number_of_storeys: number;
  building_use: BuildingUse;
  evacuation_strategy: EvacuationStrategy;
  has_sprinklers: boolean;
  has_dry_riser: boolean;
  has_wet_riser: boolean;
  number_of_firefighting_lifts: number;
  responsible_person?: string;
  rp_contact_email?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type BuildingUse =
  | "residential_high_rise"
  | "residential_low_rise"
  | "mixed_use"
  | "care_home"
  | "student_accommodation"
  | "hotel"
  | "office"
  | "retail";

export type EvacuationStrategy =
  | "stay_put"
  | "simultaneous"
  | "phased"
  | "progressive_horizontal"
  | "defend_in_place";

export interface AutoplanFloor {
  id: string;
  building_id: string;
  uploaded_by: string;
  floor_number: number;
  floor_name?: string;
  storage_path: string;
  preview_storage_path?: string;
  original_filename: string;
  file_size_bytes: number;
  page_width_px?: number;
  page_height_px?: number;
  scale?: string;
  ai_analysis_status: "pending" | "analyzing" | "completed" | "failed";
  ai_analysis_result?: AIAnalysisResult;
  ai_confidence?: number;
  ai_error?: string;
  created_at: string;
  updated_at: string;
}

export interface AutoplanPlan {
  id: string;
  floor_id: string;
  building_id: string;
  organization_id: string;
  created_by: string;
  plan_reference: string;
  version: number;
  status: "draft" | "review" | "approved" | "superseded";
  symbol_data: PlacedSymbol[];
  annotations: Annotation[];
  canvas_viewport?: CanvasViewport;
  final_pdf_path?: string;
  final_pdf_size?: number;
  created_at: string;
  updated_at: string;
}

export interface AutoplanApproval {
  id: string;
  plan_id: string;
  approved_by: string;
  approver_name: string;
  approver_qualifications: string;
  approver_company: string;
  attestation: string;
  checklist_results: ComplianceChecklist;
  approved_at: string;
}

// ─── Symbol types ──────────────────────────────────────────

export type SymbolCategory =
  | "escape"
  | "equipment"
  | "doors"
  | "detection"
  | "suppression"
  | "lighting";

export interface SymbolDefinition {
  id: string;
  label: string;
  shortLabel: string;
  category: SymbolCategory;
  color: string;
  bgColor: string;
  bsReference: string;
  defaultWidth: number;
  defaultHeight: number;
}

export interface PlacedSymbol {
  instanceId: string;
  symbolId: string;
  x: number; // 0-1 normalised
  y: number; // 0-1 normalised
  rotation: number; // degrees
  scale: number; // 1.0 = default
  label?: string;
  metadata?: Record<string, string>;
}

// ─── Annotation types ──────────────────────────────────────

export interface Annotation {
  id: string;
  type: "text" | "travel_distance" | "arrow" | "zone";
  x: number;
  y: number;
  text?: string;
  fontSize?: number;
  endX?: number;
  endY?: number;
  distanceMetres?: number;
  width?: number;
  height?: number;
  zoneType?: "compartment" | "protected_corridor" | "stairwell";
}

// ─── Canvas types ──────────────────────────────────────────

export interface CanvasViewport {
  zoom: number;
  panX: number;
  panY: number;
}

// ─── AI Analysis types ─────────────────────────────────────

export interface AIAnalysisResult {
  confidence: number;
  scale: string | null;
  elements: {
    exits: Array<{ x: number; y: number; type: string; notes?: string }>;
    fire_doors: Array<{ x: number; y: number; rating: string; notes?: string }>;
    staircases: Array<{ x: number; y: number; type: string; notes?: string }>;
    equipment: Array<{ x: number; y: number; type: string }>;
    corridors: Array<{ x: number; y: number; width: number; height: number; notes?: string }>;
    rooms: Array<{ x: number; y: number; label?: string; type: string }>;
  };
  suggested_symbols: Array<{
    symbolId: string;
    x: number;
    y: number;
    rotation: number;
    label?: string;
  }>;
  warnings: string[];
  regulatory_notes: string[];
}

// ─── Compliance checklist ──────────────────────────────────

export interface ComplianceChecklist {
  exits_marked: boolean;
  doors_labelled: boolean;
  travel_distances_checked: boolean;
  equipment_shown: boolean;
  detection_shown: boolean;
  emergency_lighting_shown: boolean;
  risers_shown: boolean;
  regulatory_text_added: boolean;
}

export const EMPTY_CHECKLIST: ComplianceChecklist = {
  exits_marked: false,
  doors_labelled: false,
  travel_distances_checked: false,
  equipment_shown: false,
  detection_shown: false,
  emergency_lighting_shown: false,
  risers_shown: false,
  regulatory_text_added: false,
};

export const CHECKLIST_LABELS: Record<keyof ComplianceChecklist, string> = {
  exits_marked: "Fire exits marked",
  doors_labelled: "Fire doors labelled with FD rating",
  travel_distances_checked: "Travel distances comply with ADB Table 3.1",
  equipment_shown: "Fire equipment positioned (extinguishers, call points)",
  detection_shown: "Detection shown (smoke/heat detectors per BS 5839-1)",
  emergency_lighting_shown: "Emergency lighting on escape routes (BS 5266-1)",
  risers_shown: "Dry/wet riser positions marked (if applicable)",
  regulatory_text_added: "Regulatory compliance statement present",
};
