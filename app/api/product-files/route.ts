import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_SUPABASE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const productId = formData.get("product_id") as string;
  const fileType = (formData.get("file_type") as string) || "other";

  if (!file || !productId) {
    return NextResponse.json({ error: "file and product_id required" }, { status: 400 });
  }

  // Verify product belongs to org
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("organization_id")
    .eq("id", productId)
    .single();

  if (!product || product.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  if (fileBuffer.length <= MAX_SUPABASE_SIZE) {
    // Store in Supabase Storage
    const storagePath = `product-files/${auth.organizationId}/${productId}/${file.name}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("product-files")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: urlData } = supabaseAdmin.storage
      .from("product-files")
      .getPublicUrl(storagePath);

    const { data, error } = await supabaseAdmin.from("product_files").insert({
      product_id: productId,
      file_type: fileType,
      file_name: file.name,
      file_storage: "supabase",
      file_path: storagePath,
      file_url: urlData.publicUrl,
      file_size: fileBuffer.length,
      mime_type: file.type,
      uploaded_by: auth.user.id,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ file: data }, { status: 201 });
  } else {
    // File > 10MB — would go to SharePoint
    // For now, return an error with instructions
    return NextResponse.json({
      error: "File exceeds 10MB. SharePoint upload will be available when M365 is connected.",
    }, { status: 413 });
  }
}
