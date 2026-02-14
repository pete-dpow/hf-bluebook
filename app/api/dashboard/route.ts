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

  const userId = auth.user.id;
  const orgId = auth.organizationId;

  // Get full user data from auth
  const { data: { user: authUser } } = await supabaseAdmin.auth.getUser(
    req.headers.get("authorization")?.replace("Bearer ", "") || ""
  );

  // Get user record
  const { data: userRecord } = await supabaseAdmin
    .from("users")
    .select("display_name, avatar_url, active_organization_id, microsoft_access_token")
    .eq("id", userId)
    .single();

  // Get organization name
  let organizationName = "";
  if (orgId) {
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();
    organizationName = org?.name || "";
  }

  // Get role
  let role = "member";
  if (orgId) {
    const { data: membership } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("user_id", userId)
      .eq("organization_id", orgId)
      .single();
    role = membership?.role || "member";
  }

  // Build user profile
  const displayName = userRecord?.display_name
    || authUser?.user_metadata?.full_name
    || auth.user.email.split("@")[0];

  const user = {
    display_name: displayName,
    email: auth.user.email,
    avatar_url: userRecord?.avatar_url || null,
    role,
    organization_name: organizationName,
    member_since: authUser?.created_at || "",
    microsoft_connected: !!userRecord?.microsoft_access_token,
  };

  // Stats — parallel queries
  const statsPromises = [];

  if (orgId) {
    statsPromises.push(
      supabaseAdmin.from("products").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabaseAdmin.from("quotes").select("id", { count: "exact", head: true }).eq("organization_id", orgId).in("status", ["draft", "sent"]),
      supabaseAdmin.from("regulations").select("id", { count: "exact", head: true }).eq("organization_id", orgId)
    );
  }

  const [productsRes, quotesRes, regulationsRes] = orgId
    ? await Promise.all(statsPromises)
    : [{ count: 0 }, { count: 0 }, { count: 0 }];

  const stats = {
    total_products: (productsRes as any)?.count || 0,
    active_quotes: (quotesRes as any)?.count || 0,
    total_regulations: (regulationsRes as any)?.count || 0,
  };

  // Recent quotes
  let recentQuotes: any[] = [];
  if (orgId) {
    const { data } = await supabaseAdmin
      .from("quotes")
      .select("id, quote_number, client_name, status, total, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5);
    recentQuotes = data || [];
  }

  // Recent activity — assembled from multiple sources
  const activityItems: { type: string; description: string; timestamp: string }[] = [];

  if (orgId) {
    // Recent quotes as activity
    const { data: recentQuoteActivity } = await supabaseAdmin
      .from("quotes")
      .select("quote_number, status, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(3);

    for (const q of recentQuoteActivity || []) {
      activityItems.push({
        type: "quote",
        description: `Quote ${q.quote_number} — ${q.status}`,
        timestamp: q.created_at,
      });
    }

    // Recent scrape jobs
    const { data: recentScrapes } = await supabaseAdmin
      .from("scrape_jobs")
      .select("target_url, status, completed_at, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(2);

    for (const s of recentScrapes || []) {
      const domain = new URL(s.target_url).hostname.replace("www.", "");
      activityItems.push({
        type: "scrape",
        description: `Scraped ${domain} — ${s.status}`,
        timestamp: s.completed_at || s.created_at,
      });
    }
  }

  // Sort activity by timestamp descending, limit 5
  activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const recentActivity = activityItems.slice(0, 5);

  // Pillar coverage
  let pillarCoverage: { pillar: string; display_name: string; count: number; percentage: number }[] = [];
  if (orgId) {
    const pillars = [
      { key: "fire_doors", display: "Fire Doors" },
      { key: "dampers", display: "Dampers" },
      { key: "fire_stopping", display: "Fire Stopping" },
      { key: "retro_fire_stopping", display: "Retro Fire Stopping" },
      { key: "auro_lume", display: "Auro Lume" },
    ];

    const { count: totalCount } = await supabaseAdmin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId);

    const total = totalCount || 1; // avoid division by zero

    for (const p of pillars) {
      const { count } = await supabaseAdmin
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("pillar", p.key);

      pillarCoverage.push({
        pillar: p.key,
        display_name: p.display,
        count: count || 0,
        percentage: Math.round(((count || 0) / total) * 100),
      });
    }
  }

  return NextResponse.json({
    user,
    stats,
    recent_quotes: recentQuotes,
    recent_activity: recentActivity,
    pillar_coverage: pillarCoverage,
  });
}
