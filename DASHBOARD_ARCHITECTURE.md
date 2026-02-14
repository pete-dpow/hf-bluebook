# hf.bluebook — Dashboard Architecture

> For review before building. Matches the Figma stakeholder portal design adapted to fire protection context.

---

## 1. What This Is

The `/dashboard` page replaces the current "coming soon" placeholder with a personalised dashboard per user. The layout follows the Figma design's main content area — the User Profile Header is the centrepiece, with summary cards below that will change per user type in future.

**This sprint:** Profile Header + placeholder summary cards with real data where available.
**Future sprint:** User-type-specific cards (surveyor vs estimator vs admin vs client).

---

## 2. Layout — Main Content Area Only

The left sidebar (64px) and projects panel already exist. This spec covers only the main content area (everything right of the projects panel).

```
┌─────────────────────────────────────────────────────────┐
│  USER PROFILE HEADER                                     │
│  ┌──────────┐  Name, Role, Org          ┌─ Key Insights─┐│
│  │  Avatar   │  Email                   │ Products  │ x  ││
│  │  (80px)   │  Member Since            │ Quotes    │ x  ││
│  │           │  Organisation            │ Scraped   │ x  ││
│  └──────────┘  [Edit Details]           └───────────────┘│
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─ Quick Actions ─────────────────────────────────────┐ │
│  │  [Products] [Quotes] [Compliance] [Golden Thread]    │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─ Recent Quotes ──────┐  ┌─ Recent Activity ────────┐ │
│  │  HF-Q-0001  Draft    │  │  Logged in via Entra ID  │ │
│  │  HF-Q-0002  Sent     │  │  Generated quote HF-Q-3  │ │
│  │  HF-Q-0003  Approved │  │  Scraped Quelfire catalog │ │
│  │  [View All →]        │  │  [View All →]            │ │
│  └──────────────────────┘  └──────────────────────────┘ │
│                                                           │
│  ┌─ Product Coverage ──────────────────────────────────┐ │
│  │  Fire Doors      ████████████░░  85%                │ │
│  │  Dampers          ██████░░░░░░░  45%                │ │
│  │  Fire Stopping    ████████░░░░░  60%                │ │
│  │  Retro FS         ███░░░░░░░░░░  25%                │ │
│  │  Auro Lume        ██░░░░░░░░░░░  15%                │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 3. User Profile Header — Exact Spec

Matches Figma design. Full-width card at the top of the main content area.

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  ┌──────┐                                   ┌── Key Insights ────┐ │
│  │      │  Display Name         Role Badge  │                    │ │
│  │Avatar│  email@company.com               │  Products    142   │ │
│  │80x80 │  Organisation: Harmony Fire       │  Active Quotes  7  │ │
│  │      │  Member Since: Jan 2025           │  Compliance   14   │ │
│  └──────┘  [Edit Details]                   └────────────────────┘ │
│                                                                     │
│  Tags: [Active] [Admin] [Microsoft Connected]                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Sources

| Field | Source | Query |
|-------|--------|-------|
| Display Name | `users.display_name` or `auth.user.user_metadata.full_name` or email prefix | Supabase auth + users table |
| Email | `auth.user.email` | Supabase auth |
| Avatar | Initials in gradient circle (matching Figma) | Derived from display name |
| Role | `organization_members.role` | authHelper `getAuthUser()` |
| Organisation | `organizations.name` | JOIN via `users.active_organization_id` |
| Member Since | `auth.user.created_at` | Supabase auth |
| Microsoft Connected | `users.microsoft_access_token IS NOT NULL` | users table |
| Tags | Role (admin/member), status (active), MS connected | Derived |

### Key Insights Panel (right side of header)

| Metric | Source | Query |
|--------|--------|-------|
| Products | `COUNT(*) FROM products WHERE organization_id = ?` | Dashboard API |
| Active Quotes | `COUNT(*) FROM quotes WHERE organization_id = ? AND status IN ('draft','sent')` | Dashboard API |
| Compliance | `COUNT(*) FROM regulations WHERE organization_id = ?` | Dashboard API |

### Avatar — Photo Upload With Background Removal

Matches the Figma design: a clean portrait cutout with no background, displayed in a rounded frame.

**Flow:**
1. User clicks avatar → file picker opens (accepts `.jpg`, `.png`, `.webp`)
2. Photo loads in browser → `@imgly/background-removal` runs client-side (WASM/ONNX, no API key, free)
3. Background-removed PNG displayed immediately as preview
4. On confirm → upload processed PNG to Supabase Storage `avatars/{user_id}.png`
5. Store URL in `users.avatar_url` column

**Fallback:** If no photo uploaded, show initials in a gradient circle (same as current).

**Library:** `@imgly/background-removal` — runs entirely in browser, ~5MB WASM model downloaded on first use, cached after. Apache-2.0 license. No server cost, no API key.

**Storage:** Supabase Storage bucket `avatars` (public, <2MB per image). Avatar images are small PNGs after background removal.

**Database:** Add `avatar_url TEXT` column to `users` table.

### Styling

- Background: `white` with `border: 1px solid #E5E7EB`, `border-radius: 16px`
- Avatar: 80x80 rounded-lg (soft square like Figma, not circle), shows background-removed photo or initials fallback
- Avatar frame: `border: 2px solid #E5E7EB`, subtle shadow
- Name: Cormorant Garamond, 1.75rem, `#1F2937`
- Email/details: IBM Plex Sans, 0.875rem, `#6B7280`
- Tags: Small rounded pills — Active (green), Admin (blue), Microsoft Connected (cyan)
- Key Insights: Right-aligned card within the header, 3 metric columns, number in Cormorant bold, label in IBM Plex 0.75rem
- Edit Details button: outlined, `border: 1px solid #E5E7EB`, opens profile drawer

