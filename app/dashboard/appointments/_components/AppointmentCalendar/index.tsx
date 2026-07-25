"use client";

import { Calendar } from "@/components/ui/calendar";
import type { AppointmentCalendarProps } from "./types";

export function AppointmentCalendar({
  selected,
  onSelect,
}: AppointmentCalendarProps) {
  return (
    <Calendar
      mode="single"
      selected={selected}
      onSelect={(date) => {
        if (date) onSelect(date);
      }}
      className="rounded-md border"
    />
  );
}
