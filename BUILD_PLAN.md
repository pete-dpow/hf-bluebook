# HF.bluebook — Build Plan

> Lean sprint checklist. Reference `ARCHITECTURE.md` for technical details.

---

## Sprint 1 — UI Shell + Rebrand

No backend dependencies. Pure visual changes.

- [x] **1.3** `package.json` — name `"nextjs"` → `"hf-bluebook"`
- [x] **1.4** `app/layout.tsx` — title "HF.bluebook", description, favicon `/hf_logo.svg` (body background NOT changed — blue gradient mouse tracker must be preserved)
- [x] **1.5** `public/hf_logo.svg` — add HF logo
- [ ] **1.6** dpow → HF.bluebook text rebrand — split into subtasks below. Do NOT change Vercel URLs, email addresses, or OAuth redirects.
  - [x] **1.6.1** `app/api/hybrid-chat/route.ts` — system prompts (CRITICAL)
  - [x] **1.6.2** `app/api/chat/route.ts` — system prompt (CRITICAL)
  - [x] **1.6.3** `app/api/freemium-chat/route.ts` — system prompt (CRITICAL)
  - [x] **1.6.4** `lib/dpowAiClient.ts` — system prompt text (CRITICAL)
  - [x] **1.6.5** `app/api/summary-report/route.ts` — system prompt (CRITICAL)
  - [x] **1.6.6** `lib/reportGenerator.ts` — report branding (CRITICAL)
  - [x] **1.6.7** `app/page.tsx` — main landing page text (CRITICAL)
  - [x] **1.6.8** `app/auth/page.tsx` — sign-in page text (CRITICAL)
  - [x] **1.6.9** `app/auth/callback/page.tsx` — auth callback text (CRITICAL)
  - [ ] **1.6.10** `app/invite/[token]/page.tsx` — invite page text
  - [ ] **1.6.11** `app/dashboard/page.tsx` — dashboard text
  - [ ] **1.6.12** `app/chat/page.tsx` — chat page text
  - [ ] **1.6.13** `app/demo/page.tsx` — demo page text
  - [ ] **1.6.14** `app/pricing/page.tsx` — pricing page text
  - [ ] **1.6.15** `app/scope/page.tsx` — scope page text
  - [ ] **1.6.16** `app/report/page.tsx` — report page text
  - [ ] **1.6.17** `app/api/whatsapp/webhook/route.ts` — message text only, NOT email
  - [ ] **1.6.18** `components/AboutDrawer.tsx` — about text
  - [ ] **1.6.19** `components/HelpDrawer.tsx` — help text
  - [ ] **1.6.20** `components/ChatDrawer.tsx` — chat drawer text
  - [ ] **1.6.21** `components/ChatDrawerProvider.tsx` — provider text
  - [ ] **1.6.22** `components/ChatInput.tsx` — placeholder text
  - [ ] **1.6.23** `components/ProfileDrawer.tsx` — profile text
  - [ ] **1.6.24** `components/SettingsDrawer.tsx` — settings text
  - [ ] **1.6.25** `components/LegalDrawer.tsx` — product name only, NOT company/email
  - [ ] **1.6.26** `lib/twilioClient.ts` — notification title
- [x] **1.7** `components/LeftSidebar.tsx` — update logo, alt text, sign-in text + add new nav icons (Products, Quotes, Manufacturers, Data Mining, Compliance, Golden Thread, Surveying)
- [x] **1.8** `components/RightSidebar.tsx` — update "About dpow.chat" tooltip to "About HF.bluebook"
- [x] **1.9** `app/page.tsx` — 4 suggestion pills below chat box, rotating prompts from pool per mode (PRODUCT/KNOWLEDGE/PROJECT/GENERAL), auto-fills + opens chat drawer
- [x] **1.10** `app/dashboard/page.tsx` — dashboard shell + LayoutDashboard icon in sidebar (full tile design deferred to Figma)
- [x] **1.11** chat.Melvin rebrand — ChatDrawerWrapper header "Melvin", 5-mode dropdown (PRODUCT/KNOWLEDGE/FULL coming soon), ChatInput placeholder + export titles rebranded
- [ ] **1.12** Rebrand existing pages — split into subtasks below.
  - [x] **1.12.1** Add Report Lucide icon to LeftSidebar (route to `/report`)
  - [x] **1.12.2** Rebrand `/report` page — HF colors, text, no logic changes
  - [ ] **1.12.3** Rebrand `/scope` page — HF colors, text, no logic changes
  - [ ] **1.12.4** Rebrand `/summary` page — HF colors, text, no logic changes
  - [ ] **1.12.5** Rebrand `/preview` page — HF colors, text, no logic changes

