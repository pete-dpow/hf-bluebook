import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Guess file_type from filename.
 */
function guessFileType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("datasheet") || lower.includes("data-sheet") || lower.includes("product-data")) return "datasheet";
  if (lower.includes("install")) return "installation_guide";
  if (lower.includes("certificate") || lower.includes("coshh") || lower.includes("dop") || lower.includes("declaration")) return "certificate";
  if (lower.includes("cad") || lower.endsWith(".dxf") || lower.endsWith(".dwg")) return "cad_dxf";
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(lower)) return "image";
  return "other";
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  // Verify manufacturer belongs to org
  const { data: manufacturer } = await supabaseAdmin
    .from("manufacturers")
    .select("id, organization_id, name")
    .eq("id", params.id)
    .single();

  if (!manufacturer) {
    return NextResponse.json({ error: "Manufacturer not found" }, { status: 404 });
  }

  // Get or create a "General Documents" product for this manufacturer
  let { data: generalProduct } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("manufacturer_id", params.id)
    .eq("product_code", "_general_documents")
    .single();

  if (!generalProduct) {
    const { data: newProduct } = await supabaseAdmin
      .from("products")
      .insert({
        manufacturer_id: params.id,
        organization_id: manufacturer.organization_id,
        pillar: "fire_stopping",
        product_code: "_general_documents",
        product_name: `${manufacturer.name} — General Documents`,
        description: "Manually uploaded files for this manufacturer",
        specifications: {},
        status: "active",
      })
      .select("id")
      .single();
    generalProduct = newProduct;
  }

  if (!generalProduct) {
    return NextResponse.json({ error: "Failed to create document holder" }, { status: 500 });
  }

  const results: { file_name: string; status: string; error?: string }[] = [];

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${auth.organizationId}/${params.id}/${Date.now()}_${safeName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabaseAdmin.storage
        .from("product-files")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        results.push({ file_name: file.name, status: "error", error: uploadError.message });
        continue;
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from("product-files")
        .getPublicUrl(storagePath);

      const fileType = guessFileType(file.name);
      const displayName = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      await supabaseAdmin.from("product_files").insert({
        product_id: generalProduct.id,
        file_type: fileType,
        file_name: displayName,
        file_storage: "supabase",
        file_path: storagePath,
        file_url: urlData?.publicUrl || null,
        file_size: buffer.length,
        mime_type: file.type || "application/octet-stream",
        uploaded_by: auth.user.id,
      });

      results.push({ file_name: file.name, status: "ok" });
    } catch (err: any) {
      results.push({ file_name: file.name, status: "error", error: err.message });
    }
  }

  const uploaded = results.filter((r) => r.status === "ok").length;
  return NextResponse.json({ uploaded, total: files.length, results }, { status: 201 });
}
