/** Surveying module types — point clouds, floors, walls, plans */

export interface SurveyScan {
  id: string;
  organization_id: string;
  project_id: string | null;
  uploaded_by: string;
  scan_name: string;
  original_filename: string;
  file_format: "las" | "laz" | "e57";
  storage_path: string;
  converted_storage_path: string | null;
  file_size_bytes: number;
  point_count: number | null;
  decimated_storage_path: string | null;
  decimated_point_count: number | null;
  bounds_min: { x: number; y: number; z: number } | null;
  bounds_max: { x: number; y: number; z: number } | null;
  coordinate_system: string | null;
  scanner_model: string;
  scan_date: string | null;
  processing_status: "uploaded" | "converting" | "processing" | "ready" | "failed";
  processing_error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SurveyFloor {
  id: string;
  scan_id: string;
  floor_label: string;
  z_height_m: number;
  z_range_min: number;
  z_range_max: number;
  point_count: number | null;
  confidence: number | null;
  is_confirmed: boolean;
  sort_order: number;
  created_at: string;
}

export interface SurveyWall {
  id: string;
  floor_id: string;
  wall_label: string | null;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  thickness_mm: number | null;
  length_mm: number;
  wall_type: "detected" | "manual" | "adjusted";
  confidence: number | null;
  created_at: string;
}

export interface SurveyPlan {
  id: string;
  floor_id: string;
  organization_id: string;
  plan_reference: string;
  plan_format: "pdf" | "dxf";
  paper_size: "A1" | "A3" | "A4";
  scale: string;
  storage_path: string;
  file_size_bytes: number | null;
  generated_by: string;
  generated_at: string;
  metadata: Record<string, unknown>;
}

export interface PointCloudData {
  positions: Float32Array;
  colors: Float32Array | null;
  count: number;
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

export interface DetectedFloor {
  label: string;
  z_height_m: number;
  z_range_min: number;
  z_range_max: number;
  point_count: number;
  confidence: number;
  sort_order: number;
}

export interface DetectedWall {
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  thickness_mm: number;
  length_mm: number;
  confidence: number;
}

export interface PlanLayout {
  paperWidth: number;
  paperHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  walls: { x1: number; y1: number; x2: number; y2: number; length_mm: number }[];
  dimensions: { x1: number; y1: number; x2: number; y2: number; label: string }[];
}

export interface ExportOptions {
  format: "pdf" | "dxf";
  paper_size: "A1" | "A3" | "A4";
  scale: string;
  floor_label: string;
  project_name?: string;
  plan_reference: string;
}
