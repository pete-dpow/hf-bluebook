import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Auto-provision: ensures the authenticated user has a users row,
 * an organization, and admin membership. Idempotent — safe to call multiple times.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Check if user already has a users row with an org
  const { data: existingUser } = await supabaseAdmin
    .from("users")
    .select("id, active_organization_id")
    .eq("id", user.id)
    .single();

  if (existingUser?.active_organization_id) {
    // Already set up — check membership exists
    const { data: membership } = await supabaseAdmin
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", existingUser.active_organization_id)
      .single();

    if (membership) {
      return NextResponse.json({ ok: true, status: "already_provisioned" });
    }
  }

  // Derive org name from email domain
  const email = user.email || "";
  const domain = email.split("@")[1] || "default";
  const orgName = domain.includes("harmonyfire")
    ? "Harmony Fire"
    : domain.charAt(0).toUpperCase() + domain.split(".")[0].slice(1);

  // Check if an org already exists for this domain
  let organizationId: string;

  const { data: existingOrg } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("slug", domain.split(".")[0])
    .single();

  if (existingOrg) {
    organizationId = existingOrg.id;
  } else {
    // Create organization
    const { data: newOrg, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: orgName,
        slug: domain.split(".")[0],
      })
      .select("id")
      .single();

    if (orgError) {
      return NextResponse.json({ error: orgError.message }, { status: 500 });
    }
    organizationId = newOrg.id;
  }

  // Upsert users row
  const { error: userError } = await supabaseAdmin
    .from("users")
    .upsert({
      id: user.id,
      active_organization_id: organizationId,
    }, { onConflict: "id" });

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  // Add as admin member (ignore if already exists)
  const { error: memberError } = await supabaseAdmin
    .from("organization_members")
    .upsert({
      user_id: user.id,
      organization_id: organizationId,
      role: "admin",
    }, { onConflict: "user_id,organization_id" });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    status: "provisioned",
    organizationId,
    orgName,
  });
}
