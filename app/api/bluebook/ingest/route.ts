import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "@/lib/inngest/client";

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

  const body = await req.json();
  const { source_file, source_file_drive_id } = body;

  if (!source_file) {
    return NextResponse.json({ error: "source_file is required" }, { status: 400 });
  }

  // Create ingestion log entry
  const { data: log, error: logError } = await supabaseAdmin
    .from("bluebook_ingestion_log")
    .insert({
      org_id: auth.organizationId,
      source_file,
      source_file_drive_id: source_file_drive_id || null,
      status: "pending",
    })
    .select()
    .single();

  if (logError) return NextResponse.json({ error: logError.message }, { status: 500 });

  // Trigger Inngest job
  await inngest.send({
    name: "bluebook/ingest.requested",
    data: {
      ingestion_id: log.id,
      org_id: auth.organizationId,
      source_file,
      source_file_drive_id: source_file_drive_id || null,
      user_id: auth.user.id,
    },
  });

  return NextResponse.json({ ingestion: log }, { status: 202 });
}
