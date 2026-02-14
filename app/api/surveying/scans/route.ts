import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "@/lib/inngest/client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_FORMATS = ["las", "laz", "e57"];

/** GET /api/surveying/scans — list scans for org */
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("survey_scans")
    .select("*, survey_floors(count)")
    .eq("organization_id", auth.organizationId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/** POST /api/surveying/scans — upload a scan file (multipart) */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const scanName = (formData.get("scan_name") as string) || "";
  const projectId = (formData.get("project_id") as string) || null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = file.name.toLowerCase().split(".").pop() || "";
  if (!ALLOWED_FORMATS.includes(ext)) {
    return NextResponse.json(
      { error: `Unsupported format. Allowed: ${ALLOWED_FORMATS.join(", ")}` },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum 500MB." }, { status: 400 });
  }

  const name = scanName || file.name.replace(/\.\w+$/, "");
  const storagePath = `${auth.organizationId}/${Date.now()}_${file.name}`;

  // Upload to Supabase Storage
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabaseAdmin.storage
    .from("survey-scans")
    .upload(storagePath, buffer, {
      contentType: "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Create scan record
  const { data: scan, error: dbError } = await supabaseAdmin
    .from("survey_scans")
    .insert({
      organization_id: auth.organizationId,
      project_id: projectId,
      uploaded_by: auth.user.id,
      scan_name: name,
      original_filename: file.name,
      file_format: ext as "las" | "laz" | "e57",
      storage_path: storagePath,
      file_size_bytes: file.size,
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Trigger Inngest processing
  await inngest.send({
    name: "survey/scan.uploaded",
    data: { scan_id: scan.id },
  });

  return NextResponse.json(scan, { status: 201 });
}
