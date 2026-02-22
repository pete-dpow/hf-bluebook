"use client";

// DocsSubHeader — enhanced sub-header with timeline + status bars + KPIs
// (matches v5 HTML .subhdr)

const MONO = "'DM Mono',monospace";

interface StatusCount {
  S0: number;
  S1: number;
  S3: number;
  S4: number;
  A: number;
  C: number;
}

interface DocsSubHeaderProps {
  totalDocs: number;
  statusCounts: StatusCount;
  openIssues?: number;
  overdueItems?: number;
  compliance?: number;
  complianceTotal?: number;
  syncPending?: number;
  lastSyncTime?: string;
}

const STATUS_COLORS: Record<string, string> = {
  S0: "#d1d5db",
  S1: "#154f91",
  S3: "#d97706",
  S4: "#ea580c",
  A: "#4d7c0f",
  C: "#dc2626",
};

export default function DocsSubHeader({
  totalDocs,
  statusCounts,
  openIssues = 0,
  overdueItems = 0,
  compliance = 0,
  complianceTotal = 0,
  syncPending = 0,
  lastSyncTime,
}: DocsSubHeaderProps) {
  const maxCount = Math.max(...Object.values(statusCounts), 1);

  return (
    <div
      style={{
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        height: 54,
        gap: 0,
      }}
    >
      {/* Timeline */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "0 12px 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {["Survey", "Design", "Detail", "Install", "BSR"].map((phase, i) => {
            const isDone = i < 2;
            const isActive = i === 2;
            return (
              <div key={phase} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && (
                  <div style={{ width: 10, height: 2, background: isDone ? "#154f91" : "#e5e7eb", margin: "0 -1px" }} />
                )}
                <div
                  title={phase}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    border: `2px solid ${isDone ? "#154f91" : isActive ? "#4d7c0f" : "#d1d5db"}`,
                    background: isDone ? "#154f91" : isActive ? "#4d7c0f" : "#fff",
                    flexShrink: 0,
                    zIndex: 1,
                    boxShadow: isActive ? "0 0 0 2px rgba(77,124,15,.2)" : "none",
                  }}
                />
              </div>
            );
          })}
        </div>
        <div style={{ marginLeft: 8, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 10, fontWeight: 500, color: "#111827", whiteSpace: "nowrap" }}>Detailed Design</div>
          <div style={{ fontSize: 8, color: "#9ca3af", whiteSpace: "nowrap" }}>Step 3 of 5</div>
        </div>
      </div>

      <Separator />

      {/* Doc count */}
      <Block label="Docs" value={String(totalDocs)} color="#154f91" />

      <Separator />

      {/* Status bars */}
      <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 28, padding: "0 12px" }}>
        {(["S0", "S1", "S3", "S4", "A", "C"] as const).map((code) => {
          const count = statusCounts[code] || 0;
          const barHeight = Math.max(2, (count / maxCount) * 18);
          return (
            <div key={code} style={{ width: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, color: STATUS_COLORS[code] }}>
                {count}
              </div>
              <div style={{ width: "100%", height: barHeight, borderRadius: "2px 2px 0 0", background: STATUS_COLORS[code], minHeight: 2 }} />
              <div style={{ fontFamily: MONO, fontSize: 7, fontWeight: 500, color: "#9ca3af" }}>{code}</div>
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Compliance */}
      <div style={{ padding: "0 12px" }}>
        <div style={{ fontSize: 8, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".04em" }}>Compliance</div>
        <div style={{ width: 80 }}>
          <div style={{ height: 4, background: "#e5e7eb", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 2, width: `${compliance}%`, background: compliance >= 75 ? "#4d7c0f" : compliance >= 50 ? "#d97706" : "#dc2626" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "7.5px", color: "#9ca3af", marginTop: 1 }}>
            <span>{complianceTotal > 0 ? `${Math.round(complianceTotal * compliance / 100)}/${complianceTotal}` : "—"}</span>
            <span style={{ fontWeight: 500, color: compliance >= 75 ? "#4d7c0f" : compliance >= 50 ? "#d97706" : "#dc2626" }}>{compliance}%</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Issues */}
      <Block label="Issues" value={String(openIssues)} color={openIssues > 0 ? "#dc2626" : "#9ca3af"} />

      <Separator />

      {/* Overdue */}
      <Block label="Overdue" value={String(overdueItems)} color={overdueItems > 0 ? "#d97706" : "#9ca3af"} />

      <Separator />

      {/* Sync */}
      <div style={{ padding: "0 12px" }}>
        <div style={{ fontSize: 8, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".04em" }}>Sync</div>
        <div style={{ fontSize: 15, fontWeight: 500, color: syncPending > 0 ? "#d97706" : "#9ca3af", letterSpacing: "-.01em", lineHeight: 1.1 }}>
          {syncPending}
        </div>
        {lastSyncTime && (
          <div style={{ fontSize: "8.5px", color: "#9ca3af" }}>{lastSyncTime}</div>
        )}
      </div>
    </div>
  );
}

function Separator() {
  return <div style={{ width: 1, height: 34, background: "#e5e7eb", flexShrink: 0 }} />;
}

function Block({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "0 12px" }}>
      <div style={{ fontSize: 8, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 500, color, letterSpacing: "-.01em", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: "8.5px", color: "#9ca3af" }}>{sub}</div>}
    </div>
  );
}
