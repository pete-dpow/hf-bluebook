"use client";

// StatusBar — bottom bar with count + pagination (matches v5 HTML .sbar)

interface StatusBarProps {
  shown: number;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  lastSync?: string;
}

export default function StatusBar({ shown, total, page, totalPages, onPageChange, lastSync }: StatusBarProps) {
  // Build page buttons
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);
  }

  return (
    <div
      style={{
        height: 26,
        background: "#fff",
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 14,
        flexShrink: 0,
        fontSize: 10,
        color: "#9ca3af",
      }}
    >
      <span><b style={{ color: "#4b5563", fontWeight: 500 }}>{shown}</b> shown</span>
      <div style={{ width: 1, height: 12, background: "#e5e7eb" }} />
      {lastSync && (
        <>
          <span>Last sync: <b style={{ color: "#4b5563", fontWeight: 500 }}>{lastSync}</b></span>
          <div style={{ width: 1, height: 12, background: "#e5e7eb" }} />
        </>
      )}
      <span>Total: <b style={{ color: "#4b5563", fontWeight: 500 }}>{total}</b></span>
      <div style={{ flex: 1 }} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 2 }}>
          <PageBtn label="‹" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} />
          {pages.map((p, i) =>
            p === "..." ? (
              <span key={`e${i}`} style={{ width: 22, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9.5px", color: "#9ca3af" }}>
                …
              </span>
            ) : (
              <PageBtn key={p} label={String(p)} active={p === page} onClick={() => onPageChange(p as number)} />
            )
          )}
          <PageBtn label="›" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} />
        </div>
      )}
    </div>
  );
}

function PageBtn({ label, active, disabled, onClick }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 22,
        height: 20,
        borderRadius: 3,
        border: `1px solid ${active ? "#154f91" : "#e5e7eb"}`,
        background: active ? "#154f91" : "#fff",
        fontFamily: "inherit",
        fontSize: "9.5px",
        color: active ? "#fff" : "#9ca3af",
        cursor: disabled ? "default" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );
}
