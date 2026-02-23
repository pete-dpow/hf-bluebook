// lib/cde/workflow-engine.ts — Workflow step advancement + auto-publish

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Advance a workflow after a step is completed
export async function advanceWorkflow(workflowId: string, completedStepId: string, userId: string, userEmail: string) {
  const supabase = getSupabaseAdmin();

  // Get workflow + all steps
  const { data: workflow } = await supabase
    .from("cde_workflows")
    .select("*, cde_workflow_steps(*)")
    .eq("id", workflowId)
    .single();

  if (!workflow) return { error: "Workflow not found" };

  const steps = (workflow.cde_workflow_steps || []).sort((a: any, b: any) => a.step_number - b.step_number);
  const currentStep = steps.find((s: any) => s.id === completedStepId);
  if (!currentStep) return { error: "Step not found" };
  if (currentStep.status !== "ACTIVE") return { error: "Step is not active" };

  // Mark step as completed
  const { error: stepError } = await supabase.from("cde_workflow_steps").update({
    status: "COMPLETED",
    completed_by: userId,
    completed_at: new Date().toISOString(),
  }).eq("id", completedStepId);
  if (stepError) return { error: `Failed to complete step: ${stepError.message}` };

  const nextStepNumber = currentStep.step_number + 1;
  const nextStep = steps.find((s: any) => s.step_number === nextStepNumber);

  if (nextStep) {
    // Advance to next step
    await supabase.from("cde_workflow_steps").update({
      status: "ACTIVE",
    }).eq("id", nextStep.id);

    await supabase.from("cde_workflows").update({
      current_step: nextStepNumber,
    }).eq("id", workflowId);

    // Audit
    await supabase.from("cde_audit_log").insert({
      event_type: "WORKFLOW_STEP_COMPLETED",
      entity_type: "workflow",
      entity_id: workflowId,
      user_id: userId,
      user_name: userEmail,
      detail: `Step ${currentStep.step_number} "${currentStep.step_name}" completed. Next: Step ${nextStepNumber} "${nextStep.step_name}"`,
    });

    return { status: "advanced", nextStep: nextStep.step_name };
  } else {
    // Final step completed — complete workflow
    await supabase.from("cde_workflows").update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
    }).eq("id", workflowId);

    // Auto-publish: set document status to "A" (Approved)
    if (workflow.document_id) {
      await supabase.from("cde_documents").update({ status: "A" }).eq("id", workflow.document_id);

      await supabase.from("cde_audit_log").insert({
        event_type: "DOC_AUTO_APPROVED",
        entity_type: "document",
        entity_id: workflow.document_id,
        user_id: userId,
        user_name: userEmail,
        detail: `Auto-approved via workflow completion`,
      });
    }

    await supabase.from("cde_audit_log").insert({
      event_type: "WORKFLOW_COMPLETED",
      entity_type: "workflow",
      entity_id: workflowId,
      user_id: userId,
      user_name: userEmail,
      detail: `Workflow completed. All ${workflow.total_steps} steps done.`,
    });

    return { status: "completed" };
  }
}

// Check for overdue steps
export async function getOverdueSteps(projectId: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("cde_workflows")
    .select("id, due_date, current_step, cde_workflow_steps!inner(id, step_name, status, assigned_to)")
    .eq("project_id", projectId)
    .eq("status", "ACTIVE")
    .lt("due_date", new Date().toISOString());

  return data || [];
}
