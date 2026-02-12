import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("product_files")
    .select("*, products(organization_id)")
    .eq("id", params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (data.products?.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ file: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { data: file } = await supabaseAdmin
    .from("product_files")
    .select("*, products(organization_id)")
    .eq("id", params.id)
    .single();

  if (!file || file.products?.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete from storage if Supabase
  if (file.file_storage === "supabase" && file.file_path) {
    await supabaseAdmin.storage.from("product-files").remove([file.file_path]);
  }

  const { error } = await supabaseAdmin.from("product_files").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
