import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import type { ComplianceChecklist } from "@/lib/autoplan/types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const CHECKLIST_KEYS: (keyof ComplianceChecklist)[] = [
  "exits_marked",
  "doors_labelled",
  "travel_distances_checked",
  "equipment_shown",
  "detection_shown",
  "emergency_lighting_shown",
  "risers_shown",
  "regulatory_text_added",
];

/** POST /api/autoplan/plans/[id]/approve — approve a plan */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();

  // Validate required approval fields
  if (!body.approver_name) return NextResponse.json({ error: "approver_name is required" }, { status: 400 });
  if (!body.approver_qualifications) return NextResponse.json({ error: "approver_qualifications is required" }, { status: 400 });
  if (!body.approver_company) return NextResponse.json({ error: "approver_company is required" }, { status: 400 });

  // Validate checklist — all 8 items must be true
  const checklist = body.checklist_results as ComplianceChecklist | undefined;
  if (!checklist) return NextResponse.json({ error: "checklist_results is required" }, { status: 400 });

  for (const key of CHECKLIST_KEYS) {
    if (checklist[key] !== true) {
      return NextResponse.json(
        { error: `All checklist items must be true. "${key}" is not checked.` },
        { status: 400 }
      );
    }
  }

  // Verify plan exists, belongs to org, and is not already approved
  const { data: plan } = await supabaseAdmin
    .from("autoplan_plans")
    .select("id, status, plan_reference, building_id")
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  if (plan.status === "approved") {
    return NextResponse.json({ error: "Plan is already approved" }, { status: 400 });
  }

  const attestation = `I, ${body.approver_name}, confirm that this fire safety plan (${plan.plan_reference}) has been reviewed and meets the applicable fire safety regulations.`;

  // Create approval record
  const { data: approval, error: approvalError } = await supabaseAdmin
    .from("autoplan_approvals")
    .insert({
      plan_id: params.id,
      approved_by: auth.user.id,
      approver_name: body.approver_name,
      approver_qualifications: body.approver_qualifications,
      approver_company: body.approver_company,
      attestation,
      checklist_results: checklist,
    })
    .select()
    .single();

  if (approvalError) return NextResponse.json({ error: approvalError.message }, { status: 500 });

  // Update plan status to approved
  await supabaseAdmin
    .from("autoplan_plans")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", params.id);

  // Insert audit log entry
  await supabaseAdmin
    .from("autoplan_audit_log")
    .insert({
      plan_id: params.id,
      building_id: plan.building_id,
      action: "approved",
      performed_by: auth.user.id,
      details: {
        approver_name: body.approver_name,
        approver_company: body.approver_company,
        plan_reference: plan.plan_reference,
      },
    });

  return NextResponse.json({ approval }, { status: 201 });
}
