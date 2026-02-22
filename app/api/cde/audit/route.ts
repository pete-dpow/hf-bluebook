// GET /api/cde/audit — Paginated, filtered audit log

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const entityType = url.searchParams.get("entityType");
  const entityId = url.searchParams.get("entityId");
  const eventType = url.searchParams.get("eventType");
  const search = url.searchParams.get("search");
  const rawPage = parseInt(url.searchParams.get("page") || "1");
  const rawLimit = parseInt(url.searchParams.get("limit") || "100");

  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 100 : Math.min(rawLimit, 500);

  const supabase = getSupabaseAdmin();
  let query = supabase.from("cde_audit_log").select("*", { count: "exact" });

  if (entityType) query = query.eq("entity_type", entityType);
  if (entityId) query = query.eq("entity_id", entityId);
  if (eventType) query = query.eq("event_type", eventType);
  if (search) {
    const s = search.replace(/[%_\\]/g, "\\$&");
    query = query.or(`entity_ref.ilike.%${s}%,detail.ilike.%${s}%,user_name.ilike.%${s}%`);
  }

  query = query.order("created_at", { ascending: false });
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events: data || [], total: count || 0, page, totalPages: Math.ceil((count || 0) / limit) });
}
