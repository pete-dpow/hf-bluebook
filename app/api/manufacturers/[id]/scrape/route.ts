import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "@/lib/inngest/client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const scrapeType = body.scrape_type || "full";

  // Create scrape job
  const { data: job, error } = await supabaseAdmin.from("scrape_jobs").insert({
    manufacturer_id: params.id,
    started_by: auth.user.id,
    scrape_type: scrapeType,
    status: "queued",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send Inngest event
  await inngest.send({
    name: "manufacturer/scrape.requested",
    data: { manufacturer_id: params.id, job_id: job.id },
  });

  return NextResponse.json({ job }, { status: 201 });
}