---

## 4. Summary Cards Below Header

### Quick Actions Row

4 action tiles linking to key features. Each tile: icon + label, `border-radius: 12px`, hover lift effect.

| Tile | Icon | Route |
|------|------|-------|
| Products | `Package` | `/products` |
| Quotes | `FileText` | `/quotes` |
| Compliance | `ShieldCheck` | `/compliance` |
| Golden Thread | `Scroll` | `/golden-thread` |

### Recent Quotes Card

- Title: "Recent Quotes" with "View All" link to `/quotes`
- Shows 5 most recent quotes: `quote_number`, `client_name`, `status` badge, `total`
- Status badges: Draft (grey), Sent (blue), Approved (green), Rejected (red), Cancelled (grey strikethrough)
- Source: `quotes` table, ordered by `created_at DESC`, limit 5

### Recent Activity Card

- Title: "Recent Activity" with "View All" link (future)
- Shows recent actions: login, quote generation, scrape completion, GT export
- Source: Assembled from multiple tables (quotes, scrape_jobs, golden_thread_audit) ordered by timestamp
- Limit: 5 most recent

### Product Coverage Card

- Title: "Product Coverage by Pillar"
- Horizontal progress bars per pillar (matching the Figma "Project Completion" stacked bars pattern)
- Shows count + percentage of products with `status = 'active'` per pillar
- 5 pillars: Fire Doors, Dampers, Fire Stopping, Retro Fire Stopping, Auro Lume
- Bar colours: HF blue gradient per pillar
- Source: `products` table, `GROUP BY pillar`, `COUNT(*)`

---

## 5. Dashboard API Route

**File:** `app/api/dashboard/route.ts`

Single GET endpoint returning all dashboard data in one call.

```typescript
// Response shape
{
  user: {
    display_name: string;
    email: string;
    role: "admin" | "member";
    organization_name: string;
    member_since: string;        // ISO date
    microsoft_connected: boolean;
  },
  stats: {
    total_products: number;
    active_quotes: number;
    total_regulations: number;
  },
  recent_quotes: [{
    id: string;
    quote_number: string;
    client_name: string;
    status: string;
    total: number;
    created_at: string;
  }],
  recent_activity: [{
    type: "login" | "quote" | "scrape" | "golden_thread";
    description: string;
    timestamp: string;
  }],
  pillar_coverage: [{
    pillar: string;
    display_name: string;
    count: number;
    percentage: number;
  }]
}
```

---

## 6. Files

### New Files (5)

| File | Purpose |
|------|---------|
| `app/api/dashboard/route.ts` | Dashboard data API — single GET endpoint |
| `app/api/avatar/route.ts` | POST upload processed avatar PNG to Supabase Storage, save URL to users table |
| `components/dashboard/UserProfileHeader.tsx` | Profile header component matching Figma (avatar + name + insights) |
| `components/dashboard/AvatarUpload.tsx` | Click-to-upload with `@imgly/background-removal`, preview, confirm |
| `supabase/migrations/003_avatar_url.sql` | Add `avatar_url TEXT` to `users` table |

### Modified Files (1)

| File | Change |
|------|--------|
| `app/dashboard/page.tsx` | Replace "coming soon" with full dashboard layout |

### npm Install (1)

```
@imgly/background-removal
```

---

## 7. What This Does NOT Include

- **Left projects panel** — already exists, untouched
- **Right sidebar** (Staff panel from Figma) — future, per user type
- **Calendar** — future
- **Planned vs Actual chart** — future, needs historical data
- **User type switching** — future (surveyor/estimator/admin/client will get different cards)

---

## 8. Design Tokens (from Figma)

| Element | Value |
|---------|-------|
| Card background | `#FFFFFF` |
| Card border | `1px solid #E5E7EB` |
| Card radius | `16px` |
| Page background | `#FCFCFA` |
| Primary blue | `#0056a7` |
| Button blue | `#0078d4` |
| Heading font | Cormorant Garamond, 600 weight |
| Body font | IBM Plex Sans, 400 weight |
| Tag: Active | `bg: #DCFCE7, text: #166534` |
| Tag: Admin | `bg: rgba(0,86,167,0.1), text: #0056a7` |
| Tag: MS Connected | `bg: rgba(0,120,212,0.1), text: #0078d4` |
| Status: Draft | `bg: #F3F4F6, text: #6B7280` |
| Status: Sent | `bg: rgba(37,99,235,0.1), text: #2563EB` |
| Status: Approved | `bg: #DCFCE7, text: #166534` |
| Status: Rejected | `bg: #FEE2E2, text: #DC2626` |
| Pillar bar | `linear-gradient(90deg, #0056a7, #0078d4)` |
