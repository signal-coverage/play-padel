"use client";

import { useController } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DAY_LABELS, DAY_OPTIONS, DEFAULT_TIMES } from "./consts";
import type { WorkingHoursSectionProps } from "./types";

export function WorkingHoursSection({ control }: WorkingHoursSectionProps) {
  const { field } = useController({ name: "workingHours", control });
  const hours: { dayOfWeek: number; startTime: string; endTime: string }[] =
    field.value ?? [];

  function getEntry(day: number) {
    return hours.find((h) => h.dayOfWeek === day);
  }

  function toggleDay(day: number) {
    const existing = getEntry(day);
    if (existing) {
      field.onChange(hours.filter((h) => h.dayOfWeek !== day));
    } else {
      const updated = [...hours, { dayOfWeek: day, ...DEFAULT_TIMES }];
      updated.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      field.onChange(updated);
    }
  }

  function updateTime(
    day: number,
    key: "startTime" | "endTime",
    value: string,
  ) {
    field.onChange(
      hours.map((h) => (h.dayOfWeek === day ? { ...h, [key]: value } : h)),
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-sm font-medium">Working Hours</Label>
      <div className="flex flex-col mt-1">
        {DAY_OPTIONS.map((day) => {
          const entry = getEntry(day);
          const isActive = !!entry;

          return (
            <div
              key={day}
              className="flex items-center gap-3 py-2 border-b last:border-b-0"
            >
              <Checkbox
                id={`day-${day}`}
                checked={isActive}
                onCheckedChange={() => toggleDay(day)}
              />
              <Label
                htmlFor={`day-${day}`}
                className="w-24 cursor-pointer select-none text-sm"
              >
                {DAY_LABELS[day]}
              </Label>

              {isActive ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={entry.startTime}
                    onChange={(e) =>
                      updateTime(day, "startTime", e.target.value)
                    }
                    className="h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">
                    to
                  </span>
                  <Input
                    type="time"
                    value={entry.endTime}
                    onChange={(e) => updateTime(day, "endTime", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Unavailable
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
