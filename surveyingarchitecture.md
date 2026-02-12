# Sprint 10 — Advanced Surveying Features

## Context

Harmony Fire uses Leica BLK360 laser scanners for fire protection surveys. Currently scan data is processed externally. This sprint adds a universal point cloud uploader (E57 + LAS + LAZ), 3D viewing, automated floor/wall detection, and plan export directly within hf.bluebook.

**This is purely additive.** No existing code deleted. The only existing file modified is `lib/inngest/functions.ts` (append to array).

---

## @thatopen vs Three.js — Resolved

| Library | Purpose | Point Cloud Support |
|---------|---------|-------------------|
| `@thatopen/components` v3.2.6 | BIM/IFC viewer wrapper | **None** — IFC only |
| `@thatopen/fragments` v3.2.10 | IFC → Fragment converter | **None** — IFC only |
| `three` v0.175.0 | 3D rendering engine | **Yes** — `THREE.Points`, `PCDLoader`, `PLYLoader` |

**Decision:** Point cloud viewer uses **Three.js directly** (already installed). @thatopen stays for IFC at `/scope`. The surveying viewer at `/surveying` shares the same Three.js foundation but does NOT use @thatopen classes.

**Existing `/scope` untouched.** New `/surveying` is a separate pipeline:
```
/scope:      IFC → @thatopen/fragments IfcImporter → Fragment → OBC.Components viewer
/surveying:  E57/LAS/LAZ → web-e57 + @loaders.gl/las → Float32Array → THREE.Points viewer
```

---

## Universal Uploader — "Do It All" Pipeline

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  User drops  │     │  Supabase Storage │     │   Inngest Job    │     │   Browser    │
│  E57/LAS/LAZ │────→│  (original file)  │────→│                  │────→│   Viewer     │
└─────────────┘     └──────────────────┘     │  1. If E57:       │     └─────────────┘
                                              │     web-e57 → LAZ │
                                              │  2. @loaders.gl   │
                                              │     parse LAS/LAZ │
                                              │  3. Decimate to   │
                                              │     2M points     │
                                              │  4. Detect floors  │
                                              │  5. Detect walls   │
                                              │  6. Store results  │
                                              └──────────────────┘
```

### Format Support

| Format | How | Library |
|--------|-----|---------|
| **E57** | Convert → LAZ on Inngest, then parse | `web-e57` (npm, Apache-2.0) |
| **LAS** (v1.0–1.3) | Parse directly | `@loaders.gl/las` |
| **LAZ** (compressed LAS) | Parse directly (LASzip decompression) | `@loaders.gl/las` |

### npm Dependencies (4 new)

```
web-e57           — E57 → LAZ/XYZ conversion (Node.js + browser)
@loaders.gl/core  — Loader framework
@loaders.gl/las   — LAS/LAZ point cloud parser (v1.0–1.3 + LAZ)
@tarikjabiri/dxf  — DXF file generation with layers
```

---

## Database Migration

**File:** `supabase/migrations/002_sprint10_surveying.sql`

### Tables (4 new)

**survey_scans** — uploaded point cloud files
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
project_id UUID REFERENCES projects(id)
uploaded_by UUID NOT NULL REFERENCES auth.users(id)
scan_name TEXT NOT NULL
original_filename TEXT NOT NULL
file_format TEXT NOT NULL CHECK (file_format IN ('las','laz','e57'))
storage_path TEXT NOT NULL              -- original file in Supabase Storage
converted_storage_path TEXT             -- LAZ after E57 conversion (null if already LAS/LAZ)
file_size_bytes BIGINT NOT NULL
point_count BIGINT
decimated_storage_path TEXT             -- decimated .bin for browser viewing
decimated_point_count INTEGER
bounds_min JSONB                        -- {x, y, z}
bounds_max JSONB                        -- {x, y, z}
coordinate_system TEXT
scanner_model TEXT DEFAULT 'Leica BLK360'
scan_date TIMESTAMPTZ
processing_status TEXT DEFAULT 'uploaded' CHECK (processing_status IN ('uploaded','converting','processing','ready','failed'))
processing_error TEXT
metadata JSONB DEFAULT '{}'
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

**survey_floors** — detected floor levels per scan
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
scan_id UUID NOT NULL REFERENCES survey_scans(id) ON DELETE CASCADE
floor_label TEXT NOT NULL               -- 'Ground Floor', 'First Floor', etc.
z_height_m NUMERIC(8,3) NOT NULL
z_range_min NUMERIC(8,3) NOT NULL
z_range_max NUMERIC(8,3) NOT NULL
point_count INTEGER
confidence NUMERIC(5,2)                 -- 0-100
is_confirmed BOOLEAN DEFAULT FALSE
sort_order INTEGER NOT NULL
created_at TIMESTAMPTZ DEFAULT NOW()
```

