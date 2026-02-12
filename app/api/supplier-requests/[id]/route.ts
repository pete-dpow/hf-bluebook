import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const body = await req.json();
  const update: any = { updated_at: new Date().toISOString() };

  if (body.status === "approved") {
    update.status = "approved";
    update.approved_by = auth.user.id;
    update.approved_at = new Date().toISOString();
  } else if (body.status === "rejected") {
    update.status = "rejected";
    update.rejected_reason = body.rejected_reason || null;
  } else if (body.status === "completed") {
    update.status = "completed";
  }

  const { data, error } = await supabaseAdmin
    .from("supplier_requests")
    .update(update)
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId!)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ request: data });
}
