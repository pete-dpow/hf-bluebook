"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface ActivityEvent {
  type: string;
  description: string;
  timestamp: string;
}

interface DashboardCalendarProps {
  events: ActivityEvent[];
}

const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const eventColors: Record<string, string> = {
  quote: "#3B82F6",
  scrape: "#22C55E",
  login: "#8B5CF6",
  golden_thread: "#F59E0B",
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function DashboardCalendar({ events }: DashboardCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const isToday = (day: number) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  // Selected date events
  const selectedDate = new Date(viewYear, viewMonth, selectedDay);
  const selectedDateStr = selectedDate.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
  });
  const selectedMonthStr = monthNames[viewMonth];

  // Filter events for selected day (rough — just show recent events)
  const dayEvents = events.slice(0, 5);

  // Calendar grid: 6 weeks × 7 days
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
      <div className="flex gap-6">
        {/* Left: Calendar Grid */}
        <div className="flex-1">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              className="flex items-center gap-1 text-xs text-[#0056a7] hover:underline"
              style={{ fontFamily: "var(--font-ibm-plex)", fontWeight: 500 }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Event
            </button>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded transition">
                <ChevronLeft className="w-4 h-4 text-[#6B7280]" />
              </button>
              <span
                className="text-sm text-[#111827] min-w-[120px] text-center"
                style={{ fontFamily: "var(--font-ibm-plex)", fontWeight: 600 }}
              >
                {monthNames[viewMonth]} {viewYear}
              </span>
              <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded transition">
                <ChevronRight className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-1">
            {dayNames.map((d) => (
              <div
                key={d}
                className="text-center text-[0.65rem] text-[#9CA3AF] py-1"
                style={{ fontFamily: "var(--font-ibm-plex)", fontWeight: 600 }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => (
              <button
                key={i}
                onClick={() => day && setSelectedDay(day)}
                disabled={!day}
                className={`
                  h-9 flex items-center justify-center text-sm rounded-full transition
                  ${!day ? "" : "hover:bg-gray-100 cursor-pointer"}
                  ${day === selectedDay && !isToday(day) ? "bg-[#DBEAFE] text-[#1D4ED8]" : ""}
                  ${day && isToday(day) ? "bg-[#0056a7] text-white font-semibold" : ""}
                  ${day && !isToday(day) && day !== selectedDay ? "text-[#374151]" : ""}
                `}
                style={{ fontFamily: "var(--font-ibm-plex)" }}
              >
                {day || ""}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Day View / Events */}
        <div className="w-[260px] shrink-0 border-l border-[#E5E7EB] pl-5">
          <h4
            className="text-lg text-[#111827] mb-0.5"
            style={{ fontFamily: "var(--font-cormorant)", fontWeight: 600 }}
          >
            {selectedDateStr}
          </h4>
          <p
            className="text-xs text-[#9CA3AF] mb-4"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            {selectedMonthStr}
          </p>

          {dayEvents.length === 0 ? (
            <p
              className="text-xs text-[#9CA3AF]"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              No events
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {dayEvents.map((ev, i) => {
                const color = eventColors[ev.type] || "#6B7280";
                const time = new Date(ev.timestamp).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ background: color }}
                    />
                    <div>
                      <p
                        className="text-xs text-[#111827] leading-tight"
                        style={{ fontFamily: "var(--font-ibm-plex)", fontWeight: 500 }}
                      >
                        {ev.description}
                      </p>
                      <p
                        className="text-[0.6rem] text-[#9CA3AF]"
                        style={{ fontFamily: "var(--font-ibm-plex)" }}
                      >
                        {time}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
