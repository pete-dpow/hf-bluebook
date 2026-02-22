// PATCH /api/cde/workflows/[id]/steps/[stepId] — Complete a workflow step

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { advanceWorkflow } from "@/lib/cde/workflow-engine";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { notes } = body;

  // If notes provided, update them first
  if (notes) {
    const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
    const supabase = getSupabaseAdmin();
    await supabase.from("cde_workflow_steps").update({ notes }).eq("id", params.stepId);
  }

  const result = await advanceWorkflow(params.id, params.stepId, auth.user.id, auth.user.email || "");

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
