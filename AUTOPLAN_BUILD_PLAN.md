# HF.AutoPlan — Build Plan

> 28 tasks across 6 phases. Each phase unlocks the next. Tasks within a phase can run in parallel.

---

## Dependency Graph

```
Phase 1 (Foundation) ──────────────────────────────────────── no deps
  ├── 11.1 Migration
  ├── 11.2 Types
  └── 11.3 Symbols
        │
        ├──────────────────────┐
        ▼                      ▼
Phase 2 (Core Logic)      Phase 4 (Components)
  ├── 11.4 Analyzer          ├── 11.15 BuildingCard
  │     ▼                    ├── 11.16 FloorCard
  ├── 11.5 Inngest fn        ├── 11.17 BuildingForm
  │     ▼                    ├── 11.18 SymbolPalette
  ├── 11.6 Register fn       ├── 11.19 PlanCanvas ★
  └── 11.13 PDF generator    ├── 11.20 CanvasToolbar
        │                    ├── 11.21 PropertiesPanel
        │                    └── 11.22 ApprovalModal
        ▼                      │
Phase 3 (API Routes)          │
  ├── 11.7  Buildings CRUD    │
  ├── 11.8  Building [id]     │
  ├── 11.9  Floor upload      │
  ├── 11.10 Floor delete      │
  ├── 11.11 Plans CRUD        │
  ├── 11.12 Plans approve     │
  └── 11.14 Plans export      │
        │                      │
        └────────┬─────────────┘
                 ▼
Phase 5 (Pages)
  ├── 11.23 /autoplan (list)
  ├── 11.24 /autoplan/new
  ├── 11.25 /autoplan/[buildingId]
  └── 11.26 /autoplan/editor/[planId] ★
                 │
                 ▼
Phase 6 (Integration)
  ├── 11.27 Sidebar icon
  └── 11.28 Documentation
```

★ = critical path (most complex task)

---

## Phase 1 — Foundation

**Depends on:** Nothing
**Unlocks:** Everything else
**Parallel:** All 3 tasks are independent

| # | Task | File | Est. |
|---|------|------|------|
| 11.1 | **Database migration** — 5 tables (`autoplan_buildings`, `autoplan_floors`, `autoplan_plans`, `autoplan_approvals`, `autoplan_audit_log`), 1 sequence (`autoplan_number_seq`), 8 indexes, 12 RLS policies, `autoplan` storage bucket (100MB) | `supabase/migrations/005_sprint11_autoplan.sql` | M |
| 11.2 | **TypeScript interfaces** — `AutoplanBuilding`, `AutoplanFloor`, `AutoplanPlan`, `AutoplanApproval`, `PlacedSymbol`, `Annotation`, `AIAnalysisResult`, `SymbolDefinition`, canvas viewport types | `lib/autoplan/types.ts` | S |
| 11.3 | **Symbol definitions** — 18 BS 5499/ISO 7010 fire safety symbols. Each: id, label, category, color, SVG path data, default dimensions, BS reference. Categories: escape (4), equipment (6), doors (4), detection (3), lighting (1) | `lib/autoplan/symbols.ts` | M |

**Deliverable:** Database ready, types defined, symbol library complete.

---

## Phase 2 — Core Logic

**Depends on:** Phase 1 (11.2 types, 11.3 symbols)
**Unlocks:** Phase 3 API routes
**Parallel:** 11.4→11.5→11.6 are sequential. 11.13 is independent.

