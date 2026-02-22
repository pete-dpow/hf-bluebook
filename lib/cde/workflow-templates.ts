// lib/cde/workflow-templates.ts — Workflow step templates

export interface WorkflowStepTemplate {
  step_number: number;
  step_name: string;
  role_hint: string; // Suggested role for assignment
}

export interface WorkflowTemplate {
  type: string;
  label: string;
  description: string;
  steps: WorkflowStepTemplate[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    type: "STANDARD_APPROVAL",
    label: "Standard 4-Step Approval",
    description: "Standard document approval: Review → Check → Approve → Publish",
    steps: [
      { step_number: 1, step_name: "Technical Review", role_hint: "Surveyor" },
      { step_number: 2, step_name: "Quality Check", role_hint: "QA Manager" },
      { step_number: 3, step_name: "Approval", role_hint: "Project Lead" },
      { step_number: 4, step_name: "Publish", role_hint: "Document Controller" },
    ],
  },
  {
    type: "BSR_APPROVAL",
    label: "5-Step BSR Approval",
    description: "Building Safety Regulator submission: Review → Internal → BSR Prep → BSR Submit → Publish",
    steps: [
      { step_number: 1, step_name: "Technical Review", role_hint: "Surveyor" },
      { step_number: 2, step_name: "Internal Approval", role_hint: "Project Lead" },
      { step_number: 3, step_name: "BSR Pack Preparation", role_hint: "Document Controller" },
      { step_number: 4, step_name: "BSR Submission", role_hint: "Responsible Person" },
      { step_number: 5, step_name: "Publish & Archive", role_hint: "Document Controller" },
    ],
  },
];

export function getTemplate(type: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.type === type);
}
