// GET /api/cde/audit/export — Export audit log as CSV

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entityType = req.nextUrl.searchParams.get("entityType");

  const supabase = getSupabaseAdmin();
  let query = supabase.from("cde_audit_log").select("*").order("created_at", { ascending: false }).limit(5000);

  if (entityType) query = query.eq("entity_type", entityType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build CSV
  const headers = ["Timestamp", "Event Type", "Entity Type", "Entity Ref", "User", "Detail"];
  const rows = (data || []).map((e) => [
    new Date(e.created_at).toISOString(),
    e.event_type,
    e.entity_type,
    e.entity_ref || "",
    e.user_name || "System",
    (e.detail || "").replace(/"/g, '""'),
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
  ].join("\n");

  // Log export
  await supabase.from("cde_audit_log").insert({
    event_type: "EXPORT",
    entity_type: "audit",
    user_id: auth.user.id,
    user_name: auth.user.email,
    detail: `Exported ${rows.length} audit events as CSV`,
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="cde_audit_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
