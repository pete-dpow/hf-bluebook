import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { generatePlanPdf } from "@/lib/surveying/planPdfGenerator";
import { generatePlanDxf } from "@/lib/surveying/planDxfExporter";
import type { SurveyWall, ExportOptions } from "@/lib/surveying/types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** POST /api/surveying/floors/[id]/export — generate PDF or DXF plan */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();
  const format = body.format || "pdf";
  const paperSize = body.paper_size || "A3";
  const scale = body.scale || "1:100";
  const projectName = body.project_name || "";

  if (!["pdf", "dxf"].includes(format)) {
    return NextResponse.json({ error: "Format must be 'pdf' or 'dxf'" }, { status: 400 });
  }

  // Get floor + walls
  const { data: floor } = await supabaseAdmin
    .from("survey_floors")
    .select("*, survey_walls(*)")
    .eq("id", params.id)
    .single();

  if (!floor) return NextResponse.json({ error: "Floor not found" }, { status: 404 });

  // Verify org access via scan
  const { data: scan } = await supabaseAdmin
    .from("survey_scans")
    .select("organization_id, scan_name")
    .eq("id", floor.scan_id)
    .single();

  if (!scan || scan.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Generate plan reference
  const { data: seqData } = await supabaseAdmin.rpc("nextval_text", { seq_name: "plan_number_seq" });
  const planNum = seqData || "1";
  const planReference = `HF-PLN-${String(planNum).padStart(4, "0")}`;

  const walls: SurveyWall[] = floor.survey_walls || [];
  const options: ExportOptions = {
    format,
    paper_size: paperSize,
    scale,
    floor_label: floor.floor_label,
    project_name: projectName || scan.scan_name,
    plan_reference: planReference,
  };

  let fileBuffer: Buffer;
  let contentType: string;
  let fileExt: string;

  if (format === "pdf") {
    const pdfBytes = await generatePlanPdf(walls, options);
    fileBuffer = Buffer.from(pdfBytes);
    contentType = "application/pdf";
    fileExt = "pdf";
  } else {
    const dxfContent = generatePlanDxf(walls, options);
    fileBuffer = Buffer.from(dxfContent, "utf-8");
    contentType = "application/dxf";
    fileExt = "dxf";
  }

  // Store plan file
  const storagePath = `${auth.organizationId}/plans/${planReference}.${fileExt}`;
  await supabaseAdmin.storage
    .from("survey-scans")
    .upload(storagePath, fileBuffer, { contentType, upsert: true });

  // Create plan record
  const { data: plan, error } = await supabaseAdmin
    .from("survey_plans")
    .insert({
      floor_id: params.id,
      organization_id: auth.organizationId,
      plan_reference: planReference,
      plan_format: format,
      paper_size: paperSize,
      scale,
      storage_path: storagePath,
      file_size_bytes: fileBuffer.length,
      generated_by: auth.user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(plan, { status: 201 });
}
