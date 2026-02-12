import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// POST — Link a regulation to a product
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();
  const { regulation_id, compliance_notes, test_evidence_ref } = body;

  if (!regulation_id) {
    return NextResponse.json({ error: "regulation_id is required" }, { status: 400 });
  }

  // Verify product belongs to org
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // Verify regulation belongs to org
  const { data: regulation } = await supabaseAdmin
    .from("regulations")
    .select("id")
    .eq("id", regulation_id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!regulation) return NextResponse.json({ error: "Regulation not found" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("product_regulations")
    .insert({
      product_id: params.id,
      regulation_id,
      compliance_notes: compliance_notes || null,
      test_evidence_ref: test_evidence_ref || null,
    })
    .select("*, regulations(name, reference, category)")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Regulation already linked" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product_regulation: data }, { status: 201 });
}

// DELETE — Unlink a regulation from a product
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const regulationId = searchParams.get("regulation_id");

  if (!regulationId) {
    return NextResponse.json({ error: "regulation_id query param required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("product_regulations")
    .delete()
    .eq("product_id", params.id)
    .eq("regulation_id", regulationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
