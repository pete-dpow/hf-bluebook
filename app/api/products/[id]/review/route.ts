import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const body = await req.json();
  const approve = body.approve !== false;

  const { data, error } = await supabaseAdmin
    .from("products")
    .update({
      needs_review: false,
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
      status: approve ? "active" : "draft",
      pillar: body.pillar || undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId!)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data });
}