### dpow → HF.bluebook Safe Text Changes (1.6)

Files to update (display text only — NOT URLs, emails, or OAuth):
```
app/page.tsx, app/dashboard/page.tsx, app/demo/page.tsx,
app/auth/page.tsx, app/auth/callback/page.tsx,
app/chat/page.tsx, app/invite/[token]/page.tsx,
app/pricing/page.tsx, app/scope/page.tsx, app/report/page.tsx,
app/api/chat/route.ts (system prompt),
app/api/hybrid-chat/route.ts (system prompts),
app/api/freemium-chat/route.ts (system prompt),
app/api/summary-report/route.ts (system prompt),
app/api/whatsapp/webhook/route.ts (messages only, NOT email),
components/AboutDrawer.tsx, components/HelpDrawer.tsx,
components/ChatDrawer.tsx, components/ChatDrawerProvider.tsx,
components/ChatInput.tsx, components/ProfileDrawer.tsx,
components/SettingsDrawer.tsx, components/RightSidebar.tsx,
components/LegalDrawer.tsx (product name only, NOT company/email),
lib/dpowAiClient.ts (system prompt text),
lib/twilioClient.ts (notification title),
lib/reportGenerator.ts (report branding)
```

### Do NOT change yet (needs new domain/services first):
```
dpow-chat.vercel.app URLs (auth callbacks, Stripe, Microsoft OAuth)
crane@dpow.co.uk, help@dpow.co.uk, noreply@dpow.co.uk emails
dpow.ai / *.dpow.ai subdomains (AppSwitcherBubble)
lib/dpowAiClient.ts filename (needs import updates across codebase)
localStorage keys (dpow_cookie_consent, dpow_theme, etc.)
```

---

## Sprint 2 — Database

Everything else depends on this.

- [x] **2.1** Enable pgvector extension
- [x] **2.2** Run ALL table migrations (15 new tables — see ARCHITECTURE.md §6)
- [x] **2.3** Create quote_number_seq sequence
- [x] **2.4** Create ALL indexes (21 standard + 3 IVFFlat deferred until data exists)
- [x] **2.5** Create ALL RLS policies (37 policies on new tables — RLS enabled on new tables only, existing tables untouched)
- [x] **2.6** Create ALL RPC functions: match_products, match_bluebook_chunks, match_regulation_sections
- [x] **2.7** Create `lib/authHelper.ts` (getAuthUser + isAdmin)
- [x] **2.8** Seed pillar_schemas with 5 pillar definitions and field specs

---

## Sprint 3 — Data Mining (Scraper + Manufacturers + Products)

**Depends on:** Sprint 2

- [x] **3.1** Install Inngest + Playwright: `npm install inngest playwright`
- [x] **3.2** Create `lib/inngest/client.ts` + `lib/inngest/functions.ts`
- [x] **3.3** Create `app/api/inngest/route.ts` (serve endpoint)
- [x] **3.4** Create `lib/scrapers/playwrightScraper.ts`
- [x] **3.5** Manufacturers CRUD — API routes (`/api/manufacturers/...`)
- [x] **3.6** Manufacturers pages (`/manufacturers`, `/manufacturers/new`, `/manufacturers/[id]`)
- [x] **3.7** ManufacturerCard component
- [x] **3.8** Products CRUD — API routes (`/api/products/...`)
- [x] **3.9** Products pages (`/products`, `/products/new`, `/products/[id]`)
- [x] **3.10** ProductCard, ProductListRow, ProductFilter components
- [x] **3.11** Product file upload API + Supabase/SharePoint dual storage
- [x] **3.12** Inngest function: `scrapeManufacturer` (Playwright scrape → upsert products)
- [x] **3.13** Inngest function: `generateProductEmbeddings` (text-embedding-3-small)
- [x] **3.14** Data Mining dashboard page (`/data-mining`) — scrape jobs, status, progress + supplier requests
- [x] **3.15** ScraperProgress component
- [x] **3.16** Product review workflow — needs_review flag, `/api/products/[id]/review`, approval UI
- [x] **3.17** Supplier requests — API + page + SupplierRequestCard + RequestSupplierModal