**survey_walls** — detected walls per floor
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
floor_id UUID NOT NULL REFERENCES survey_floors(id) ON DELETE CASCADE
wall_label TEXT
start_x NUMERIC(10,3) NOT NULL
start_y NUMERIC(10,3) NOT NULL
end_x NUMERIC(10,3) NOT NULL
end_y NUMERIC(10,3) NOT NULL
thickness_mm NUMERIC(8,1)
length_mm NUMERIC(10,1) NOT NULL
wall_type TEXT DEFAULT 'detected' CHECK (wall_type IN ('detected','manual','adjusted'))
confidence NUMERIC(5,2)
created_at TIMESTAMPTZ DEFAULT NOW()
```

**survey_plans** — generated PDF/DXF exports
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
floor_id UUID NOT NULL REFERENCES survey_floors(id) ON DELETE CASCADE
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
plan_reference TEXT UNIQUE NOT NULL      -- HF-PLN-0001
plan_format TEXT NOT NULL CHECK (plan_format IN ('pdf','dxf'))
paper_size TEXT DEFAULT 'A3' CHECK (paper_size IN ('A1','A3','A4'))
scale TEXT DEFAULT '1:100'
storage_path TEXT NOT NULL
file_size_bytes BIGINT
generated_by UUID NOT NULL REFERENCES auth.users(id)
generated_at TIMESTAMPTZ DEFAULT NOW()
metadata JSONB DEFAULT '{}'
```

**Sequence:** `plan_number_seq` (START 1, INCREMENT 1)

**Indexes (7):** org, project, status on scans; scan on floors; floor on walls; floor + org on plans

**RLS Policies (10):** Members view/upload for their org. Admins update/delete. Service role manages floors/walls (Inngest writes).

---

## Task List — 31 Tasks in Dependency Order

### Group 1: Foundation (parallel, no deps)

| # | Task | File |
|---|------|------|
| 10.1 | Database migration — 4 tables, 1 sequence, 7 indexes, 10 RLS | `supabase/migrations/002_sprint10_surveying.sql` |
| 10.2 | Supabase Storage bucket `survey-scans` (private, 500MB limit) | Supabase dashboard / API call |
| 10.3 | `npm install web-e57 @loaders.gl/core @loaders.gl/las @tarikjabiri/dxf` | `package.json` |
| 10.4 | TypeScript interfaces | `lib/surveying/types.ts` |

### Group 2: LAS Parser (depends on 10.3 + 10.4)

| # | Task | File |
|---|------|------|
| 10.5 | LAS/LAZ parser — `@loaders.gl/las` LASLoader, returns `{ positions: Float32Array, colors, count, bounds }` | `lib/surveying/lasParser.ts` |

### Group 3: Processing algorithms (depend on 10.5, parallel)

| # | Task | File |
|---|------|------|
| 10.6 | Voxel grid decimator — downsample to 2M points for browser | `lib/surveying/decimator.ts` |
| 10.7 | Floor detector — Z-histogram (5cm bins), Gaussian smooth, local maxima → floor levels | `lib/surveying/floorDetector.ts` |
| 10.8 | Wall detector — per-floor RANSAC line fitting, merge collinear, snap perpendicular | `lib/surveying/wallDetector.ts` |

### Group 4: E57 Converter (depends on 10.3)

| # | Task | File |
|---|------|------|
| 10.9 | E57→LAZ converter — wraps `web-e57` `convertE57()` for Inngest pipeline | `lib/surveying/e57Converter.ts` |

### Group 5: Inngest function (depends on 10.5–10.9)

