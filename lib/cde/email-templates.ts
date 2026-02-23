// lib/cde/email-templates.ts — Branded HF email HTML templates

// HTML-escape user-provided strings to prevent injection
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function visitNotificationEmail(params: {
  residentName: string;
  visitDate: string;
  startTime: string;
  endTime: string;
  visitType: string;
  buildings: string[];
  notesForResidents: string;
  portalUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#eef0f4;font-family:'Century Gothic','Futura',system-ui,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px;">
  <div style="background:#0f2847;padding:16px 24px;border-radius:8px 8px 0 0;">
    <div style="color:#fff;font-size:18px;font-weight:600;">Harmony Fire</div>
    <div style="color:rgba(255,255,255,.6);font-size:12px;">Building Safety Notification</div>
  </div>
  <div style="background:#fff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;">
    <p style="margin:0 0 12px;color:#111827;font-size:14px;">Dear ${esc(params.residentName)},</p>
    <p style="margin:0 0 16px;color:#4b5563;font-size:13px;line-height:1.5;">
      We are writing to inform you of an upcoming visit to your building.
    </p>
    <div style="background:#f8f9fb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:16px;">
      <div style="display:flex;gap:16px;">
        <div>
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em;">Date</div>
          <div style="font-size:14px;font-weight:500;color:#111827;">${esc(params.visitDate)}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em;">Time</div>
          <div style="font-size:14px;font-weight:500;color:#111827;">${esc(params.startTime)} – ${esc(params.endTime)}</div>
        </div>
        <div>
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.04em;">Type</div>
          <div style="font-size:14px;font-weight:500;color:#111827;">${esc(params.visitType)}</div>
        </div>
      </div>
      ${params.buildings.length > 0 ? `<div style="margin-top:8px;font-size:12px;color:#4b5563;">Buildings: ${esc(params.buildings.join(", "))}</div>` : ""}
    </div>
    ${params.notesForResidents ? `<p style="margin:0 0 16px;color:#4b5563;font-size:13px;line-height:1.5;">${esc(params.notesForResidents)}</p>` : ""}
    <a href="${esc(params.portalUrl)}" style="display:inline-block;background:#4d7c0f;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500;">
      View in Resident Portal
    </a>
    <p style="margin:16px 0 0;color:#9ca3af;font-size:11px;">
      If you have any questions, please contact the building management team.
    </p>
  </div>
  <div style="text-align:center;padding:12px;color:#9ca3af;font-size:10px;">
    Harmony Fire Consultants Ltd · Building Safety
  </div>
</div>
</body>
</html>`;
}
