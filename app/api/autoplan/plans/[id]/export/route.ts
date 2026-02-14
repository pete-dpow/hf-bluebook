import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { generateAutoplanPdf } from "@/lib/autoplan/pdfGenerator";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** POST /api/autoplan/plans/[id]/export — generate and store final PDF */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  // Fetch plan with related data
  const { data: plan, error: planError } = await supabaseAdmin
    .from("autoplan_plans")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (planError || !plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  // Fetch building
  const { data: building, error: buildingError } = await supabaseAdmin
    .from("autoplan_buildings")
    .select("*")
    .eq("id", plan.building_id)
    .single();

  if (buildingError || !building) return NextResponse.json({ error: "Building not found" }, { status: 404 });

  // Fetch floor
  const { data: floor, error: floorError } = await supabaseAdmin
    .from("autoplan_floors")
    .select("*")
    .eq("id", plan.floor_id)
    .single();

  if (floorError || !floor) return NextResponse.json({ error: "Floor not found" }, { status: 404 });

  // Fetch approval if exists
  const { data: approvals } = await supabaseAdmin
    .from("autoplan_approvals")
    .select("*")
    .eq("plan_id", params.id)
    .order("approved_at", { ascending: false })
    .limit(1);

  const approval = approvals && approvals.length > 0 ? approvals[0] : undefined;

  // Download original floor plan PDF from storage
  const { data: floorPlanFile, error: downloadError } = await supabaseAdmin.storage
    .from("autoplan")
    .download(floor.storage_path);

  if (downloadError || !floorPlanFile) {
    return NextResponse.json({ error: "Failed to download floor plan file" }, { status: 500 });
  }

  const floorPlanPdfBytes = new Uint8Array(await floorPlanFile.arrayBuffer());

  // Generate the branded PDF
  const pdfBytes = await generateAutoplanPdf({
    plan,
    building,
    floor,
    approval,
    floorPlanPdfBytes,
  });

  // Upload result to storage
  const exportPath = `autoplan/${auth.organizationId}/exports/${plan.plan_reference}.pdf`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("autoplan")
    .upload(exportPath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: `Failed to store PDF: ${uploadError.message}` }, { status: 500 });
  }

  // Update plan with final PDF path and size
  await supabaseAdmin
    .from("autoplan_plans")
    .update({
      final_pdf_path: exportPath,
      final_pdf_size: pdfBytes.length,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id);

  // Create signed download URL (1 hour expiry)
  const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
    .from("autoplan")
    .createSignedUrl(exportPath, 3600);

  if (signedUrlError || !signedUrlData) {
    return NextResponse.json({ error: "PDF generated but failed to create download URL" }, { status: 500 });
  }

  return NextResponse.json({
    url: signedUrlData.signedUrl,
    path: exportPath,
    size: pdfBytes.length,
    plan_reference: plan.plan_reference,
  });
}
