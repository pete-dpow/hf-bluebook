// GET + POST /api/cde/residents — List and create residents

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { generatePortalToken } from "@/lib/cde/residents";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const projectId = url.searchParams.get("projectId");
  const clientId = url.searchParams.get("clientId");
  const building = url.searchParams.get("building");

  const supabase = getSupabaseAdmin();
  let query = supabase.from("cde_residents").select("id, client_id, project_id, building, flat_ref, level, first_name, last_name, mobile, email, sms_opt_in, email_opt_in, availability_notes, last_active_at, created_at").order("last_name");

  if (projectId) query = query.eq("project_id", projectId);
  if (clientId) query = query.eq("client_id", clientId);
  if (building) query = query.eq("building", building);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ residents: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { clientId, projectId, building, flatRef, level, firstName, lastName, mobile, email, smsOptIn, emailOptIn } = body;

  if (!clientId || !firstName || !lastName) {
    return NextResponse.json({ error: "clientId, firstName, and lastName are required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("cde_residents")
    .insert({
      client_id: clientId,
      project_id: projectId || null,
      building: building || null,
      flat_ref: flatRef || null,
      level: level || null,
      first_name: firstName,
      last_name: lastName,
      mobile: mobile || null,
      email: email || null,
      sms_opt_in: smsOptIn ?? false,
      email_opt_in: emailOptIn ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generate portal token
  const token = await generatePortalToken(data.id);

  return NextResponse.json({ resident: { ...data, portal_token: token } });
}
