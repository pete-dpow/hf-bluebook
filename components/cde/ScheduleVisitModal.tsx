"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { VISIT_TYPES } from "@/lib/cde/picklists";

interface ScheduleVisitModalProps {
  projectId: string;
  clientId?: string;
  onClose: () => void;
  onCreated: () => void;
}

const FONT = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";

export default function ScheduleVisitModal({ projectId, clientId, onClose, onCreated }: ScheduleVisitModalProps) {
  const [visitDate, setVisitDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [visitType, setVisitType] = useState("SURVEY");
  const [leadSurveyor, setLeadSurveyor] = useState("");
  const [buildings, setBuildings] = useState("");
  const [notes, setNotes] = useState("");
  const [flatAccess, setFlatAccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!visitDate) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/cde/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          projectId, clientId, visitDate, startTime, endTime, visitType,
          leadSurveyor: leadSurveyor || undefined,
          buildings: buildings ? buildings.split(",").map((b) => b.trim()) : [],
          flatAccessRequired: flatAccess,
          notesForResidents: notes || undefined,
        }),
      });
      if (res.ok) { onCreated(); onClose(); }
      else { const d = await res.json().catch(() => null); setError(d?.error || "Failed"); }
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 8, width: 480, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,.15)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Schedule Visit</div>
          <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#9ca3af" }}>✕</button>
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FW label="Date"><input style={fi} type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} /></FW>
            <FW label="Type">
              <select style={fi} value={visitType} onChange={(e) => setVisitType(e.target.value)}>
                {VISIT_TYPES.map((v) => <option key={v.code} value={v.code}>{v.label}</option>)}
              </select>
            </FW>
            <FW label="Start Time"><input style={fi} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></FW>
            <FW label="End Time"><input style={fi} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></FW>
            <FW label="Lead Surveyor"><input style={fi} value={leadSurveyor} onChange={(e) => setLeadSurveyor(e.target.value)} placeholder="Name" /></FW>
            <FW label="Buildings"><input style={fi} value={buildings} onChange={(e) => setBuildings(e.target.value)} placeholder="Block A, Block B" /></FW>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#4b5563", cursor: "pointer" }}>
              <input type="checkbox" checked={flatAccess} onChange={(e) => setFlatAccess(e.target.checked)} style={{ width: 14, height: 14 }} />
              Flat access required
            </label>
          </div>
          <div style={{ marginTop: 10 }}>
            <FW label="Notes for Residents">
              <textarea style={{ ...fi, height: 60, padding: 8, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Information for residents..." />
            </FW>
          </div>
        </div>
        {error && <div style={{ padding: "0 18px 8px", fontSize: 11, color: "#dc2626", fontWeight: 500 }}>{error}</div>}
        <div style={{ padding: "12px 18px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 6 }}>
          <button style={btn} onClick={onClose}>Cancel</button>
          <button style={{ ...btn, background: "#4d7c0f", borderColor: "#4d7c0f", color: "#fff" }} onClick={handleSubmit} disabled={submitting || !visitDate}>
            {submitting ? "Scheduling..." : "Schedule Visit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FW({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div style={{ display: "flex", flexDirection: "column", gap: 2 }}><label style={{ fontSize: 9, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".03em" }}>{label}</label>{children}</div>);
}
const fi: React.CSSProperties = { height: 30, border: "1px solid #e5e7eb", borderRadius: 4, padding: "0 8px", fontFamily: FONT, fontSize: 11, color: "#111827", background: "#fff", width: "100%" };
const btn: React.CSSProperties = { height: 28, padding: "0 10px", border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff", fontFamily: FONT, fontSize: "10.5px", fontWeight: 500, color: "#4b5563", cursor: "pointer" };
