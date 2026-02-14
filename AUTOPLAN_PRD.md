# HF.AutoPlan — Product Requirements Document

**Module:** AutoPlan (inside hf.bluebook, route group `/autoplan`)
**Purpose:** AI-assisted fire safety plan markup tool with expert validation
**Tech:** Existing hf.bluebook stack — Next.js 13.5, Supabase, Claude Sonnet (vision), pdf-lib, Inngest
**Icon:** `Flame` from lucide-react (sidebar position: after Scope)

---

## Core Concept

AutoPlan is a **markup tool** built into hf.bluebook. The expert human is always in control — AI does the heavy lifting first, then the expert refines.

**User Flow:**
1. Create building → enter address, height, evacuation strategy, jurisdiction
2. Upload PDF floor plan per floor (drag-drop or SharePoint import)
3. Inngest background job sends floor plan image to Claude Sonnet vision → AI returns detected elements + suggested symbol positions
4. Expert opens canvas editor → floor plan displayed with AI-placed BS 5499 symbols overlaid
5. Expert drags, moves, adds, removes symbols using palette. Adjusts labels, travel distances
6. Expert saves → approves → signs off with name + qualifications
7. System generates final branded PDF (original floor plan + symbol overlay + title block + regulatory text)
8. PDF available for download / submission to Fire & Rescue Service

**Key Principle:** AI places ~90% of symbols correctly. Expert validates and corrects the remaining ~10%. Every plan MUST have human sign-off before final PDF generation.

---

## What Gets Reused from hf.bluebook

| Existing | Reused For |
|----------|-----------|
| `organizations` table | Client org (council, housing association) |
| `organization_members` table | Role-based access (admin = can approve) |
| `lib/authHelper.ts` | `getAuthUser()` on all API routes |
| `lib/supabase.ts` | Client-side Supabase |
| `@anthropic-ai/sdk` | Claude Sonnet vision analysis |
| `pdf-lib` | Final PDF generation with HF title block |
| `lib/inngest/client.ts` | Background job infrastructure |
| `components/LeftSidebar.tsx` | Add Flame icon → `/autoplan` |
| `components/M365FileImportModal.tsx` | SharePoint PDF import |
| Supabase Auth + Storage | Auth + file storage |
| HF brand colors | `#0056a7` blue, Cormorant/IBM Plex fonts |

**No new npm dependencies.** Everything needed is already installed.

---

## Database Schema

**Migration file:** `supabase/migrations/005_sprint11_autoplan.sql`

### Tables (5 new)

