"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// Public resident portal — green branding, no auth required

const FONT = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";
const GRN = "#4d7c0f";

type Tab = "visits" | "availability" | "preferences" | "updates";

export default function ResidentPortalPage() {
  const routeParams = useParams();
  const token = routeParams.token as string;

  const [resident, setResident] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("visits");
  const [availNotes, setAvailNotes] = useState("");
  const [smsOpt, setSmsOpt] = useState(true);
  const [emailOpt, setEmailOpt] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/cde/residents/portal/${token}`);
      if (res.ok) {
        const data = await res.json();
        setResident(data.resident);
        setVisits(data.visits);
        setNotifications(data.notifications || []);
        setAvailNotes(data.resident.availability_notes || "");
        setSmsOpt(data.resident.sms_opt_in);
        setEmailOpt(data.resident.email_opt_in);
      } else {
        setError("This link is invalid or has expired. Please contact your building management team.");
      }
      setLoading(false);
    }
    load();
  }, [token]);

  async function savePreferences() {
    setSaving(true);
    await fetch("/api/cde/residents/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, availabilityNotes: availNotes, smsOptIn: smsOpt, emailOptIn: emailOpt }),
    });
    setSaving(false);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ fontSize: 14, color: GRN }}>Loading...</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 32, maxWidth: 400, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#111827", marginBottom: 8 }}>Access Denied</div>
        <div style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.5 }}>{error}</div>
      </div>
    </div>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "visits", label: "Upcoming Visits" },
    { key: "availability", label: "Availability" },
    { key: "preferences", label: "Preferences" },
    { key: "updates", label: "Updates" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f0fdf4", fontFamily: FONT }}>
      {/* Header */}
      <div style={{ background: GRN, padding: "12px 16px", color: "#fff" }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Harmony Fire</div>
        <div style={{ fontSize: 11, opacity: 0.75 }}>Resident Portal</div>
      </div>

      {/* Welcome */}
      <div style={{ padding: "16px", background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
          Welcome, {resident?.first_name} {resident?.last_name}
        </div>
        <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>
          {resident?.building || "Your building"} {resident?.flat_ref ? `· ${resident.flat_ref}` : ""}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#fff", padding: "0 12px" }}>
        {tabs.map((t) => (
          <div key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: "10px 14px", fontSize: 11, fontWeight: 500, cursor: "pointer",
            color: activeTab === t.key ? GRN : "#9ca3af",
            borderBottom: activeTab === t.key ? `2px solid ${GRN}` : "2px solid transparent",
          }}>{t.label}</div>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
        {activeTab === "visits" && (
          <div>
            {visits.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 12 }}>No upcoming visits</div>
            ) : visits.map((v, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: 14, marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{v.visit_type}</div>
                <div style={{ fontSize: 12, color: GRN, fontWeight: 500, marginTop: 4 }}>
                  {new Date(v.visit_date).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                </div>
                <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>{v.start_time || "TBC"} – {v.end_time || "TBC"}</div>
                {v.notes_for_residents && <div style={{ fontSize: 11, color: "#4b5563", marginTop: 6, padding: 8, background: "#f8f9fb", borderRadius: 4 }}>{v.notes_for_residents}</div>}
                {v.flat_access_required && <div style={{ fontSize: 10, color: "#d97706", fontWeight: 500, marginTop: 4 }}>Flat access may be required</div>}
              </div>
            ))}
          </div>
        )}

        {activeTab === "availability" && (
          <div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#111827", marginBottom: 8 }}>Your Availability</div>
              <div style={{ fontSize: 11, color: "#4b5563", marginBottom: 8, lineHeight: 1.4 }}>
                Let us know your preferred times for building access or any notes about availability.
              </div>
              <textarea
                style={{ width: "100%", height: 80, border: "1px solid #e5e7eb", borderRadius: 4, padding: 8, fontFamily: FONT, fontSize: 12, resize: "vertical" }}
                placeholder="e.g. Available weekdays 9am–5pm, not Fridays..."
                value={availNotes}
                onChange={(e) => setAvailNotes(e.target.value)}
              />
              <button onClick={savePreferences} disabled={saving} style={{
                marginTop: 8, height: 32, padding: "0 16px", background: GRN, color: "#fff",
                border: "none", borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: FONT,
              }}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "preferences" && (
          <div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#111827", marginBottom: 12 }}>Notification Preferences</div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 12, color: "#4b5563", cursor: "pointer" }}>
                <input type="checkbox" checked={emailOpt} onChange={(e) => setEmailOpt(e.target.checked)} style={{ width: 16, height: 16 }} />
                Receive email notifications
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 12, color: "#4b5563", cursor: "pointer" }}>
                <input type="checkbox" checked={smsOpt} onChange={(e) => setSmsOpt(e.target.checked)} style={{ width: 16, height: 16 }} />
                Receive SMS notifications
              </label>
              <button onClick={savePreferences} disabled={saving} style={{
                height: 32, padding: "0 16px", background: GRN, color: "#fff",
                border: "none", borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: FONT,
              }}>
                {saving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "updates" && (
          <div>
            {notifications.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 12 }}>No updates yet</div>
            ) : notifications.map((n: any, i: number) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: 14, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#111827", flex: 1 }}>{n.subject || "Notification"}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af", flexShrink: 0, marginLeft: 8 }}>
                    {new Date(n.sent_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
                  via {n.channel === "BOTH" ? "Email & SMS" : n.channel === "EMAIL" ? "Email" : "SMS"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "24px 16px", color: "#9ca3af", fontSize: 10 }}>
        Harmony Fire Consultants Ltd · Building Safety
      </div>
    </div>
  );
}
