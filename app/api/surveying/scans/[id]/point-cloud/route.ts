import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** GET /api/surveying/scans/[id]/point-cloud — signed URL for decimated point cloud */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: scan } = await supabaseAdmin
    .from("survey_scans")
    .select("decimated_storage_path, organization_id, processing_status")
    .eq("id", params.id)
    .single();

  if (!scan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (scan.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (scan.processing_status !== "ready" || !scan.decimated_storage_path) {
    return NextResponse.json(
      { error: "Scan not ready. Current status: " + scan.processing_status },
      { status: 422 }
    );
  }

  const { data: signedUrl, error } = await supabaseAdmin.storage
    .from("survey-scans")
    .createSignedUrl(scan.decimated_storage_path, 3600); // 1 hour

  if (error || !signedUrl) {
    return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 });
  }

  return NextResponse.json({ url: signedUrl.signedUrl });
}