| # | Task | Depends | File | Est. |
|---|------|---------|------|------|
| 11.4 | **Claude vision analyzer** — prompt builder (injects building context), sends floor plan PNG to Claude Sonnet vision API, parses structured JSON response (elements + suggested_symbols + warnings + regulatory_notes), validates response shape | 11.2 | `lib/autoplan/analyzer.ts` | M |
| 11.5 | **Inngest function: `analyzeFloorPlan`** — event `autoplan/floor.uploaded`. Steps: (1) fetch floor + building, (2) download PDF from storage → render to PNG at 2048px via pdfjs-dist → upload preview PNG, (3) call analyzer, (4) store results + update status, (5) audit log. All binary work in single step to avoid serialization issues. | 11.2, 11.4 | `lib/inngest/autoplanFunctions.ts` | L |
| 11.6 | **Register Inngest function** — import `analyzeFloorPlan`, add to exports array (function #9) | 11.5 | `lib/inngest/functions.ts` (modify) | XS |
| 11.13 | **PDF generator** — `generateAutoplanPdf()`. Uses pdf-lib. A3 landscape. (1) Load original floor plan PDF, embed into template. (2) For each PlacedSymbol, calculate PDF coords from normalised positions, draw text-based symbol (e.g. "FD30" in blue circle, "E" in green square) at position. (3) Draw title block: blue accent bar, HF logo area, building name, floor, ref HF-AP-xxxx, scale, date, jurisdiction, evacuation strategy, approver details. (4) Draw symbol key/legend. (5) Draw regulatory compliance text. Returns Uint8Array. | 11.2, 11.3 | `lib/autoplan/pdfGenerator.ts` | L |

**Deliverable:** AI analysis pipeline works end-to-end. PDF export generates branded output.

---

## Phase 3 — API Routes

**Depends on:** Phase 1 (11.1 migration), Phase 2 (11.5 Inngest, 11.13 PDF gen)
**Unlocks:** Phase 5 pages
**Parallel:** All routes are independent of each other.

| # | Task | Depends | File | Est. |
|---|------|---------|------|------|
| 11.7 | **Buildings list + create** — GET: list buildings for auth org, ordered by created_at desc. POST: create building, validate all fields with zod, insert, return building. | 11.1 | `app/api/autoplan/buildings/route.ts` | S |
| 11.8 | **Building detail + update + delete** — GET: building + floors (with ai_analysis_status) + plans (with status). PATCH: update building fields. DELETE: cascade delete (floors, plans, approvals, audit entries). | 11.1 | `app/api/autoplan/buildings/[id]/route.ts` | M |
| 11.9 | **Floor upload** — POST multipart. Accept `.pdf` only, max 50MB. Save to `autoplan/{org_id}/floors/{id}.pdf` in storage. Create `autoplan_floors` record. Send `autoplan/floor.uploaded` Inngest event. Return floor record. | 11.1, 11.5 | `app/api/autoplan/floors/route.ts` | M |
| 11.10 | **Floor delete** — DELETE: remove storage file + preview PNG, delete record (cascades to plans). | 11.1 | `app/api/autoplan/floors/[id]/route.ts` | S |
| 11.11 | **Plan create + save** — POST: create plan from floor's AI analysis. Populate `symbol_data` from `ai_analysis_result.suggested_symbols`. Generate `plan_reference` via `nextval('autoplan_number_seq')` → `HF-AP-XXXX`. PATCH: save `symbol_data` + `annotations` + `canvas_viewport` (auto-save from editor). | 11.1 | `app/api/autoplan/plans/route.ts` + `app/api/autoplan/plans/[id]/route.ts` | M |
| 11.12 | **Plan approve** — POST: validate all 8 checklist items are true, require `approver_name` + `approver_qualifications`. Create `autoplan_approvals` record. Update plan status → `approved`. Insert audit log. | 11.1 | `app/api/autoplan/plans/[id]/approve/route.ts` | M |
| 11.14 | **Plan export** — POST: call `generateAutoplanPdf()`. Upload result to storage `autoplan/{org_id}/exports/{ref}.pdf`. Update plan `final_pdf_path` + `final_pdf_size`. Return signed download URL. | 11.1, 11.13 | `app/api/autoplan/plans/[id]/export/route.ts` | M |

**Deliverable:** Full REST API working. Can create buildings, upload floors, trigger AI, create plans, save edits, approve, export PDF.

---

## Phase 4 — UI Components

**Depends on:** Phase 1 (11.2 types, 11.3 symbols)
**Unlocks:** Phase 5 pages
**Parallel:** All components are independent. 11.19 PlanCanvas is the critical path item.

| # | Task | Depends | File | Est. |
|---|------|---------|------|------|
| 11.15 | **BuildingCard** — Card with building name, address (truncated), storeys + height badge, evacuation strategy badge, floor count, plan count (approved/total). Click → navigate to building dashboard. HF blue accents, IBM Plex font. | 11.2 | `components/autoplan/BuildingCard.tsx` | S |
| 11.16 | **FloorCard** — Card with floor name/number, upload status (uploaded/analyzing/ready/failed), AI confidence badge, file size. "Generate Plan" button (enabled when AI complete). "Delete" button. | 11.2 | `components/autoplan/FloorCard.tsx` | S |
| 11.17 | **BuildingForm** — Form for all building fields. Jurisdiction radio (England/Scotland/Wales). Building use dropdown. Evacuation strategy dropdown. Feature checkboxes (sprinklers, dry riser, wet riser). Zod validation. Used in both new + edit pages. | 11.2 | `components/autoplan/BuildingForm.tsx` | M |
| 11.18 | **SymbolPalette** — Left panel (200px wide). Symbols grouped by category (Escape, Equipment, Doors, Detection, Lighting). Each symbol is a draggable card with icon + label + BS reference. Drag creates ghost element that follows cursor. Collapsible category headers. Search filter at top. | 11.2, 11.3 | `components/autoplan/SymbolPalette.tsx` | L |
| 11.19 | **PlanCanvas** ★ — HTML5 Canvas component. **Rendering:** floor plan PNG as background, placed symbols rendered as colored shapes with text labels, annotations (lines, text, zones). **Interactions:** drag-drop from palette (new symbols), click-select placed symbols, drag-move placed symbols, scroll-zoom (cursor-centered), middle-click pan, keyboard shortcuts (Delete, Ctrl+Z, Ctrl+Shift+Z, R for rotate, +/- for scale, Ctrl+S for save). **State:** undo/redo stack (snapshots of symbol_data array). **Events:** dispatches `onSymbolSelect`, `onSymbolsChange`, `onSave`. Normalised coordinates (0-1) for symbol positions. | 11.2, 11.3 | `components/autoplan/PlanCanvas.tsx` | XL |
| 11.20 | **CanvasToolbar** — Floating toolbar at bottom of canvas. Buttons: zoom in, zoom out, fit to screen, pan mode toggle, select mode toggle, delete selected, undo, redo. Zoom percentage display. Current tool indicator. | 11.2 | `components/autoplan/CanvasToolbar.tsx` | M |
| 11.21 | **PropertiesPanel** — Right panel (280px). Three sections: (1) **Selected Symbol** — type, position, rotation slider, scale slider, label text input, delete button. Empty state when nothing selected. (2) **AI Notes** — confidence percentage, warnings list, regulatory notes. (3) **Compliance Checklist** — 8 mandatory items with checkboxes (read-only display, tracked for approval gate). | 11.2, 11.3 | `components/autoplan/PropertiesPanel.tsx` | M |
| 11.22 | **ApprovalModal** — Modal dialog. Fields: approver name, qualifications (IFE number, FPA cert, etc.), company (default "Harmony Fire"). Displays attestation text. Shows checklist summary (all 8 must be checked on PropertiesPanel first). Confirm button disabled until all checklist items complete. Calls `/api/autoplan/plans/[id]/approve`. | 11.2 | `components/autoplan/ApprovalModal.tsx` | M |

**Deliverable:** All UI building blocks ready. Canvas editor renders and handles interactions.

---

## Phase 5 — Pages

**Depends on:** Phase 3 (API routes) + Phase 4 (components)
**Unlocks:** Phase 6 integration
**Parallel:** 11.23-11.25 are parallel. 11.26 depends on editor components.

| # | Task | Depends | File | Est. |
|---|------|---------|------|------|
| 11.23 | **Building list page** `/autoplan` — Auth required. Page header "AutoPlan — Fire Safety Plans". Grid of BuildingCards. "New Building" button (top right, HF blue). Empty state: "No buildings yet — create your first building to start generating fire safety plans." Follows existing page patterns (IBM Plex, #FCFCFA bg). | 11.7, 11.15 | `app/autoplan/page.tsx` | S |
| 11.24 | **New building page** `/autoplan/new` — Page header "New Building". BuildingForm component. On submit → POST to API → redirect to `/autoplan/[buildingId]`. Cancel button → back to list. | 11.7, 11.17 | `app/autoplan/new/page.tsx` | S |
| 11.25 | **Building dashboard** `/autoplan/[buildingId]` — Building header card (name, full address, height, storeys, evacuation, jurisdiction, features). Floor plans section: FloorCard grid + "Upload Floor Plan" button (opens upload modal with drag-drop, accepts .pdf only). Plans section: plan cards with status badges (draft/review/approved), "Open Editor" button, "Download PDF" button (if approved). Polls for AI analysis status updates. | 11.8, 11.9, 11.11, 11.15, 11.16 | `app/autoplan/[buildingId]/page.tsx` | L |
| 11.26 | **Canvas editor page** ★ `/autoplan/editor/[planId]` — Full-screen three-panel layout. **Top bar:** back arrow → building dashboard, plan reference (HF-AP-xxxx), floor name, status badge, Save button, Approve button (opens ApprovalModal), Export PDF button. **Left:** SymbolPalette (200px). **Center:** PlanCanvas (flex-1). **Right:** PropertiesPanel (280px). Fetches plan data on mount, loads floor plan preview PNG as canvas background, populates symbol_data. Auto-saves on Ctrl+S. | 11.11, 11.12, 11.14, 11.18, 11.19, 11.20, 11.21, 11.22 | `app/autoplan/editor/[planId]/page.tsx` | L |

**Deliverable:** Full user flow working end-to-end from building creation to PDF export.

---

## Phase 6 — Integration

**Depends on:** Phase 5 (all pages working)
**Parallel:** Both tasks independent.

| # | Task | Depends | File | Est. |
|---|------|---------|------|------|
| 11.27 | **Sidebar icon** — Add `Flame` from lucide-react to LeftSidebar nav. Position: after Scope, before bottom section. Label: "AutoPlan", Tooltip: "AutoPlan — Fire Safety Plans". Route: `/autoplan`. Only visible when authenticated. | Phase 5 | `components/LeftSidebar.tsx` (modify) | XS |
| 11.28 | **Documentation** — Update CLAUDE.md: table count (36), Inngest count (9), key files. Update BUILD_PLAN.md: add Sprint 11 section, update totals. | Phase 5 | `CLAUDE.md`, `BUILD_PLAN.md` | S |

**Deliverable:** AutoPlan accessible from sidebar. Documentation current.

---

## Execution Order (Critical Path)

```
START
  │
  ├── 11.1 Migration ─────────────────────────────┐
  ├── 11.2 Types ──────────┬──────────────────────┐│
  └── 11.3 Symbols ────────┤                      ││
                           │                      ││
           ┌───────────────┤                      ││
           │               │                      ▼▼
           ▼               ▼           11.7  Buildings API ──┐
     11.4 Analyzer    11.13 PDF gen   11.8  Building [id] ──┤
           │               │          11.9  Floor upload ───┤
           ▼               │          11.10 Floor delete ───┤
     11.5 Inngest fn       │          11.11 Plans CRUD ─────┤
           │               │          11.12 Plans approve ──┤
           ▼               └───────→  11.14 Plans export ───┤
     11.6 Register fn                                       │
                                                            │
     11.15 BuildingCard ────────────────────────────────────┤
     11.16 FloorCard ──────────────────────────────────────┤
     11.17 BuildingForm ───────────────────────────────────┤
     11.18 SymbolPalette ──────────────────────────────────┤
     11.19 PlanCanvas ★ ───────────────────────────────────┤
     11.20 CanvasToolbar ──────────────────────────────────┤
     11.21 PropertiesPanel ────────────────────────────────┤
     11.22 ApprovalModal ──────────────────────────────────┤
                                                            │
                                                            ▼
                                              11.23 List page
                                              11.24 New page
                                              11.25 Dashboard page
                                              11.26 Editor page ★
                                                            │
                                                            ▼
                                              11.27 Sidebar icon
                                              11.28 Documentation
                                                            │
                                                          DONE
```

**Critical path:** 11.2 → 11.3 → 11.19 (PlanCanvas) → 11.26 (Editor page)

The PlanCanvas is the single most complex component. Everything else is standard CRUD. Start 11.19 as early as possible.

---

## Size Estimates

| Size | Meaning | Count |
|------|---------|-------|
| XS | < 30 lines, trivial | 2 |
| S | 30-80 lines, straightforward | 7 |
| M | 80-200 lines, moderate complexity | 12 |
| L | 200-400 lines, significant logic | 5 |
| XL | 400+ lines, complex interactions | 2 (PlanCanvas, Editor page) |

**Total new files:** 25
**Total modified files:** 3
**Estimated new lines:** ~4,500-5,500

---

## Verification Checklist

After each phase, verify:

- [ ] `npm run typecheck` — pass
- [ ] `npm run lint` — pass (warnings OK)
- [ ] `npm run build` — compile, all 97+ pages generated

End-to-end flow:
- [ ] Create building with all fields
- [ ] Upload PDF floor plan → processing status shown
- [ ] AI analysis completes → confidence + symbols returned
- [ ] Create plan → editor opens with AI-placed symbols
- [ ] Drag new symbol from palette onto canvas
- [ ] Move, rotate, scale existing symbols
- [ ] Undo/redo works
- [ ] Save persists symbol_data to database
- [ ] All 8 checklist items checkable
- [ ] Approve with name + qualifications
- [ ] Export generates branded A3 PDF with symbols + title block
- [ ] PDF downloads correctly
- [ ] Sidebar Flame icon navigates to /autoplan