---

## Sprint 4 — Quotes

**Depends on:** Sprint 3 (needs products)

**Execution order** (critical path: 4.8 → 4.1 → 4.3/4.4 → 4.2 → 4.5/4.6 → 4.7):

- [x] **4.8** Quote number generation via Postgres sequence (`/api/quotes/next-number`) — do FIRST, no deps, calls `nextval('quote_number_seq')`
- [x] **4.1** Quotes CRUD — API routes (`/api/quotes/...`) + `lib/quoteCalculations.ts` — core API, pages + components depend on this
- [x] **4.3** QuoteBuilder, QuoteLineItemRow, QuoteTotals components — UI building blocks for pages
- [x] **4.4** ProductSearchModal (search products to add to quote) — used inside QuoteBuilder to add line items
- [x] **4.2** Quotes pages (`/quotes`, `/quotes/new`, `/quotes/[id]`) — wires together API + components
- [x] **4.5** Quote PDF generation (pdf-lib) — `lib/quoteGenerator.ts` + `/api/quotes/[id]/generate-pdf`
- [x] **4.6** Quote Excel generation (exceljs) — `npm install exceljs` + `/api/quotes/[id]/generate-excel`
- [x] **4.7** Inngest function: `sendQuoteEmail` (Resend + PDF attachment) — `/api/quotes/[id]/send`

---

## Sprint 5 — RAG Knowledge Base

**Depends on:** Sprint 2 (database) + existing M365 OAuth

- [x] **5.1** Install pdf-parse: `npm install pdf-parse`
- [x] **5.2** Create `lib/bluebook/chunker.ts` (structure-aware chunking — splits on section headers/table boundaries, keeps fire test configs atomic)
- [x] **5.3** Create `lib/bluebook/embeddings.ts` (OpenAI embedding wrapper, wraps central embeddingService + adds `embedChunks()`)
- [x] **5.4** Create `lib/bluebook/pillarDetector.ts` (auto-detect pillar from filename + content keywords)
- [x] **5.5** PDF ingestion API (`/api/bluebook/ingest`) — triggers Inngest job, creates ingestion log
- [x] **5.6** Bluebook search API (`/api/bluebook/search`) — vector search via `match_bluebook_chunks` RPC
- [x] **5.7** Knowledge base status API (`/api/bluebook/status`) — chunk counts by pillar, file counts, ingestion logs
- [x] **5.8** Inngest function: `ingestBluebookPDFs` — downloads from OneDrive via M365 Graph, chunks, embeds, stores in `bluebook_chunks`
- [x] **5.9** Ingestion trigger UI + status display (`/knowledge` page, admin only) — stats cards, pillar breakdown, ingest form, history table

---

## Sprint 6 — Compliance Library

**Depends on:** Sprint 3 (scraper infrastructure)

- [x] **6.1** Create `lib/compliance/regulationScraper.ts` — wraps playwrightScraper, adds embedding + storage for regulation_sections
- [x] **6.2** Compliance CRUD — API routes (`/api/compliance`, `/api/compliance/[id]`, `/api/compliance/[id]/scrape`, `/api/compliance/search`)
- [x] **6.3** Compliance pages (`/compliance`, `/compliance/[id]`) — searchable card grid with filters (category, pillar, status)
- [x] **6.4** RegulationCard, RegulationDetail components
- [x] **6.5** Inngest function: `scrapeRegulation`
- [x] **6.6** Seed all 14 starting regulations from live sources
- [x] **6.7** "Update" CTA on each regulation card for re-scraping
- [x] **6.8** Product ↔ Regulation cross-links (`product_regulations` table + UI)
- [x] **6.9** ComplianceTab component for quote detail page

---

## Sprint 7 — Golden Thread

