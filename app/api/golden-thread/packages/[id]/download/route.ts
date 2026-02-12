import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * GET — Download a specific export file from a GT package.
 * Query params: format (json|pdf|csv)
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";

  const { data: pkg, error } = await supabaseAdmin
    .from("golden_thread_packages")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (error || !pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  if (pkg.status !== "complete") {
    return NextResponse.json({ error: "Package not ready — status: " + pkg.status }, { status: 400 });
  }

  // Find the requested file in export_files
  const exportFiles = pkg.export_files || [];
  const file = exportFiles.find((f: any) => f.format === format);

  if (!file) {
    return NextResponse.json({ error: `No ${format} export available` }, { status: 404 });
  }

  // Download from Supabase Storage
  const { data: fileData, error: downloadError } = await supabaseAdmin
    .storage
    .from("golden-thread")
    .download(file.storage_path);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }

  // Log access
  await supabaseAdmin.from("golden_thread_audit").insert({
    package_id: pkg.id,
    action: "accessed",
    performed_by: auth.user.id,
    details: { format, file_name: file.file_name },
  });

  const contentTypes: Record<string, string> = {
    json: "application/json",
    pdf: "application/pdf",
    csv: "application/zip",
  };

  const buffer = await fileData.arrayBuffer();

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": contentTypes[format] || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${file.file_name}"`,
    },
  });
}
