import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { uploadProductFileWithFallback } from "@/lib/sharepoint/uploadWithFallback";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const productId = formData.get("product_id") as string;
  const fileType = (formData.get("file_type") as string) || "other";

  if (!file || !productId) {
    return NextResponse.json({ error: "file and product_id required" }, { status: 400 });
  }

  // Verify product belongs to org and get manufacturer name
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("organization_id, manufacturer_id")
    .eq("id", productId)
    .single();

  if (!product || product.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Get manufacturer name for SharePoint folder path
  const { data: manufacturer } = await supabaseAdmin
    .from("manufacturers")
    .select("name")
    .eq("id", product.manufacturer_id)
    .single();

  const manufacturerName = manufacturer?.name || "Unknown";
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await uploadProductFileWithFallback(
      auth.user.id,
      auth.organizationId,
      productId,
      manufacturerName,
      file.name,
      fileBuffer,
      file.type
    );

    const { data, error } = await supabaseAdmin.from("product_files").insert({
      product_id: productId,
      file_type: fileType,
      file_name: file.name,
      file_storage: result.storage,
      file_path: result.path,
      file_url: result.url,
      file_size: fileBuffer.length,
      mime_type: file.type,
      uploaded_by: auth.user.id,
      sharepoint_drive_id: result.driveId,
      sharepoint_item_id: result.itemId,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ file: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
