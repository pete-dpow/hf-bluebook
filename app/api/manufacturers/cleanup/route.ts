import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Known alias groups: canonical name → lowercase aliases
const ALIAS_GROUPS: Record<string, string[]> = {
  "Quelfire": ["quelfire"],
  "Hilti": ["hilti", "hilti library", "hilti technical"],
  "British Gypsum": ["bg", "british gypsum"],
  "Rockwool": ["rockwool"],
  "Siderise": ["siderise"],
  "Promat (Etex)": ["promat", "promat (etex)", "etex"],
  "Knauf": ["knauf"],
  "Siniat": ["siniat"],
  "Lorient": ["lorient"],
  "Kingspan": ["kingspan"],
};

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data: allMfrs } = await supabaseAdmin
    .from("manufacturers")
    .select("id, name, scraper_config, is_archived")
    .eq("organization_id", auth.organizationId);

  if (!allMfrs) return NextResponse.json({ error: "Failed to load manufacturers" }, { status: 500 });

  let archived = 0;
  let productsMoved = 0;
  const report: string[] = [];

  for (const [canonical, aliases] of Object.entries(ALIAS_GROUPS)) {
    // Find all manufacturers matching this alias group
    const matches = allMfrs.filter(
      (m) => m.name === canonical || aliases.includes(m.name.toLowerCase())
    );

    if (matches.length <= 1) continue;

    // Keep the one with scraper_config, or the canonical name, or the first one
    const primary =
      matches.find((m) => m.scraper_config?.type) ||
      matches.find((m) => m.name === canonical) ||
      matches[0];

    const duplicates = matches.filter((m) => m.id !== primary.id);

    for (const dup of duplicates) {
      // Count products on the duplicate before moving
      const { data: dupProducts } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("manufacturer_id", dup.id);

      const moveCount = dupProducts?.length || 0;

      // Move products from duplicate to primary
      if (moveCount > 0) {
        await supabaseAdmin
          .from("products")
          .update({ manufacturer_id: primary.id })
          .eq("manufacturer_id", dup.id);
      }

      productsMoved += moveCount;

      // Archive the duplicate
      await supabaseAdmin
        .from("manufacturers")
        .update({ is_archived: true })
        .eq("id", dup.id);

      archived++;
      report.push(`"${dup.name}" → merged into "${primary.name}" (${moveCount} products moved)`);
    }
  }

  return NextResponse.json({ archived, products_moved: productsMoved, report });
}
