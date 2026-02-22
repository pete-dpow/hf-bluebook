// GET + POST /api/cde/workflows — List and start workflows

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getTemplate } from "@/lib/cde/workflow-templates";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const status = req.nextUrl.searchParams.get("status");

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("cde_workflows")
    .select("*, cde_workflow_steps(*), cde_documents(doc_number, title)")
    .eq("project_id", projectId)
    .order("started_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ workflows: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { projectId, documentId, workflowType, dueDays } = body;

  if (!projectId || !documentId || !workflowType) {
    return NextResponse.json({ error: "projectId, documentId, and workflowType are required" }, { status: 400 });
  }

  const template = getTemplate(workflowType);
  if (!template) return NextResponse.json({ error: "Invalid workflowType" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  // Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (dueDays || 14));

  // Create workflow
  const { data: workflow, error: wfError } = await supabase
    .from("cde_workflows")
    .insert({
      document_id: documentId,
      project_id: projectId,
      workflow_type: workflowType,
      current_step: 1,
      total_steps: template.steps.length,
      status: "ACTIVE",
      started_by: auth.user.id,
      started_at: new Date().toISOString(),
      due_date: dueDate.toISOString(),
    })
    .select()
    .single();

  if (wfError) return NextResponse.json({ error: wfError.message }, { status: 500 });

  // Create steps
  const stepsToInsert = template.steps.map((s, i) => ({
    workflow_id: workflow.id,
    step_number: s.step_number,
    step_name: s.step_name,
    status: i === 0 ? "ACTIVE" : "PENDING",
  }));

  const { error: stepsError } = await supabase.from("cde_workflow_steps").insert(stepsToInsert);
  if (stepsError) return NextResponse.json({ error: stepsError.message }, { status: 500 });

  // Update document status to S3 (Under Review)
  await supabase.from("cde_documents").update({ status: "S3" }).eq("id", documentId);

  // Audit
  await supabase.from("cde_audit_log").insert({
    event_type: "WORKFLOW_STARTED",
    entity_type: "workflow",
    entity_id: workflow.id,
    user_id: auth.user.id,
    user_name: auth.user.email,
    detail: `Started ${template.label} (${template.steps.length} steps)`,
  });

  return NextResponse.json({ workflow });
}
