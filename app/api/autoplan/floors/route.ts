import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "@/lib/inngest/client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/** POST /api/autoplan/floors — upload a floor plan PDF */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const buildingId = formData.get("building_id") as string;
  const floorNumber = formData.get("floor_number") as string;
  const floorName = (formData.get("floor_name") as string) || null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!buildingId) return NextResponse.json({ error: "building_id is required" }, { status: 400 });
  if (floorNumber === null || floorNumber === undefined || floorNumber === "") {
    return NextResponse.json({ error: "floor_number is required" }, { status: 400 });
  }

  // Validate PDF format
  const ext = file.name.toLowerCase().split(".").pop() || "";
  if (ext !== "pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum 50MB." }, { status: 400 });
  }

  // Verify building belongs to org
  const { data: building } = await supabaseAdmin
    .from("autoplan_buildings")
    .select("id, organization_id")
    .eq("id", buildingId)
    .single();

  if (!building || building.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Building not found" }, { status: 404 });
  }

  // Upload to Supabase Storage
  const fileId = crypto.randomUUID();
  const storagePath = `autoplan/${auth.organizationId}/floors/${fileId}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from("autoplan")
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // Create floor record
  const { data: floor, error: dbError } = await supabaseAdmin
    .from("autoplan_floors")
    .insert({
      building_id: buildingId,
      uploaded_by: auth.user.id,
      floor_number: parseInt(floorNumber, 10),
      floor_name: floorName,
      storage_path: storagePath,
      original_filename: file.name,
      file_size_bytes: file.size,
      ai_analysis_status: "pending",
    })
    .select()
    .single();

  if (dbError) {
    // Clean up uploaded file on DB failure
    await supabaseAdmin.storage.from("autoplan").remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Trigger AI analysis via Inngest
  await inngest.send({
    name: "autoplan/floor.uploaded",
    data: {
      floor_id: floor.id,
      building_id: buildingId,
      user_id: auth.user.id,
    },
  });

  return NextResponse.json({ floor }, { status: 201 });
}
