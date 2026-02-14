# hf.bluebook — Remaining Tasks (Dependency Order)

> All tasks ordered so nothing starts before its dependencies are done.
> Sprints 2-8 are complete. Emergency Auth Sprint is complete.

---

## Phase A: SharePoint Write-Back (10 tasks)
**Priority: HIGH — unlocks file storage for all other features**
**Depends on: Microsoft Entra ID login (DONE)**

| # | Task | Description | Depends on |
|---|------|-------------|------------|
| SP.1 | SharePoint client lib | `lib/sharepoint/client.ts` — token refresh, upload file, create folder, list files. Wraps Graph API `PUT /drives/{driveId}/items/{parentId}:/{filename}:/content` | — |
| SP.2 | Org SharePoint config | Add `sharepoint_site_id` + `sharepoint_drive_id` to `organizations` table. Migration + API to save config | — |
| SP.3 | Auto-create folder structure | On first write, create `/hf.bluebook/Quotes/`, `/Products/`, `/Compliance/`, `/GoldenThread/`, `/Projects/` folders in chosen doc library | SP.1 + SP.2 |
| SP.4 | Quote write-back | After generating quote PDF/Excel → upload to `/hf.bluebook/Quotes/HF-Q-{number}.pdf`, store `sharepoint_item_id` on quotes table | SP.3 |
| SP.5 | Scraped product files write-back | When scraper downloads spec PDFs/datasheets → upload to `/hf.bluebook/Products/{manufacturer}/` | SP.3 |
| SP.6 | Large file upload (>10MB) | Replace current "blocked" error → upload to SharePoint. Small files still go to Supabase as fallback | SP.3 |
| SP.7 | Golden Thread export write-back | After generating BSA package → upload all files to `/hf.bluebook/GoldenThread/{package_ref}/` | SP.3 |
| SP.8 | SharePoint config UI | Settings drawer section: pick SharePoint site + document library from dropdown, test connection button | SP.2 |
| SP.9 | File links in UI | Product files, quotes, Golden Thread pages show SharePoint webUrl links (opens in browser/SharePoint) | SP.4 + SP.5 + SP.7 |
| SP.10 | Supabase fallback | If SharePoint not configured or token expired → fall back to Supabase Storage (current behaviour). No data loss | SP.1 |

---

## Phase B: Sprint 1 Remaining — Rebrand Polish (17 tasks)
**Priority: MEDIUM — cosmetic text changes, no logic**
**Depends on: Nothing (can run parallel with anything)**

| # | Task | Description | Depends on |
|---|------|-------------|------------|
| 1.6.10 | Invite page text | `app/invite/[token]/page.tsx` — dpow → hf.bluebook | — |
| 1.6.11 | Dashboard text | `app/dashboard/page.tsx` | — |
| 1.6.12 | Chat page text | `app/chat/page.tsx` | — |
| 1.6.13 | Demo page text | `app/demo/page.tsx` | — |
| 1.6.14 | Pricing page text | `app/pricing/page.tsx` | — |
| 1.6.15 | Scope page text | `app/scope/page.tsx` | — |
| 1.6.16 | Report page text | `app/report/page.tsx` | — |
| 1.6.17 | WhatsApp webhook text | `app/api/whatsapp/webhook/route.ts` — message text only | — |
| 1.6.18 | About drawer text | `components/AboutDrawer.tsx` | — |
| 1.6.19 | Help drawer text | `components/HelpDrawer.tsx` | — |
| 1.6.20 | Chat drawer text | `components/ChatDrawer.tsx` | — |
| 1.6.21 | Chat provider text | `components/ChatDrawerProvider.tsx` | — |
| 1.6.22 | Chat input placeholder | `components/ChatInput.tsx` | — |
| 1.6.23 | Profile drawer text | `components/ProfileDrawer.tsx` | — |
| 1.6.24 | Settings drawer text | `components/SettingsDrawer.tsx` | — |
| 1.6.25 | Legal drawer product name | `components/LegalDrawer.tsx` — product name only, NOT company/email | — |
| 1.6.26 | Twilio notification title | `lib/twilioClient.ts` | — |

**Plus 3 page rebrands:**

| # | Task | Description | Depends on |
|---|------|-------------|------------|
| 1.12.3 | Scope page rebrand | `/scope` — HF colors, text, no logic changes | — |
| 1.12.4 | Summary page rebrand | `/summary` — HF colors, text, no logic changes | — |
| 1.12.5 | Preview page rebrand | `/preview` — HF colors, text, no logic changes | — |

---

## Phase C: Sprint 9 — Polish + Cleanup (8 tasks)
**Priority: MEDIUM**
**Depends on: Phase A (SharePoint) + Phase B (rebrand)**

