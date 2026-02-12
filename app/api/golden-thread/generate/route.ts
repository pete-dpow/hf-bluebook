import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "@/lib/inngest/client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * POST — Generate a Golden Thread package for a project.
 * Creates the package record and triggers the Inngest background job.
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();
  const { project_id, building_reference, export_format, include_photos, include_certificates, client_branding, notes } = body;

  if (!project_id) {
    return NextResponse.json({ error: "project_id is required" }, { status: 400 });
  }

  // Verify project belongs to org
  const { data: project } = await supabaseAdmin
    .from("projects")
    .select("id, name")
    .eq("id", project_id)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Generate package reference: GT-{YYYYMMDD}-{random 4}
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const packageReference = `GT-${dateStr}-${rand}`;

  // Create package record
  const { data: pkg, error } = await supabaseAdmin
    .from("golden_thread_packages")
    .insert({
      project_id,
      organization_id: auth.organizationId,
      package_reference: packageReference,
      building_reference: building_reference || null,
      generated_by: auth.user.id,
      status: "processing",
      export_format: export_format || "all",
      include_photos: include_photos !== false,
      include_certificates: include_certificates !== false,
      client_branding: client_branding !== false,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log audit
  await supabaseAdmin.from("golden_thread_audit").insert({
    package_id: pkg.id,
    action: "generated",
    performed_by: auth.user.id,
    details: { export_format: export_format || "all", trigger: "manual" },
  });

  // Trigger Inngest background job
  await inngest.send({
    name: "golden-thread/generate.requested",
    data: {
      package_id: pkg.id,
      project_id,
      organization_id: auth.organizationId,
      building_reference: building_reference || null,
    },
  });

  return NextResponse.json({ package: pkg }, { status: 202 });
}
