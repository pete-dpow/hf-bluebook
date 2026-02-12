import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * GET — View audit trail for a GT package.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  // Verify package belongs to org
  const { data: pkg } = await supabaseAdmin
    .from("golden_thread_packages")
    .select("id")
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  const { data: audits, error } = await supabaseAdmin
    .from("golden_thread_audit")
    .select("*")
    .eq("package_id", params.id)
    .order("performed_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ audit_trail: audits || [] });
}
