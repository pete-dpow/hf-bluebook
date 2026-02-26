import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Batch review API — approve, reject, or re-normalize multiple products at once.
 * POST body: { product_ids: string[], action: "approve" | "reject" | "normalize" }
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const body = await req.json();
  const { product_ids, action } = body;

  if (!Array.isArray(product_ids) || product_ids.length === 0) {
    return NextResponse.json({ error: "product_ids required" }, { status: 400 });
  }

  if (!["approve", "reject", "normalize"].includes(action)) {
    return NextResponse.json({ error: "action must be approve, reject, or normalize" }, { status: 400 });
  }

  if (action === "approve") {
    const { error } = await supabaseAdmin
      .from("products")
      .update({
        needs_review: false,
        reviewed_by: auth.user.id,
        reviewed_at: new Date().toISOString(),
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .in("id", product_ids)
      .eq("organization_id", auth.organizationId!);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: product_ids.length, action: "approved" });
  }

  if (action === "reject") {
    const { error } = await supabaseAdmin
      .from("products")
      .update({
        needs_review: false,
        reviewed_by: auth.user.id,
        reviewed_at: new Date().toISOString(),
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .in("id", product_ids)
      .eq("organization_id", auth.organizationId!);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: product_ids.length, action: "rejected" });
  }

  if (action === "normalize") {
    // Reset normalized_at so they get picked up by the normalize pipeline
    const { error } = await supabaseAdmin
      .from("products")
      .update({
        normalized_at: null,
        normalization_confidence: null,
        normalization_warnings: [],
        updated_at: new Date().toISOString(),
      })
      .in("id", product_ids)
      .eq("organization_id", auth.organizationId!);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Trigger normalization
    try {
      const { inngest } = await import("@/lib/inngest/client");
      await inngest.send({
        name: "products/normalize.requested",
        data: { organization_id: auth.organizationId },
      });
    } catch {
      // Non-critical
    }

    return NextResponse.json({ updated: product_ids.length, action: "normalize-queued" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
