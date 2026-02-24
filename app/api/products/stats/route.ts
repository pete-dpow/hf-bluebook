import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("status, needs_review, manufacturer_id")
    .eq("organization_id", auth.organizationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const products = data || [];
  const total = products.length;
  const active = products.filter((p) => p.status === "active" && !p.needs_review).length;
  const draft = products.filter((p) => p.status === "draft").length;
  const needs_review = products.filter((p) => p.needs_review).length;
  const manufacturers = new Set(products.map((p) => p.manufacturer_id).filter(Boolean)).size;

  return NextResponse.json({ total, active, draft, needs_review, manufacturers });
}
