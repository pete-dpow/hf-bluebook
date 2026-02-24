"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface SendNotifModalProps {
  projectId: string;
  clientId?: string;
  onClose: () => void;
  onSent: () => void;
}

const FONT = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";

export default function SendNotifModal({ projectId, clientId, onClose, onSent }: SendNotifModalProps) {
  const [residents, setResidents] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [building, setBuilding] = useState("ALL");
  const [channel, setChannel] = useState<"EMAIL" | "SMS" | "BOTH">("EMAIL");
  const [visitId, setVisitId] = useState("");
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const headers = { Authorization: `Bearer ${session.access_token}` };

      const [rRes, vRes] = await Promise.all([
        fetch(`/api/cde/residents?projectId=${projectId}`, { headers }),
        fetch(`/api/cde/visits?projectId=${projectId}`, { headers }),
      ]);

      if (rRes.ok) { const d = await rRes.json(); setResidents(d.residents || []); }
      if (vRes.ok) { const d = await vRes.json(); setVisits(d.visits || []); }
      setLoading(false);
    }
    load();
  }, [projectId]);

  // Derive unique buildings from residents
  const buildings = Array.from(new Set(residents.map((r) => r.building).filter(Boolean))) as string[];

  // Filter recipients by building
  const filtered = building === "ALL" ? residents : residents.filter((r) => r.building === building);
  const emailCount = filtered.filter((r) => r.email && r.email_opt_in).length;
  const smsCount = filtered.filter((r) => r.mobile && r.sms_opt_in).length;

  // Auto-fill subject when visit is selected
  function handleVisitChange(id: string) {
    setVisitId(id);
    if (id) {
      const v = visits.find((x) => x.id === id);
      if (v) {
        const dateStr = new Date(v.visit_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        setSubject(`${v.visit_type} — ${dateStr}`);
        setMessageBody(v.notes_for_residents || "");
      }
    } else {
      setSubject("");
      setMessageBody("");
    }
  }

  async function handleSubmit() {
    if (filtered.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/cde/residents/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          residentIds: filtered.map((r) => r.id),
          channel,
          visitId: visitId || undefined,
          subject: subject || undefined,
          messageBody: messageBody || undefined,
        }),
      });
      if (res.ok) { onSent(); onClose(); }
      else { const d = await res.json().catch(() => null); setError(d?.error || "Failed to send"); }
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  const reachable = channel === "EMAIL" ? emailCount : channel === "SMS" ? smsCount : Math.max(emailCount, smsCount);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 8, width: 480, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,.15)" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 500, fontFamily: FONT }}>Notify Residents</div>
          <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#9ca3af" }}>✕</button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", fontSize: 12, color: "#9ca3af", fontFamily: FONT }}>Loading residents...</div>
        ) : (
          <>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Building filter */}
              <FW label="Building">
                <select style={fi} value={building} onChange={(e) => setBuilding(e.target.value)}>
                  <option value="ALL">All buildings ({residents.length} residents)</option>
                  {buildings.map((b) => (
                    <option key={b} value={b}>{b} ({residents.filter((r) => r.building === b).length})</option>
                  ))}
                </select>
              </FW>

              {/* Channel */}
              <FW label="Channel">
                <div style={{ display: "flex", gap: 12 }}>
                  {(["EMAIL", "SMS", "BOTH"] as const).map((c) => (
                    <label key={c} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#4b5563", cursor: "pointer", fontFamily: FONT }}>
                      <input type="radio" name="channel" checked={channel === c} onChange={() => setChannel(c)} style={{ width: 14, height: 14 }} />
                      {c === "BOTH" ? "Both" : c === "EMAIL" ? "Email" : "SMS"}
                    </label>
                  ))}
                </div>
              </FW>

              {/* Visit selector */}
              <FW label="Link to Visit (optional)">
                <select style={fi} value={visitId} onChange={(e) => handleVisitChange(e.target.value)}>
                  <option value="">No visit — custom message</option>
                  {visits.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.visit_type} — {new Date(v.visit_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </option>
                  ))}
                </select>
              </FW>

              {/* Subject */}
              <FW label="Subject">
                <input style={fi} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Notification subject..." />
              </FW>

              {/* Message */}
              <FW label="Message">
                <textarea style={{ ...fi, height: 70, padding: 8, resize: "vertical" }} value={messageBody} onChange={(e) => setMessageBody(e.target.value)} placeholder="Message to residents..." />
              </FW>

              {/* Recipient preview */}
              <div style={{ background: "#f8f9fb", border: "1px solid #e5e7eb", borderRadius: 4, padding: "8px 10px", fontSize: 10, color: "#4b5563", fontFamily: FONT }}>
                <strong>{filtered.length}</strong> recipients selected
                {channel !== "SMS" && <span> · {emailCount} reachable by email</span>}
                {channel !== "EMAIL" && <span> · {smsCount} reachable by SMS</span>}
                {reachable === 0 && <span style={{ color: "#dc2626", marginLeft: 4 }}> — no reachable recipients</span>}
              </div>
            </div>

            {error && <div style={{ padding: "0 18px 8px", fontSize: 11, color: "#dc2626", fontWeight: 500, fontFamily: FONT }}>{error}</div>}

            <div style={{ padding: "12px 18px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 6 }}>
              <button style={btn} onClick={onClose}>Cancel</button>
              <button
                style={{ ...btn, background: "#4d7c0f", borderColor: "#4d7c0f", color: "#fff", opacity: (submitting || reachable === 0) ? 0.5 : 1, cursor: (submitting || reachable === 0) ? "not-allowed" : "pointer" }}
                onClick={handleSubmit}
                disabled={submitting || reachable === 0}
              >
                {submitting ? "Sending..." : `Send to ${reachable} Resident${reachable !== 1 ? "s" : ""}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FW({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div style={{ display: "flex", flexDirection: "column", gap: 2 }}><label style={{ fontSize: 9, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".03em", fontFamily: FONT }}>{label}</label>{children}</div>);
}
const fi: React.CSSProperties = { height: 30, border: "1px solid #e5e7eb", borderRadius: 4, padding: "0 8px", fontFamily: FONT, fontSize: 11, color: "#111827", background: "#fff", width: "100%" };
const btn: React.CSSProperties = { height: 28, padding: "0 10px", border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff", fontFamily: FONT, fontSize: "10.5px", fontWeight: 500, color: "#4b5563", cursor: "pointer" };