| # | Task | File |
|---|------|------|
| 10.10 | `processSurveyScan` Inngest function — full pipeline: if E57 convert→LAZ, parse, decimate, detect floors, detect walls, store results | `lib/inngest/surveyFunctions.ts` |
| 10.11 | Register in existing functions array | `lib/inngest/functions.ts` (modify) |

### Group 6: Core API routes (depend on 10.1 + 10.2)

| # | Task | File |
|---|------|------|
| 10.12 | GET list + POST upload (multipart, accepts .e57/.las/.laz, stores in Supabase Storage, triggers Inngest) | `app/api/surveying/scans/route.ts` |
| 10.13 | GET scan detail (+ floors + walls) + DELETE | `app/api/surveying/scans/[id]/route.ts` |
| 10.14 | GET signed URL for decimated point cloud .bin | `app/api/surveying/scans/[id]/point-cloud/route.ts` |
| 10.15 | PATCH confirm/rename/adjust floor z_height | `app/api/surveying/floors/[id]/confirm/route.ts` |

### Group 7: Export generators (depend on 10.4)

| # | Task | File |
|---|------|------|
| 10.16 | Shared layout calculator — scale, paper dims, wall coords, dimension positions | `lib/surveying/planRenderer.ts` |
| 10.17 | PDF generator — pdf-lib, A1/A3/A4 plots with HF title block (HARMONY FIRE, HF_BLUE #0056a7, plan ref HF-PLN-xxxx, project, floor, scale, date) | `lib/surveying/planPdfGenerator.ts` |
| 10.18 | DXF exporter — `@tarikjabiri/dxf`, layers: HF-WALLS, HF-DIMS, HF-GRID, HF-TEXT, HF-TITLEBLOCK. Walls as LINE, dims as LINE+TEXT | `lib/surveying/planDxfExporter.ts` |

### Group 8: Export API routes (depend on 10.13 + 10.17 + 10.18)

| # | Task | File |
|---|------|------|
| 10.19 | POST generate PDF or DXF for a floor (paper_size, scale, format) | `app/api/surveying/floors/[id]/export/route.ts` |
| 10.20 | GET download generated plan (signed URL) | `app/api/surveying/plans/[id]/download/route.ts` |

### Group 9: UI Components (depend on 10.4, parallel)

| # | Task | File |
|---|------|------|
| 10.21 | Drag-drop upload card — accepts .e57, .las, .laz, multipart POST, progress bar, 500MB max | `components/surveying/ScanUploadCard.tsx` |
| 10.22 | Scan grid card — name, size, points, status badge (uploaded/converting/processing/ready/failed) | `components/surveying/ScanCard.tsx` |
| 10.23 | 3D point cloud viewer — Three.js `THREE.Points` + `BufferGeometry`, height-based coloring, OrbitControls, floor planes, dark bg | `components/surveying/PointCloudViewer.tsx` |
| 10.24 | Floor level panel — list floors, z-height, confidence, confirm/rename, dispatches `surveyFloorSelected` event | `components/surveying/FloorLevelPanel.tsx` |
| 10.25 | 2D floor plan viewer — SVG walls + dimensions, pan/zoom, north arrow, grid, scale ref | `components/surveying/FloorPlanViewer.tsx` |

### Group 10: Tools panel (depends on 10.24)

| # | Task | File |
|---|------|------|
| 10.26 | Left tools panel (280px) — scan info, floor levels, export controls (PDF/DXF + paper + scale), actions. HF blue accent | `components/surveying/SurveyToolsPanel.tsx` |

### Group 11: Pages (depend on APIs + components)

| # | Task | File |
|---|------|------|
| 10.27 | Surveying dashboard — upload card + scan grid. Empty state. Auth required | `app/surveying/page.tsx` |
| 10.28 | Scan viewer — split-screen 3D/2D with draggable divider, tools panel, floor sync | `app/surveying/[id]/page.tsx` |

### Group 12: Integration + docs (last)

| # | Task | File |
|---|------|------|
| 10.29 | Wire export buttons → `/api/surveying/floors/[id]/export` | `components/surveying/SurveyToolsPanel.tsx` (update) |
| 10.30 | Update CLAUDE.md — table count (31), Inngest count (8), key files | `CLAUDE.md` |
| 10.31 | Add Sprint 10 section to BUILD_PLAN.md + update dependency graph | `BUILD_PLAN.md` |

---

## ARCHITECTURE.md — Sprint 10 Section

Will add as **Section 22: Surveying Module** matching existing format:

```
22. Surveying Module
  22.1 Overview (business value + pipeline diagram)
  22.2 Format Support Table (@thatopen = IFC only, Three.js = point clouds)
  22.3 Processing Pipeline (E57→LAZ→parse→decimate→floors→walls)
  22.4 Database Tables (full SQL — 4 tables + sequence)
  22.5 RLS Policies (10 policies)
  22.6 API Routes (6 routes — path | method | purpose)
  22.7 Inngest Function (processSurveyScan — event + steps)
  22.8 Components (6 components — name | purpose)
  22.9 Lib Files (7 files — path | role)
  22.10 Pages (2 pages — /surveying, /surveying/[id])
  22.11 Known Limitations (documented honestly)
```

---

## File Inventory

### New Files (25)

```
supabase/migrations/002_sprint10_surveying.sql  — migration
lib/surveying/types.ts                          — interfaces
lib/surveying/lasParser.ts                      — LAS/LAZ parser
lib/surveying/decimator.ts                      — voxel downsampling
lib/surveying/floorDetector.ts                  — Z-histogram detection
lib/surveying/wallDetector.ts                   — RANSAC wall fitting
lib/surveying/e57Converter.ts                   — web-e57 wrapper
lib/surveying/planRenderer.ts                   — layout calculations
lib/surveying/planPdfGenerator.ts               — PDF with HF title block
lib/surveying/planDxfExporter.ts                — DXF with layers
lib/inngest/surveyFunctions.ts                  — processSurveyScan
app/api/surveying/scans/route.ts                — list + upload
app/api/surveying/scans/[id]/route.ts           — detail + delete
app/api/surveying/scans/[id]/point-cloud/route.ts — signed URL
app/api/surveying/floors/[id]/confirm/route.ts  — confirm floor
app/api/surveying/floors/[id]/export/route.ts   — generate PDF/DXF
app/api/surveying/plans/[id]/download/route.ts  — download plan
components/surveying/ScanUploadCard.tsx          — drag-drop upload
components/surveying/ScanCard.tsx                — scan grid card
components/surveying/PointCloudViewer.tsx        — Three.js 3D viewer
components/surveying/FloorLevelPanel.tsx         — floor list + selection
components/surveying/FloorPlanViewer.tsx         — SVG 2D plan
components/surveying/SurveyToolsPanel.tsx        — tools panel
app/surveying/page.tsx                          — scan list page
app/surveying/[id]/page.tsx                     — viewer page
```

### Modified Files (3)

```
lib/inngest/functions.ts  — add processSurveyScan to array
CLAUDE.md                 — update counts
BUILD_PLAN.md             — add Sprint 10
```

## Reference Patterns to Reuse

- `components/scope/ViewerCanvas.tsx` — Three.js scene, lighting, camera setup
- `app/scope/page.tsx` — drag-drop file upload UI pattern
- `app/scope/viewer/page.tsx` — split-screen 3D/2D with draggable divider
- `lib/goldenThread/pdfGenerator.ts` — pdf-lib with HF branding, page layout
- `lib/inngest/functions.ts` — Inngest step function pattern
- `lib/authHelper.ts` — `getAuthUser()` for all API routes

## Known Limitations (Documented Honestly)

1. **LAS 1.4 not supported** — `@loaders.gl/las` supports up to LAS 1.3. BLK360 exports LAS 1.3 by default.
2. **Wall detection is heuristic** — RANSAC works for orthogonal rooms (~80% UK buildings). Curved walls, clutter may produce poor results.
3. **2M point browser limit** — full-res in Supabase Storage, decimated version rendered.
4. **Single-scan only** — multi-scan registration (ICP alignment) out of scope.
5. **DXF uses LINE+TEXT** — not complex DIMENSION entities. Opens in all CAD software.
6. **web-e57 converts E57 to LAZ** — not a full E57 parser. Relies on the conversion being lossless for position/color data.

## Verification

1. `npm run typecheck` — pass
2. `npm run lint` — pass
3. `npm run build` — compile
4. Upload .las → processing → 3D view → floor detection → 2D plan → PDF export
5. Upload .e57 → converting status → then same pipeline
6. Inngest dashboard: 8 functions registered