**Depends on:** Sprint 4 (quotes) + Sprint 6 (compliance)

- [ ] **7.1** Create `lib/goldenThread/compiler.ts` (data aggregation)
- [ ] **7.2** Create `lib/goldenThread/validator.ts` (BSA Section 88/91 checks)
- [ ] **7.3** Create `lib/goldenThread/pdfGenerator.ts` (Playwright page.pdf())
- [ ] **7.4** Golden Thread API routes (`/api/golden-thread/...`)
- [ ] **7.5** Inngest function: `generateGoldenThread`
- [ ] **7.6** Golden Thread pages (`/golden-thread`, `/golden-thread/[id]`)
- [ ] **7.7** GoldenThreadModal, GoldenThreadPackageCard components
- [ ] **7.8** JSON export format
- [ ] **7.9** PDF handover pack (client-branded, TOC, sections)
- [ ] **7.10** CSV export (ZIP with multiple CSVs)
- [ ] **7.11** Audit trail logging + view

---

## Sprint 8 — Enhanced Melvin

**Depends on:** Sprint 5 (RAG) + Sprint 6 (compliance)

- [ ] **8.1** Install Anthropic SDK: `npm install @anthropic-ai/sdk`
- [ ] **8.2** Update classifier in `/api/hybrid-chat` — 5 modes (GENERAL/PROJECT/PRODUCT/KNOWLEDGE/FULL)
- [ ] **8.3** PRODUCT mode: query product catalog via match_products RPC
- [ ] **8.4** KNOWLEDGE mode: query bluebook_chunks + regulation_sections (Claude for generation)
- [ ] **8.5** FULL mode: combine all data sources (Claude for generation)
- [ ] **8.6** Citation formatting — source file, page number, regulation reference
- [ ] **8.7** AI Normalizer (`/api/normalize`) — GPT-4o spec extraction from scraped HTML
- [ ] **8.8** Schema validator — validate extracted specs against pillar schemas

---

## Sprint 9 — Polish + Future

- [ ] **9.1** PDF/DXF parsers for uploaded product files
- [ ] **9.2** Inngest function: `parseProductFile`
- [ ] **9.3** Surveying shell page (`/surveying`) — placeholder "Coming Soon"
- [ ] **9.4** Update CLAUDE.md with final build state
- [ ] **9.5** Clean up: remove unused freemium paths, test routes, debug endpoints
- [ ] **9.6** Dangerous dpow changes — update Vercel URLs, email addresses, OAuth redirects (ONLY after new domain is configured)
- [ ] **9.7** Brand colors — update `globals.css` HSL variables + dark mode to HF blue palette
- [ ] **9.8** `tailwind.config.ts` — verify HSL vars flow through (no structural changes needed)

---

## Dependencies Graph

```
Sprint 1 (UI) ──────────────────────────────────────────────→ partial (17 cosmetic tasks remain)
Sprint 2 (Database) ────────────────────────────────────────→ ✅ done
Sprint 3 (Data Mining) ── depends on Sprint 2 ─────────────→ ✅ done
Sprint 4 (Quotes) ─────── depends on Sprint 3 ─────────────→ ✅ done
Sprint 5 (RAG) ────────── depends on Sprint 2 ─────────────→ ✅ done
Sprint 6 (Compliance) ─── depends on Sprint 3 ─────────────→ in progress (6.5-6.9 remaining)
Sprint 7 (Golden Thread) ─ depends on Sprint 4 + Sprint 6 ─→ pending
Sprint 8 (Melvin) ──────── depends on Sprint 5 + Sprint 6 ─→ pending
Sprint 9 (Polish) ──────── depends on all above ───────────→ pending
```

**Sprints 1+2 are sequential. Sprints 3-6 have parallelism. Sprints 7-8 need earlier sprints done. Sprint 9 is last.**

---

## New Dependencies (npm install)

```
inngest
playwright
@anthropic-ai/sdk
pdf-parse
exceljs
```

---

## Totals

- **9 sprints**, **~80 tasks**
- **15 new database tables** + 3 RPC functions + 38 RLS policies
- **~35 new API routes**
- **~16 new pages**
- **~19 new components**
- **~20 new lib files**
- **7 Inngest background functions**
