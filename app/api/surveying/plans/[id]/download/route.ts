import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** GET /api/surveying/plans/[id]/download — signed URL for plan download */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: plan } = await supabaseAdmin
    .from("survey_plans")
    .select("storage_path, organization_id, plan_reference, plan_format")
    .eq("id", params.id)
    .single();

  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  if (plan.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: signedUrl, error } = await supabaseAdmin.storage
    .from("survey-scans")
    .createSignedUrl(plan.storage_path, 3600);

  if (error || !signedUrl) {
    return NextResponse.json({ error: "Failed to generate download URL" }, { status: 500 });
  }

  return NextResponse.json({
    url: signedUrl.signedUrl,
    filename: `${plan.plan_reference}.${plan.plan_format}`,
  });
}
