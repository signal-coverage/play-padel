"use client";

import { format, addDays, isToday } from "date-fns";
import type { Appointment, AppointmentStatus } from "@/core/appointments/types";

interface AppointmentWeekViewProps {
  weekStart: Date;
  appointments: Appointment[];
  onEdit: (appointment: Appointment) => void;
  isFetching: boolean;
}

const GRID_START_HOUR = 7;
const GRID_END_HOUR = 20;
const TOTAL_SLOTS = (GRID_END_HOUR - GRID_START_HOUR) * 2; // 26

const STATUS_CLASSES: Record<AppointmentStatus, string> = {
  SCHEDULED:
    "bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-100",
  CONFIRMED:
    "bg-green-100 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-100",
  COMPLETED:
    "bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-400",
  CANCELLED:
    "bg-red-100 border-red-300 text-red-900 line-through dark:bg-red-900/30 dark:border-red-700 dark:text-red-100",
  NO_SHOW:
    "bg-orange-100 border-orange-300 text-orange-900 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-100",
};

/**
 * Returns the 1-based slot index for the given UTC time.
 * Slot 1 = 07:00–07:30, Slot 26 = 19:30–20:00.
 * Clamped to [1, 26].
 */
function timeToSlot(hours: number, minutes: number): number {
  const slot = (hours - GRID_START_HOUR) * 2 + Math.floor(minutes / 30) + 1;
  return Math.max(1, Math.min(slot, TOTAL_SLOTS));
}

function getGridPosition(
  appt: Appointment,
  colIndex: number,
): { gridRow: string; gridColumn: number } {
  const start = new Date(appt.scheduledStart);
  const end = new Date(appt.scheduledEnd);
  const startH = start.getUTCHours();
  const startM = start.getUTCMinutes();
  const endH = end.getUTCHours();
  const endM = end.getUTCMinutes();
  const startSlot = timeToSlot(startH, startM);
  const endSlot = timeToSlot(endH, endM);
  const span = Math.max(1, endSlot - startSlot);
  return {
    gridRow: `${startSlot + 1} / span ${span}`,
    gridColumn: colIndex + 2,
  };
}

function isSameDayUtc(apptStart: Date, day: Date): boolean {
  return new Date(apptStart).toISOString().slice(0, 10) === day.toISOString().slice(0, 10);
}

export function AppointmentWeekView({
  weekStart,
  appointments,
  onEdit,
  isFetching,
}: AppointmentWeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Build the 26 time-label entries (only show label at full hours)
  const timeLabels = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const totalMins = GRID_START_HOUR * 60 + i * 30;
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    return { label, showLabel: m === 0 };
  });

  return (
    <div
      className={`relative overflow-x-auto rounded-lg border transition-opacity ${
        isFetching ? "opacity-60" : "opacity-100"
      }`}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `3.5rem repeat(7, minmax(0, 1fr))`,
          gridTemplateRows: `3rem repeat(${TOTAL_SLOTS}, 2rem)`,
          minWidth: "560px",
        }}
      >
        {/* ── Row 1: sticky header ── */}

        {/* Top-left corner */}
        <div
          className="sticky top-0 z-20 border-b border-r bg-background"
          style={{ gridRow: 1, gridColumn: 1 }}
        />

        {/* Day headers */}
        {days.map((day, i) => (
          <div
            key={`header-${i}`}
            className={`sticky top-0 z-10 flex flex-col items-center justify-center border-b border-r bg-background py-1 ${
              isToday(day) ? "text-primary" : "text-muted-foreground"
            }`}
            style={{ gridRow: 1, gridColumn: i + 2 }}
          >
            <span className="text-[10px] font-medium uppercase tracking-wide">
              {format(day, "EEE")}
            </span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                isToday(day) ? "bg-primary text-primary-foreground" : ""
              }`}
            >
              {format(day, "d")}
            </span>
          </div>
        ))}

        {/* ── Rows 2–27: time labels ── */}
        {timeLabels.map((slot, rowIdx) => (
          <div
            key={`time-${rowIdx}`}
            className="border-b border-r pr-1.5 text-right text-[10px] leading-none text-muted-foreground"
            style={{ gridRow: rowIdx + 2, gridColumn: 1, paddingTop: "2px" }}
          >
            {slot.showLabel ? slot.label : ""}
          </div>
        ))}

        {/* ── Background grid cells ── */}
        {timeLabels.map((_, rowIdx) =>
          days.map((_, colIdx) => (
            <div
              key={`cell-${rowIdx}-${colIdx}`}
              className={`border-b border-r ${rowIdx % 2 === 1 ? "bg-muted/20" : ""}`}
              style={{ gridRow: rowIdx + 2, gridColumn: colIdx + 2 }}
            />
          )),
        )}

        {/* ── Appointments ── */}
        {days.map((day, colIdx) =>
          appointments
            .filter((appt) =>
              isSameDayUtc(new Date(appt.scheduledStart), day),
            )
            .map((appt) => {
              const { gridRow, gridColumn } = getGridPosition(appt, colIdx);
              return (
                <div
                  key={appt.id}
                  className={`relative z-10 m-px cursor-pointer overflow-hidden rounded border px-1 py-0.5 text-[11px] transition-opacity hover:opacity-80 ${STATUS_CLASSES[appt.status]}`}
                  style={{ gridRow, gridColumn }}
                  onClick={() => onEdit(appt)}
                >
                  <p className="truncate font-semibold leading-tight">
                    {appt.patientName}
                  </p>
                  <p className="truncate leading-tight opacity-80">
                    {new Date(appt.scheduledStart).toISOString().slice(11, 16)}
                    {"–"}
                    {new Date(appt.scheduledEnd).toISOString().slice(11, 16)}
                  </p>
                </div>
              );
            }),
        )}
      </div>
    </div>
  );
}
