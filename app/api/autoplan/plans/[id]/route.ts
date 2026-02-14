import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** GET /api/autoplan/plans/[id] — single plan with floor, building, and approval */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data: plan, error } = await supabaseAdmin
    .from("autoplan_plans")
    .select("*, autoplan_floors(*), autoplan_buildings(*), autoplan_approvals(*)")
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (error || !plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  return NextResponse.json({ plan });
}

/** PATCH /api/autoplan/plans/[id] — save symbol_data, annotations, canvas_viewport */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  // Verify plan exists and is editable
  const { data: existing } = await supabaseAdmin
    .from("autoplan_plans")
    .select("status")
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  if (existing.status !== "draft" && existing.status !== "review") {
    return NextResponse.json({ error: "Cannot edit a plan with status: " + existing.status }, { status: 400 });
  }

  const body = await req.json();

  // Only allow specific fields to be updated
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.symbol_data !== undefined) updates.symbol_data = body.symbol_data;
  if (body.annotations !== undefined) updates.annotations = body.annotations;
  if (body.canvas_viewport !== undefined) updates.canvas_viewport = body.canvas_viewport;

  const { data, error } = await supabaseAdmin
    .from("autoplan_plans")
    .update(updates)
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plan: data });
}

/** DELETE /api/autoplan/plans/[id] — delete plan if not approved */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  // Check plan status before deleting
  const { data: existing } = await supabaseAdmin
    .from("autoplan_plans")
    .select("status")
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  if (existing.status === "approved") {
    return NextResponse.json({ error: "Cannot delete an approved plan" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("autoplan_plans")
    .delete()
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
