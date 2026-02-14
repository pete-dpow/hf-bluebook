"use client";

import { useState } from "react";
import { Layers, Check, Edit2, ChevronDown, ChevronUp } from "lucide-react";
import type { SurveyFloor } from "@/lib/surveying/types";
import { supabase } from "@/lib/supabase";

interface FloorLevelPanelProps {
  floors: SurveyFloor[];
  selectedFloorId: string | null;
  onFloorSelect: (floorId: string) => void;
  onFloorUpdated?: () => void;
}

export default function FloorLevelPanel({
  floors,
  selectedFloorId,
  onFloorSelect,
  onFloorUpdated,
}: FloorLevelPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const handleConfirm = async (floorId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`/api/surveying/floors/${floorId}/confirm`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_confirmed: true }),
    });

    onFloorUpdated?.();
  };

  const handleRename = async (floorId: string) => {
    if (!editLabel.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`/api/surveying/floors/${floorId}/confirm`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ floor_label: editLabel.trim() }),
    });

    setEditingId(null);
    onFloorUpdated?.();
  };

  return (
    <div className="border-b border-[#E5E7EB]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#0056a7]" />
          <span
            className="text-sm font-medium"
            style={{ fontFamily: "var(--font-ibm-plex)", color: "#2A2A2A" }}
          >
            Floor Levels ({floors.length})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#9CA3AF]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />
        )}
      </button>

      {isExpanded && (
        <div className="px-2 pb-2">
          {floors.length === 0 ? (
            <p
              className="text-xs text-center py-4"
              style={{ fontFamily: "var(--font-ibm-plex)", color: "#9CA3AF" }}
            >
              No floors detected
            </p>
          ) : (
            <div className="space-y-1">
              {floors.map(floor => (
                <div
                  key={floor.id}
                  className={`rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                    selectedFloorId === floor.id
                      ? "bg-[#0056a7]/10 border border-[#0056a7]/30"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                  onClick={() => {
                    onFloorSelect(floor.id);
                    window.dispatchEvent(new CustomEvent("surveyFloorSelected", { detail: floor }));
                  }}
                >
                  <div className="flex items-center justify-between">
                    {editingId === floor.id ? (
                      <input
                        autoFocus
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleRename(floor.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={() => handleRename(floor.id)}
                        className="text-sm border border-[#0056a7] rounded px-2 py-0.5 outline-none w-full"
                        style={{ fontFamily: "var(--font-ibm-plex)" }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="text-sm font-medium"
                        style={{ fontFamily: "var(--font-ibm-plex)", color: "#2A2A2A" }}
                      >
                        {floor.floor_label}
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      {!floor.is_confirmed && editingId !== floor.id && (
                        <button
                          onClick={e => { e.stopPropagation(); handleConfirm(floor.id); }}
                          className="p-1 rounded hover:bg-green-50"
                          title="Confirm floor"
                        >
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        </button>
                      )}
                      {editingId !== floor.id && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setEditingId(floor.id);
                            setEditLabel(floor.floor_label);
                          }}
                          className="p-1 rounded hover:bg-gray-100"
                          title="Rename"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#9CA3AF]" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-3 mt-1 text-xs"
                    style={{ fontFamily: "var(--font-ibm-plex)", color: "#6B7280" }}
                  >
                    <span>Z: {floor.z_height_m.toFixed(2)}m</span>
                    {floor.confidence && <span>{floor.confidence.toFixed(0)}% conf</span>}
                    {floor.is_confirmed && (
                      <span className="text-green-600 flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Confirmed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
