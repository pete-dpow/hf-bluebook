"use client";

const PILLARS = [
  { value: "", label: "All Pillars" },
  { value: "fire_doors", label: "Fire Doors" },
  { value: "dampers", label: "Dampers" },
  { value: "fire_stopping", label: "Fire Stopping" },
  { value: "retro_fire_stopping", label: "Retro Fire Stopping" },
  { value: "auro_lume", label: "Auro Lume" },
];

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "discontinued", label: "Discontinued" },
];

interface ProductFilterProps {
  pillar: string;
  status: string;
  needsReview: boolean;
  search: string;
  onPillarChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onNeedsReviewChange: (v: boolean) => void;
  onSearchChange: (v: string) => void;
}

export default function ProductFilter({
  pillar, status, needsReview, search,
  onPillarChange, onStatusChange, onNeedsReviewChange, onSearchChange,
}: ProductFilterProps) {
  const selectStyle = { fontFamily: "var(--font-ibm-plex)" };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        placeholder="Search products..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-64"
        style={selectStyle}
      />
      <select
        value={pillar}
        onChange={(e) => onPillarChange(e.target.value)}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400"
        style={selectStyle}
      >
        {PILLARS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400"
        style={selectStyle}
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer" style={selectStyle}>
        <input
          type="checkbox"
          checked={needsReview}
          onChange={(e) => onNeedsReviewChange(e.target.checked)}
          className="rounded border-gray-300"
        />
        Needs review only
      </label>
    </div>
  );
}