```sql
-- Buildings with fire safety metadata
CREATE TABLE autoplan_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  postcode TEXT NOT NULL,
  jurisdiction TEXT NOT NULL CHECK (jurisdiction IN ('england', 'scotland', 'wales')),
  height_metres NUMERIC(6,2),
  number_of_storeys INTEGER NOT NULL,
  building_use TEXT NOT NULL CHECK (building_use IN (
    'residential_high_rise', 'residential_low_rise', 'mixed_use',
    'care_home', 'student_accommodation', 'hotel', 'office', 'retail'
  )),
  evacuation_strategy TEXT NOT NULL CHECK (evacuation_strategy IN (
    'stay_put', 'simultaneous', 'phased', 'progressive_horizontal', 'defend_in_place'
  )),
  has_sprinklers BOOLEAN DEFAULT false,
  has_dry_riser BOOLEAN DEFAULT false,
  has_wet_riser BOOLEAN DEFAULT false,
  number_of_firefighting_lifts INTEGER DEFAULT 0,
  responsible_person TEXT,           -- RP name (Article 3, RRO 2005)
  rp_contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Floor plans (uploaded PDFs, one per floor per building)
CREATE TABLE autoplan_floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES autoplan_buildings(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  floor_number INTEGER NOT NULL,
  floor_name TEXT,                    -- 'Ground Floor', 'First Floor', 'Roof'
  storage_path TEXT NOT NULL,         -- original PDF in Supabase Storage
  preview_storage_path TEXT,          -- PNG render for canvas display
  original_filename TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  page_width_px INTEGER,             -- rendered page dimensions
  page_height_px INTEGER,
  scale TEXT,                         -- detected or entered: '1:100', '1:50'
  ai_analysis_status TEXT DEFAULT 'pending' CHECK (ai_analysis_status IN (
    'pending', 'analyzing', 'completed', 'failed'
  )),
  ai_analysis_result JSONB,           -- Claude vision output (see AIAnalysisResult type)
  ai_confidence NUMERIC(4,3) CHECK (ai_confidence BETWEEN 0 AND 1),
  ai_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (building_id, floor_number)
);

-- Fire safety plans (the markup document)
CREATE TABLE autoplan_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES autoplan_floors(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES autoplan_buildings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  plan_reference TEXT UNIQUE NOT NULL, -- HF-AP-0001 (from sequence)
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'review', 'approved', 'superseded'
  )),
  symbol_data JSONB NOT NULL DEFAULT '[]',  -- array of placed symbols (see PlacedSymbol type)
  annotations JSONB DEFAULT '[]',           -- text annotations, travel distance lines
  canvas_viewport JSONB,                    -- { zoom, panX, panY } for restoring view
  final_pdf_path TEXT,                      -- generated PDF in storage
  final_pdf_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approval records (signature + attestation)
CREATE TABLE autoplan_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES autoplan_plans(id) ON DELETE CASCADE,
  approved_by UUID NOT NULL REFERENCES auth.users(id),
  approver_name TEXT NOT NULL,
  approver_qualifications TEXT NOT NULL,  -- 'IFE Member #12345', 'FPA Certified'
  approver_company TEXT NOT NULL DEFAULT 'Harmony Fire',
  attestation TEXT NOT NULL DEFAULT 'I have reviewed this fire safety plan and confirm it accurately represents the fire safety provisions and layout of the building.',
  checklist_results JSONB NOT NULL,       -- { exits_marked: true, doors_labelled: true, ... }
  approved_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log (every action)
CREATE TABLE autoplan_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,              -- 'building', 'floor', 'plan', 'approval'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,                   -- 'created', 'updated', 'approved', 'exported', 'deleted'
  user_id UUID NOT NULL REFERENCES auth.users(id),
  details JSONB,                          -- action-specific data
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Sequence

```sql
CREATE SEQUENCE autoplan_number_seq START 1 INCREMENT 1;
```

### Indexes (8)

```sql
CREATE INDEX idx_autoplan_buildings_org ON autoplan_buildings(organization_id);
CREATE INDEX idx_autoplan_buildings_created_by ON autoplan_buildings(created_by);
CREATE INDEX idx_autoplan_floors_building ON autoplan_floors(building_id);
CREATE INDEX idx_autoplan_floors_status ON autoplan_floors(ai_analysis_status);
CREATE INDEX idx_autoplan_plans_floor ON autoplan_plans(floor_id);
CREATE INDEX idx_autoplan_plans_org ON autoplan_plans(organization_id);
CREATE INDEX idx_autoplan_plans_status ON autoplan_plans(status);
CREATE INDEX idx_autoplan_audit_entity ON autoplan_audit_log(entity_type, entity_id);
```

### RLS Policies (12)

```sql
-- Buildings: org members can view, admins can create/update/delete
ALTER TABLE autoplan_buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view their org buildings" ON autoplan_buildings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members create buildings" ON autoplan_buildings
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins update buildings" ON autoplan_buildings
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins delete buildings" ON autoplan_buildings
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Floors: same org-scoped access via building
ALTER TABLE autoplan_floors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view floors" ON autoplan_floors
  FOR SELECT USING (
    building_id IN (
      SELECT id FROM autoplan_buildings WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members manage floors" ON autoplan_floors
  FOR ALL USING (
    building_id IN (
      SELECT id FROM autoplan_buildings WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Plans: org-scoped
ALTER TABLE autoplan_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view plans" ON autoplan_plans
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members manage plans" ON autoplan_plans
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Approvals: org-scoped via plan
ALTER TABLE autoplan_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view approvals" ON autoplan_approvals
  FOR SELECT USING (
    plan_id IN (
      SELECT id FROM autoplan_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins create approvals" ON autoplan_approvals
  FOR INSERT WITH CHECK (
    plan_id IN (
      SELECT id FROM autoplan_plans WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Audit log: org-scoped read, service role write
ALTER TABLE autoplan_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view audit log" ON autoplan_audit_log
  FOR SELECT USING (user_id = auth.uid());
```

### Storage Bucket

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('autoplan', 'autoplan', false, 104857600); -- 100MB limit
```

---

## Fire Safety Symbols (BS 5499 / ISO 7010)

Standardised UK fire safety symbols. Each symbol is an SVG path stored in `lib/autoplan/symbols.ts`. These are the symbols available in the palette:

### Symbol Library (18 symbols)

| ID | Symbol | BS/ISO Ref | Category | Color |
|----|--------|-----------|----------|-------|
| `fire_exit` | Running man + arrow | ISO 7010 E001/E002 | Escape | Green |
| `fire_exit_left` | Exit arrow left | ISO 7010 E001 | Escape | Green |
| `fire_exit_right` | Exit arrow right | ISO 7010 E002 | Escape | Green |
| `assembly_point` | Group of people | ISO 7010 E007 | Escape | Green |
| `fire_extinguisher` | Extinguisher | ISO 7010 F001 | Equipment | Red |
| `fire_hose_reel` | Hose reel | ISO 7010 F002 | Equipment | Red |
| `fire_alarm_cp` | Call point | ISO 7010 F005 | Equipment | Red |
| `fire_blanket` | Blanket | ISO 7010 F016 | Equipment | Red |
| `dry_riser_inlet` | D in circle | BS 5499-5 | Equipment | Red |
| `wet_riser_outlet` | W in circle | BS 5499-5 | Equipment | Red |
| `fire_door_fd30` | FD30 label | BS 8214 | Doors | Blue |
| `fire_door_fd60` | FD60 label | BS 8214 | Doors | Blue |
| `fire_door_fd90` | FD90 label | BS 8214 | Doors | Blue |
| `fire_door_fd120` | FD120 label | BS 8214 | Doors | Blue |
| `smoke_detector` | S in circle | BS 5839-1 | Detection | Blue |
| `heat_detector` | H in circle | BS 5839-1 | Detection | Blue |
| `sprinkler_head` | Triangle + S | BS EN 12845 | Suppression | Blue |
| `emergency_light` | Light + arrow | BS 5266-1 | Lighting | Green |

### Symbol Data Structure

```typescript
interface SymbolDefinition {
  id: string;
  label: string;
  category: 'escape' | 'equipment' | 'doors' | 'detection' | 'suppression' | 'lighting';
  color: string;         // hex fill
  svgPath: string;       // SVG path data for rendering
  defaultWidth: number;  // default size in canvas pixels
  defaultHeight: number;
  bsReference: string;   // BS/ISO standard reference
}

interface PlacedSymbol {
  instanceId: string;    // unique per placement (uuid)
  symbolId: string;      // references SymbolDefinition.id
  x: number;             // canvas x (0-1 normalised to floor plan width)
  y: number;             // canvas y (0-1 normalised to floor plan height)
  rotation: number;      // degrees
  scale: number;         // 1.0 = default size
  label?: string;        // optional override text (e.g. "FD60s" for self-closing)
  metadata?: Record<string, string>; // e.g. { fireRating: '60', selfClosing: 'yes' }
}

interface Annotation {
  id: string;
  type: 'text' | 'travel_distance' | 'arrow' | 'zone';
  x: number;
  y: number;
  // For text
  text?: string;
  fontSize?: number;
  // For travel_distance
  endX?: number;
  endY?: number;
  distanceMetres?: number;
  // For zone
  width?: number;
  height?: number;
  zoneType?: 'compartment' | 'protected_corridor' | 'stairwell';
}
```

---

## AI Vision Analysis (Claude Sonnet)

### How It Works

1. **Inngest event:** `autoplan/floor.uploaded` triggers `analyzeFloorPlan`
2. **PDF → PNG:** Render first page of uploaded PDF to PNG at 2048px width (using `pdfjs-dist`)
3. **Store preview:** Upload PNG to Supabase Storage (`autoplan/previews/{id}.png`)
4. **Vision call:** Send PNG to Claude Sonnet with building context
5. **Parse response:** Extract detected elements + suggested symbol positions
6. **Store result:** Save to `autoplan_floors.ai_analysis_result`

### Claude Vision Prompt

```
You are analyzing a floor plan PDF for a UK building to identify fire safety elements.

BUILDING CONTEXT:
- Name: {name}
- Jurisdiction: {jurisdiction}
- Height: {height}m, {storeys} storeys
- Use: {building_use}
- Evacuation: {evacuation_strategy}
- Sprinklers: {has_sprinklers}
- Dry riser: {has_dry_riser}

Analyze this floor plan image and identify:

1. EXITS — doors leading outside or to protected escape routes
2. FIRE DOORS — doors with fire resistance markings (FD30, FD60, etc.)
3. STAIRCASES — protected stairways, firefighting stairs
4. FIRE EQUIPMENT — extinguishers, call points, hose reels (if visible)
5. CORRIDORS — common parts, escape routes
6. ROOMS — flats, offices, plant rooms (labels if visible)
7. SCALE — drawing scale if marked (e.g. "1:100")
8. RISERS — dry/wet riser positions

For each element, provide its approximate position as normalised coordinates
(0.0 to 1.0 relative to image width and height, where 0,0 is top-left).

Return ONLY valid JSON:
{
  "confidence": 0.85,
  "scale": "1:100",
  "elements": {
    "exits": [{ "x": 0.45, "y": 0.92, "type": "final_exit", "notes": "main entrance" }],
    "fire_doors": [{ "x": 0.3, "y": 0.5, "rating": "FD30", "notes": "flat entrance" }],
    "staircases": [{ "x": 0.1, "y": 0.5, "type": "protected", "notes": "core stairwell" }],
    "equipment": [{ "x": 0.2, "y": 0.4, "type": "fire_extinguisher" }],
    "corridors": [{ "x": 0.5, "y": 0.5, "width": 0.1, "height": 0.8, "notes": "main corridor" }],
    "rooms": [{ "x": 0.7, "y": 0.3, "label": "Flat 1A", "type": "flat" }]
  },
  "suggested_symbols": [
    { "symbolId": "fire_exit", "x": 0.45, "y": 0.92, "rotation": 0 },
    { "symbolId": "fire_door_fd30", "x": 0.3, "y": 0.5, "rotation": 0 },
    { "symbolId": "fire_extinguisher", "x": 0.2, "y": 0.4, "rotation": 0 },
    { "symbolId": "fire_alarm_cp", "x": 0.15, "y": 0.5, "rotation": 0 },
    { "symbolId": "emergency_light", "x": 0.5, "y": 0.3, "rotation": 0 }
  ],
  "warnings": ["Scale bar not found — positions approximate"],
  "regulatory_notes": [
    "Building >18m: Fire Safety (England) Regulations 2022 Regulation 6 requires floor plans",
    "Stay-put strategy: ensure all flat entrance doors are minimum FD30s"
  ]
}
```

### AI Analysis Response Type

```typescript
interface AIAnalysisResult {
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
```

---

## Canvas Markup Editor

The editor is the core of AutoPlan. Built with HTML5 Canvas (2D context), rendered in React.

### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ ← Back to Building    HF-AP-0001 — Ground Floor    [Save] [Approve]│
├────────┬─────────────────────────────────────────────────┬──────────┤
│        │                                                 │          │
│ SYMBOL │                                                 │PROPERTIES│
│ PALETTE│              FLOOR PLAN CANVAS                  │  PANEL   │
│        │                                                 │          │
│ Escape │     (floor plan image + symbol overlays)        │ Selected │
│ --------│                                                 │ Symbol:  │
│ 🟢 Exit│                                                 │ Type: FD │
│ 🟢 Exit←│                                                │ Pos: ... │
│ 🟢 Exit→│     [zoom][pan][select][delete]                │ Rotate:  │
│ 🟢 Assem│      toolbar floats at bottom                  │ Scale:   │
│        │                                                 │          │
│ Equip  │                                                 │──────────│
│ --------│                                                 │          │
│ 🔴 Ext  │                                                 │ AI NOTES │
│ 🔴 Hose │                                                 │ Conf: 87%│
│ 🔴 Call │                                                 │ Warnings:│
│ 🔴 Blnk │                                                 │ - Scale  │
│ 🔴 DryR │                                                 │   not    │
│ 🔴 WetR │                                                 │   found  │
│        │                                                 │          │
│ Doors  │                                                 │──────────│
│ --------│                                                 │CHECKLIST │
│ 🔵 FD30 │                                                 │ ☑ Exits  │
│ 🔵 FD60 │                                                 │ ☑ Doors  │
│ 🔵 FD90 │                                                 │ ☐ Travel │
│ 🔵 FD120│                                                 │ ☐ Equip  │
│        │                                                 │ ☐ Detect │
│ Detect │                                                 │ ☐ Light  │
│ --------│                                                 │ ☐ Risers │
│ 🔵 Smoke│                                                 │ ☐ Regs   │
│ 🔵 Heat │                                                 │          │
│ 🔵 Sprnk│                                                 │          │
│        │                                                 │          │
│ Light  │                                                 │          │
│ --------│                                                 │          │
│ 🟢 EmLt │                                                 │          │
│        │                                                 │          │
└────────┴─────────────────────────────────────────────────┴──────────┘
```

### Canvas Interactions

| Action | Behaviour |
|--------|-----------|
| **Drag from palette** | Creates new symbol at drop position on canvas |
| **Click symbol** | Selects it, shows properties in right panel |
| **Drag placed symbol** | Moves it on canvas |
| **Scroll wheel** | Zoom in/out (centered on cursor) |
| **Middle-click drag** | Pan canvas |
| **Delete/Backspace** | Remove selected symbol |
| **Ctrl+Z** | Undo |
| **Ctrl+Shift+Z** | Redo |
| **Ctrl+S** | Save symbol_data to database |
| **R** | Rotate selected symbol 45 degrees |
| **+/-** | Scale selected symbol up/down |

### Canvas Component Architecture

```
PlanCanvas.tsx (main)
├── renders <canvas> element
├── manages viewport (zoom, pan, offset)
├── renders floor plan image as background
├── renders placed symbols (SVG → canvas drawImage)
├── renders annotations (lines, text, zones)
├── handles drag-drop from palette
├── handles click/drag on placed symbols
├── exposes: onSave(symbols), onSymbolSelect(symbol)
└── uses undo/redo stack (symbol_data snapshots)
```

---

## Mandatory Compliance Checklist (8 items)

Before approval is allowed, ALL items must be checked by the expert:

1. **Fire exits marked** — all final exits and fire escapes have exit symbols
2. **Fire doors labelled** — all fire doors have FD rating symbols
3. **Travel distances checked** — maximum travel distances comply with ADB Table 3.1
4. **Fire equipment shown** — extinguishers, call points, hose reels positioned
5. **Detection shown** — smoke/heat detectors marked per BS 5839-1
6. **Emergency lighting shown** — emergency luminaires on escape routes per BS 5266-1
7. **Risers shown** — dry/wet riser positions marked (if applicable)
8. **Regulatory text added** — jurisdiction-specific compliance statement present

---

## API Routes (11 routes)

### Buildings

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/autoplan/buildings` | List buildings for org |
| POST | `/api/autoplan/buildings` | Create new building |
| GET | `/api/autoplan/buildings/[id]` | Get building + floors + plans |
| PATCH | `/api/autoplan/buildings/[id]` | Update building details |
| DELETE | `/api/autoplan/buildings/[id]` | Delete building (cascade) |

### Floors

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/autoplan/floors` | Upload floor plan PDF (multipart) |
| DELETE | `/api/autoplan/floors/[id]` | Delete floor plan |

### Plans

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/autoplan/plans` | Create plan from AI analysis (populates symbol_data from suggested_symbols) |
| PATCH | `/api/autoplan/plans/[id]` | Save symbol_data + annotations (auto-save from editor) |
| POST | `/api/autoplan/plans/[id]/approve` | Approve plan (requires all 8 checklist items + name/qualifications) |
| POST | `/api/autoplan/plans/[id]/export` | Generate final branded PDF |

### Route Pattern (follows existing)

```typescript
// app/api/autoplan/buildings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("autoplan_buildings")
    .select("*")
    .eq("organization_id", auth.organizationId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ buildings: data });
}
```

---

## Inngest Function

**File:** `lib/inngest/autoplanFunctions.ts`

### `analyzeFloorPlan`

```
Event: autoplan/floor.uploaded
Data: { floor_id, building_id, user_id }
Steps:
  1. "get-floor-and-building" — fetch floor + building metadata
  2. "render-pdf-to-png" — download PDF, render to PNG via pdfjs-dist, upload preview
  3. "analyze-with-claude" — send PNG to Claude Sonnet vision, parse response
  4. "store-results" — save ai_analysis_result, update status to 'completed'
  5. "log-audit" — insert audit_log entry
```

**Key:** PDF → PNG rendering uses `pdfjs-dist` (already a transitive dependency via the ecosystem). Render at 2048px width for Claude vision quality. Store the PNG as the canvas background image.

**Registration:** Add to `lib/inngest/functions.ts` exports array (becomes function #9).

---

## Final PDF Generation

Uses `pdf-lib` following the existing `lib/goldenThread/pdfGenerator.ts` pattern.

### PDF Structure (A3 landscape, matching surveying plan exports)

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌───────────────────────────────────────────────────────────┐   │
│ │                                                           │   │
│ │                                                           │   │
│ │                                                           │   │
│ │              FLOOR PLAN (original PDF page)               │   │
│ │              + symbol overlays rendered by pdf-lib         │   │
│ │                                                           │   │
│ │                                                           │   │
│ │                                                           │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌──────────┬────────────────────────────────────────────────┐   │
│ │ HF LOGO  │  FIRE SAFETY PLAN                             │   │
│ │          │  Building: [name]     Floor: [name]            │   │
│ │ HARMONY  │  Ref: HF-AP-0001     Scale: 1:100             │   │
│ │  FIRE    │  Date: 14/02/2026    Version: 1               │   │
│ │          │  Approved: [name], [quals], [date]             │   │
│ │ #0056a7  │  Jurisdiction: [England/Scotland/Wales]        │   │
│ │ accent   │  Evacuation: [strategy]                        │   │
│ └──────────┴────────────────────────────────────────────────┘   │
│                                                                 │
│ SYMBOL KEY: 🟢 Exit  🔴 Extinguisher  🔵 FD30  ...            │
│                                                                 │
│ This plan complies with Fire Safety (England) Regulations 2022  │
│ Regulation 6. Prepared by Harmony Fire Ltd.                     │
└─────────────────────────────────────────────────────────────────┘
```

### Generation Process

1. Load original floor plan PDF
2. Embed it into A3 landscape template
3. For each symbol in `symbol_data`:
   - Calculate PDF coordinates from normalised canvas positions
   - Draw symbol at position (text-based: "FD30", "E" for exit, etc.)
   - Draw symbol border/background in correct color
4. Add title block with HF branding (blue accent bar, logo area)
5. Add symbol key/legend
6. Add regulatory compliance text based on jurisdiction
7. Add approval signature block (if approved)
8. Save to Supabase Storage
9. Update `autoplan_plans.final_pdf_path`

---

## Pages (4 new)

### `/autoplan` — Building List

List of buildings for the current org. Each building card shows name, address, floor count, plan status. "New Building" button top-right.

**File:** `app/autoplan/page.tsx`

### `/autoplan/new` — New Building Form

Form with all building fields. On submit → POST `/api/autoplan/buildings` → redirect to building dashboard.

**File:** `app/autoplan/new/page.tsx`

### `/autoplan/[buildingId]` — Building Dashboard

Building header (name, address, details). Floor cards grid (upload status, AI analysis status). Plan cards (draft/approved, download link). "Upload Floor Plan" button. "Generate Plan" button per floor (only when AI analysis complete).

**File:** `app/autoplan/[buildingId]/page.tsx`

### `/autoplan/editor/[planId]` — Canvas Markup Editor

The main editor. Three-panel layout: symbol palette (left, 200px), canvas (center), properties panel (right, 280px). Top toolbar with save, approve, export buttons.

**File:** `app/autoplan/editor/[planId]/page.tsx`

---

## Components (8 new)

| Component | File | Purpose |
|-----------|------|---------|
| `BuildingCard` | `components/autoplan/BuildingCard.tsx` | Building grid card with address, floors, status |
| `FloorCard` | `components/autoplan/FloorCard.tsx` | Floor card with upload status, AI analysis badge |
| `BuildingForm` | `components/autoplan/BuildingForm.tsx` | Building details form (used in new + edit) |
| `SymbolPalette` | `components/autoplan/SymbolPalette.tsx` | Left panel with draggable symbol categories |
| `PlanCanvas` | `components/autoplan/PlanCanvas.tsx` | Main canvas — floor plan background + symbol overlays + interaction handling |
| `CanvasToolbar` | `components/autoplan/CanvasToolbar.tsx` | Floating toolbar — zoom, pan, select, delete, undo/redo |
| `PropertiesPanel` | `components/autoplan/PropertiesPanel.tsx` | Right panel — selected symbol props, AI notes, compliance checklist |
| `ApprovalModal` | `components/autoplan/ApprovalModal.tsx` | Approval form — name, qualifications, attestation, checklist verification |

---

## Lib Files (5 new)

| File | Purpose |
|------|---------|
| `lib/autoplan/types.ts` | All TypeScript interfaces |
| `lib/autoplan/symbols.ts` | Symbol definitions (18 symbols, SVG paths, categories, colors) |
| `lib/autoplan/analyzer.ts` | Claude vision analysis — prompt builder, response parser |
| `lib/autoplan/pdfGenerator.ts` | Final PDF generation with pdf-lib + HF title block |
| `lib/inngest/autoplanFunctions.ts` | `analyzeFloorPlan` Inngest function |

---

## Sidebar Integration

Add `Flame` icon to `components/LeftSidebar.tsx` after the Scope entry:

```typescript
import { ..., Flame } from "lucide-react";

// In the nav items section, after Scope:
<IconButton
  icon={<Flame size={20} />}
  label="AutoPlan"
  tooltip="AutoPlan — Fire Safety Plans"
  onClick={() => router.push("/autoplan")}
/>
```

---

## File Inventory

### New Files (18)

```
supabase/migrations/005_sprint11_autoplan.sql
lib/autoplan/types.ts
lib/autoplan/symbols.ts
lib/autoplan/analyzer.ts
lib/autoplan/pdfGenerator.ts
lib/inngest/autoplanFunctions.ts
app/api/autoplan/buildings/route.ts
app/api/autoplan/buildings/[id]/route.ts
app/api/autoplan/floors/route.ts
app/api/autoplan/floors/[id]/route.ts
app/api/autoplan/plans/route.ts
app/api/autoplan/plans/[id]/route.ts
app/api/autoplan/plans/[id]/approve/route.ts
app/api/autoplan/plans/[id]/export/route.ts
components/autoplan/BuildingCard.tsx
components/autoplan/FloorCard.tsx
components/autoplan/BuildingForm.tsx
components/autoplan/SymbolPalette.tsx
components/autoplan/PlanCanvas.tsx
components/autoplan/CanvasToolbar.tsx
components/autoplan/PropertiesPanel.tsx
components/autoplan/ApprovalModal.tsx
app/autoplan/page.tsx
app/autoplan/new/page.tsx
app/autoplan/[buildingId]/page.tsx
app/autoplan/editor/[planId]/page.tsx
```

### Modified Files (3)

```
components/LeftSidebar.tsx         — add Flame icon
lib/inngest/functions.ts           — add analyzeFloorPlan to exports
CLAUDE.md                          — update counts
```

---

## Task List — 28 Tasks in Dependency Order

### Group 1: Foundation (parallel, no deps)

| # | Task | File |
|---|------|------|
| 11.1 | Database migration — 5 tables, 1 sequence, 8 indexes, 12 RLS, storage bucket | `supabase/migrations/005_sprint11_autoplan.sql` |
| 11.2 | TypeScript interfaces | `lib/autoplan/types.ts` |
| 11.3 | Symbol definitions — 18 BS 5499/ISO 7010 symbols with SVG paths | `lib/autoplan/symbols.ts` |

### Group 2: AI Analysis (depends on 11.2)

| # | Task | File |
|---|------|------|
| 11.4 | Claude vision analyzer — prompt builder, response parser | `lib/autoplan/analyzer.ts` |
| 11.5 | `analyzeFloorPlan` Inngest function — PDF→PNG→Claude→store | `lib/inngest/autoplanFunctions.ts` |
| 11.6 | Register in functions array | `lib/inngest/functions.ts` (modify) |

### Group 3: Building API routes (depend on 11.1)

| # | Task | File |
|---|------|------|
| 11.7 | GET list + POST create buildings | `app/api/autoplan/buildings/route.ts` |
| 11.8 | GET detail + PATCH + DELETE building | `app/api/autoplan/buildings/[id]/route.ts` |

### Group 4: Floor API routes (depend on 11.1)

| # | Task | File |
|---|------|------|
| 11.9 | POST upload floor plan (multipart, triggers Inngest) | `app/api/autoplan/floors/route.ts` |
| 11.10 | DELETE floor plan | `app/api/autoplan/floors/[id]/route.ts` |

### Group 5: Plan API routes (depend on 11.1 + 11.2)

| # | Task | File |
|---|------|------|
| 11.11 | POST create plan + PATCH save symbol_data | `app/api/autoplan/plans/route.ts` + `[id]/route.ts` |
| 11.12 | POST approve plan (checklist + signature) | `app/api/autoplan/plans/[id]/approve/route.ts` |

### Group 6: PDF generator (depends on 11.2 + 11.3)

| # | Task | File |
|---|------|------|
| 11.13 | Final PDF generator — pdf-lib, A3, HF title block, symbol overlay, legend, regulatory text | `lib/autoplan/pdfGenerator.ts` |
| 11.14 | POST export plan (generate + store PDF) | `app/api/autoplan/plans/[id]/export/route.ts` |

### Group 7: UI Components — Building (depend on 11.2, parallel)

| # | Task | File |
|---|------|------|
| 11.15 | Building card component | `components/autoplan/BuildingCard.tsx` |
| 11.16 | Floor card component | `components/autoplan/FloorCard.tsx` |
| 11.17 | Building form component | `components/autoplan/BuildingForm.tsx` |

### Group 8: UI Components — Editor (depend on 11.2 + 11.3, parallel)

| # | Task | File |
|---|------|------|
| 11.18 | Symbol palette — draggable symbols by category | `components/autoplan/SymbolPalette.tsx` |
| 11.19 | Plan canvas — floor plan bg, symbol rendering, drag-drop, zoom/pan, undo/redo | `components/autoplan/PlanCanvas.tsx` |
| 11.20 | Canvas toolbar — zoom, pan, select, delete, undo, redo | `components/autoplan/CanvasToolbar.tsx` |
| 11.21 | Properties panel — symbol props, AI notes, compliance checklist | `components/autoplan/PropertiesPanel.tsx` |
| 11.22 | Approval modal — name, quals, attestation, checklist check | `components/autoplan/ApprovalModal.tsx` |

### Group 9: Pages (depend on components + APIs)

| # | Task | File |
|---|------|------|
| 11.23 | Building list page | `app/autoplan/page.tsx` |
| 11.24 | New building page | `app/autoplan/new/page.tsx` |
| 11.25 | Building dashboard page | `app/autoplan/[buildingId]/page.tsx` |
| 11.26 | Canvas editor page — three-panel layout | `app/autoplan/editor/[planId]/page.tsx` |

### Group 10: Integration (last)

| # | Task | File |
|---|------|------|
| 11.27 | Add Flame icon to LeftSidebar | `components/LeftSidebar.tsx` (modify) |
| 11.28 | Update CLAUDE.md + BUILD_PLAN.md | docs |

---

## Known Limitations (Documented Honestly)

1. **AI symbol placement is approximate** — Claude vision returns normalised coordinates that may be off by 5-15%. The expert MUST verify every placement.
2. **PDF rendering quality varies** — CAD-exported PDFs render well. Scanned/photographed plans may have poor quality. OCR not attempted.
3. **Single-page floor plans only** — multi-page PDFs use page 1 only. Each floor must be a separate upload.
4. **Symbols are text-based in PDF output** — using pdf-lib text drawing (e.g. "FD30" in a circle), not embedded SVG images. This is simpler and works in all PDF viewers.
5. **No multi-user concurrent editing** — one user at a time per plan. Last save wins.
6. **Travel distance annotation is manual** — AI suggests symbol positions but does not calculate travel distances. Expert draws travel distance lines manually.
7. **Digital signature is attestation-based** — not cryptographic PKI. Expert name + qualifications + timestamp stamped on PDF. No eIDAS qualified signature.
8. **pdfjs-dist rendering** — runs on Inngest (Node.js). If pdfjs-dist canvas rendering is problematic in Node, fallback to a simple image conversion approach.

---

## Regulatory References

| Jurisdiction | Key Regulation | Floor Plan Requirement |
|-------------|---------------|----------------------|
| England | Fire Safety (England) Regulations 2022, Reg 6 | Buildings >=18m: RP must prepare floor plans for FRS |
| England | Approved Document B, Table 3.1 | Travel distance limits (7.5m single direction, 30m multi) |
| Scotland | Fire (Scotland) Act 2005, s.78 | Buildings >=11m: duty holder must provide plans |
| Scotland | Technical Handbook 2.9 | Sprinklers mandatory >=11m (since 2005) |
| Wales | Fire Safety Act 2021 | Similar to England, >=18m threshold |
| All UK | BS 5499 | Fire safety signage and symbols |
| All UK | BS 8214 | Fire door specification and marking |
| All UK | BS 5839-1 | Fire detection and alarm systems |
| All UK | BS EN 12845 | Sprinkler systems |
| All UK | BS 5266-1 | Emergency lighting |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| AI analysis time | <90 seconds per floor plan |
| AI symbol placement accuracy | >85% correct (expert fixes <15%) |
| Editor save response | <500ms |
| Final PDF generation | <15 seconds |
| Expert review time | <20 minutes per floor (vs 2+ hours manual) |
| Plans per day per expert | 12+ (vs 3-4 manual) |
