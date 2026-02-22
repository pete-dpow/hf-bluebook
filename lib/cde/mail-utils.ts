// lib/cde/mail-utils.ts — Mail/correspondence helpers

export type MailType = "RFI" | "SI" | "QRY";
export type MailStatus = "OPEN" | "RESPONDED" | "CLOSED" | "OVERDUE";
export type MailPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

// Check if a mail item is overdue
export function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === "CLOSED") return false;
  return new Date(dueDate) < new Date();
}

// Calculate days until due (negative = overdue)
export function daysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Format due date with urgency
export function formatDueLabel(dueDate: string | null, status: string): string {
  if (!dueDate) return "No due date";
  if (status === "CLOSED") return "Closed";
  const days = daysUntilDue(dueDate);
  if (days === null) return "—";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days}d remaining`;
}

// Generate mail number: RFI-001, SI-002, QRY-003
export function generateMailNumber(type: MailType, sequence: number): string {
  return `${type}-${String(sequence).padStart(3, "0")}`;
}

// Default due days by mail type
export function getDefaultDueDays(type: MailType): number {
  switch (type) {
    case "RFI": return 10;
    case "SI": return 5;
    case "QRY": return 7;
    default: return 7;
  }
}