| # | Task | Description | Depends on |
|---|------|-------------|------------|
| 9.1 | PDF/DXF parsers | Parse uploaded product files for metadata extraction | — |
| 9.2 | Inngest: parseProductFile | Background job to auto-extract specs from uploaded PDFs | 9.1 |
| 9.3 | Surveying shell page | `/surveying` — placeholder "Coming Soon" with HF branding | — |
| 9.4 | Update CLAUDE.md | Final build state — table counts, Inngest counts, key files | Phase A + B |
| 9.5 | Clean up dead code | Remove unused freemium paths, test routes, debug endpoints | — |
| 9.6 | Domain migration | Update Vercel URLs, email addresses, OAuth redirects to new domain (ONLY when new domain ready) | Phase B |
| 9.7 | Brand colors | Update `globals.css` HSL variables + dark mode to HF blue palette | — |
| 9.8 | Tailwind verify | Verify HSL vars flow through tailwind.config.ts | 9.7 |

---

## Phase D: Sprint 10 — Advanced Surveying (31 tasks)
**Priority: LOW — future sprint, after demo approval**
**Depends on: Phase A (SharePoint for scan file storage)**
**Full spec: `surveyingarchitecture.md`**

### Group 1: Foundation (parallel)
| # | Task | Depends on |
|---|------|------------|
| 10.1 | Database migration — 4 tables, 1 sequence, 7 indexes, 10 RLS | — |
| 10.2 | Supabase Storage bucket `survey-scans` | — |
| 10.3 | npm install web-e57 @loaders.gl/core @loaders.gl/las @tarikjabiri/dxf | — |
| 10.4 | TypeScript interfaces `lib/surveying/types.ts` | — |

### Group 2: Parser
| 10.5 | LAS/LAZ parser | 10.3 + 10.4 |

### Group 3: Algorithms (parallel)
| 10.6 | Voxel grid decimator (downsample to 2M points) | 10.5 |
| 10.7 | Floor detector (Z-histogram, Gaussian smooth, local maxima) | 10.5 |
| 10.8 | Wall detector (RANSAC line fitting, merge collinear) | 10.5 |

### Group 4: E57 Converter
| 10.9 | E57→LAZ converter (wraps web-e57) | 10.3 |

### Group 5: Inngest Pipeline
| 10.10 | `processSurveyScan` Inngest function | 10.5-10.9 |
| 10.11 | Register in functions array | 10.10 |

### Group 6: API Routes
| 10.12 | GET list + POST upload scans | 10.1 + 10.2 |
| 10.13 | GET scan detail + DELETE | 10.12 |
| 10.14 | GET signed URL for decimated point cloud | 10.13 |
| 10.15 | PATCH confirm/rename floor | 10.13 |

### Group 7: Export Generators
| 10.16 | Shared layout calculator (scale, paper dims) | 10.4 |
| 10.17 | PDF generator (pdf-lib, HF title block, A1/A3/A4) | 10.16 |
| 10.18 | DXF exporter (@tarikjabiri/dxf, layers) | 10.16 |

### Group 8: Export API
| 10.19 | POST generate PDF or DXF for a floor | 10.13 + 10.17 + 10.18 |
| 10.20 | GET download generated plan | 10.19 |

### Group 9: UI Components (parallel)
| 10.21 | Drag-drop upload card (.e57, .las, .laz) | 10.4 |
| 10.22 | Scan grid card (name, size, status badge) | 10.4 |
| 10.23 | 3D point cloud viewer (Three.js, OrbitControls) | 10.4 |
| 10.24 | Floor level panel (list, confirm, rename) | 10.4 |
| 10.25 | 2D floor plan viewer (SVG walls, dimensions) | 10.4 |

### Group 10: Tools Panel
| 10.26 | Left tools panel (scan info, floors, export controls) | 10.24 |

### Group 11: Pages
| 10.27 | Surveying dashboard (`/surveying`) | 10.12 + 10.21 + 10.22 |
| 10.28 | Scan viewer (`/surveying/[id]`) — split-screen 3D/2D | 10.13-10.15 + 10.23-10.26 |

### Group 12: Integration
| 10.29 | Wire export buttons to API | 10.19 + 10.26 |
| 10.30 | Update CLAUDE.md | 10.29 |
| 10.31 | Update BUILD_PLAN.md | 10.30 |

---

## Execution Order Summary

```
Phase A: SharePoint Write-Back     ←── START HERE (10 tasks)
    │
    ├── Phase B: Rebrand Polish    ←── parallel (20 tasks, text-only)
    │
    ▼
Phase C: Sprint 9 Polish           ←── after A + B (8 tasks)
    │
    ▼
Phase D: Sprint 10 Surveying       ←── after demo approval (31 tasks)
```

**Total remaining: 69 tasks**
- Phase A: 10 tasks (SharePoint — critical path)
- Phase B: 20 tasks (rebrand — parallel, no-risk text changes)
- Phase C: 8 tasks (polish — after A+B)
- Phase D: 31 tasks (surveying — future)

**For the demo: Phase A + B = 30 tasks gets you a fully working app with SharePoint file storage.**
