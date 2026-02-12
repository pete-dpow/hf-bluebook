# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

hf.bluebook — Harmony Fire's fire protection product intelligence platform. Built on top of dpow.chat (kept 100%), adding product catalog, compliance library, quote generation, web scraping, RAG knowledge base, and BSA Golden Thread export.

## Build Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript check (tsc --noEmit)
npm run postinstall  # Copy WASM files for web-ifc (runs automatically after npm install)
```

## Architecture

- **Framework**: Next.js 13.5 App Router (NO pages/ directory)
- **Database**: Supabase (PostgreSQL + pgvector + Auth + Storage)
- **AI Models**: GPT-4o-mini (chat), Claude Sonnet (knowledge/compliance), GPT-4o (normalizer), text-embedding-3-small (all embeddings, 1536 dims)
- **Background Jobs**: Inngest (runs on Inngest infrastructure, NOT Vercel)
- **Scraping**: Playwright via Inngest (NOT Cheerio, NOT Browserless.io)
- **UI**: shadcn/ui + Tailwind CSS + Lucide icons
- **3D/IFC Viewer**: Three.js + @thatopen/components + web-ifc (WASM). Webpack configured for `asyncWebAssembly` in `next.config.js`.
- **Fonts**: Cormorant Garamond (headings) + IBM Plex Sans (body)
- **Path alias**: `@/*` maps to project root (tsconfig.json)

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
ANTHROPIC_API_KEY
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
RESEND_API_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
MICROSOFT_CLIENT_ID
MICROSOFT_CLIENT_SECRET
MICROSOFT_TENANT_ID
```

## Key Files

```
app/layout.tsx                    — Root layout, fonts, metadata
app/globals.css                   — HSL color variables (shadcn theming)
app/page.tsx                      — Home/Melvin chat
app/api/hybrid-chat/route.ts      — Main chat with 5-mode classifier
lib/authHelper.ts                 — getAuthUser + isAdmin for API routes
lib/supabase.ts                   — Supabase client init
lib/hybridSearch.ts               — Vector + keyword hybrid search
lib/embeddingService.ts           — OpenAI embedding wrapper (1536 dims)
lib/dpowAiClient.ts              — AI client (filename kept for import compat, NOT renamed yet)
lib/inngest/client.ts             — Inngest client
lib/inngest/functions.ts          — 7 background job definitions
lib/scrapers/playwrightScraper.ts — Single scraper for products + regulations
components/LeftSidebar.tsx        — Fixed 64px nav with icons + tooltips
scripts/copy-wasm.js             — Postinstall: copies web-ifc WASM to public/wasm/
```

## Database

- **27 tables total** (12 existing dpow.chat + 15 new)
- **38 RLS policies** on new tables
- **3 RPC functions**: match_products, match_bluebook_chunks, match_regulation_sections
- **1 sequence**: quote_number_seq
- All vectors are VECTOR(1536) using text-embedding-3-small
- **Migrations**: `supabase/migrations/` — Sprint 2 tables in `001_sprint2_tables.sql`, earlier dpow.chat migrations for tokens + pgvector

## Melvin Chat Modes (5)

| Mode | Model | Searches |
|------|-------|----------|
| GENERAL | GPT-4o-mini | Model knowledge only |
| PROJECT | GPT-4o-mini | User's Excel data (pgvector) |
| PRODUCT | GPT-4o-mini | Product catalog DB |
| KNOWLEDGE | Claude Sonnet | Bluebook PDFs + compliance regulations |
| FULL | Claude Sonnet | Everything combined |

## 5 Pillars

`fire_doors`, `dampers`, `fire_stopping`, `retro_fire_stopping`, `auro_lume`

These are Harmony Fire's product divisions. Hardcoded in products table CHECK constraint and pillar_schemas.

## Patterns

- **HSL Theming**: CSS vars in globals.css → Tailwind via `hsl(var(--name))`. Primary blue: `209 100% 33%` (#0056a7).
- **Custom Events**: Components use `window.dispatchEvent(new CustomEvent('name', { detail }))` for cross-component communication (e.g., `toggleProjectsPanel`, `openProfileDrawer`, `activeProjectChanged`).
- **Drawer Architecture**: Right-side drawers (About, Help, Legal, Profile, Settings) open via custom events. LeftSidebar is fixed 64px. ProjectsPanel slides from left.
- **Blue Gradient Mouse Tracker**: Body background has a blue gradient following the cursor — do NOT remove or override in `app/layout.tsx` or `app/page.tsx`.
- **File Storage**: Supabase (<10MB) + SharePoint (>10MB) dual storage for product files.
- **Auth**: All routes require login. Use `getAuthUser(req)` from `lib/authHelper.ts`. Returns `{ user, isAdmin, organizationId }`.
- **Quote Numbers**: Use Postgres SEQUENCE (`nextval('quote_number_seq')`), NOT max+1.
- **WASM**: `next.config.js` enables `asyncWebAssembly` + client-side fallbacks (`fs: false, net: false, tls: false`) for web-ifc IFC/BIM parsing.
- **Form Validation**: react-hook-form + zod for schema validation.

## Critical Rules

1. **Embeddings are ALWAYS 1536 dims** (text-embedding-3-small). Never use text-embedding-3-large.
2. **Scraper uses Playwright on Inngest infrastructure** — not Vercel, not Browserless, not Cheerio.
3. **Quote status includes 'cancelled'** — don't forget it in CHECK constraints.
4. **RLS policies use org membership checks** — never expose data across organizations.
5. **Structure-aware chunking** for RAG — don't split fire test configurations across chunks.
6. **Do NOT change yet** (needs new domain/services first): Vercel URLs (`dpow-chat.vercel.app`), email addresses (`*@dpow.co.uk`), `dpow.ai` subdomains, `lib/dpowAiClient.ts` filename, localStorage keys (`dpow_*`).
7. **Console removal**: `next.config.js` strips `console.*` in production builds — use `lib/logger.ts` for persistent logging.

## Build Progress

Sprints 1-3 are complete (UI shell, database, data mining). See `BUILD_PLAN.md` for remaining tasks in Sprints 4-9. Sprint 1 has ~17 cosmetic rebrand tasks still open (text changes only, no logic).

## Reference Docs

- `ARCHITECTURE.md` — Complete technical spec (database schemas, all RLS policies, API routes, component specs)
- `BUILD_PLAN.md` — Sprint-based build checklist with dependencies and execution order
