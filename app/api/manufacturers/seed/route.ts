import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SEED_MANUFACTURERS = [
  // Fire Stopping & Containment
  {
    name: "Quelfire",
    website_url: "https://quelfire.co.uk",
    contact_email: "info@quelfire.co.uk",
    scraper_config: {
      type: "shopify",
      store_url: "https://quelfire.co.uk",
      default_pillar: "fire_stopping",
      installation_details_url: "https://quelfire.co.uk/pages/standard-installation-details",
    },
  },
  {
    name: "Hilti",
    website_url: "https://hilti.co.uk",
    scraper_config: { default_pillar: "fire_stopping" },
  },
  {
    name: "Rockwool",
    website_url: "https://rockwool.com/uk",
    scraper_config: { default_pillar: "fire_stopping" },
  },
  {
    name: "Siderise",
    website_url: "https://siderise.com",
    scraper_config: { default_pillar: "fire_stopping" },
  },
  {
    name: "Promat (Etex)",
    website_url: "https://promat.com/en-gb",
    scraper_config: { default_pillar: "fire_stopping" },
  },
  // Plasterboard & Partition Systems
  {
    name: "British Gypsum",
    website_url: "https://british-gypsum.com",
    scraper_config: { default_pillar: "fire_stopping" },
  },
  {
    name: "Knauf",
    website_url: "https://knauf.co.uk",
    scraper_config: { default_pillar: "fire_stopping" },
  },
  {
    name: "Siniat",
    website_url: "https://siniat.co.uk",
    scraper_config: { default_pillar: "fire_stopping" },
  },
  // Fire Door Hardware
  {
    name: "Lorient",
    website_url: "https://lorientuk.com",
    scraper_config: { default_pillar: "fire_doors" },
  },
  // Passive Fire Protection
  {
    name: "Kingspan",
    website_url: "https://kingspan.com/gb/en-gb",
    scraper_config: { default_pillar: "fire_stopping" },
  },
];

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  let created = 0;
  const errors: string[] = [];

  for (const mfr of SEED_MANUFACTURERS) {
    // Skip if already exists
    const { data: existing } = await supabaseAdmin
      .from("manufacturers")
      .select("id")
      .eq("organization_id", auth.organizationId)
      .eq("name", mfr.name)
      .single();

    if (existing) continue;

    const { error } = await supabaseAdmin
      .from("manufacturers")
      .insert({
        ...mfr,
        organization_id: auth.organizationId,
        created_by: auth.user.id,
      });

    if (error) {
      errors.push(`${mfr.name}: ${error.message}`);
    } else {
      created++;
    }
  }

  return NextResponse.json(
    { created, errors: errors.length > 0 ? errors : undefined },
    { status: 201 }
  );
}
