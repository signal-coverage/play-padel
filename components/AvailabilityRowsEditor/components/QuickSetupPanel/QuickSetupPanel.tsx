"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TimeInput } from "@/components/ui/time-input";
import { DAY_LABELS } from "@/core/courts/consts";
import { DEFAULT_QUICK_SETUP_END, DEFAULT_QUICK_SETUP_START } from "./consts";
import type { QuickSetupPanelProps } from "./types";

const ALL_DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6];

export function QuickSetupPanel({ onApply, className }: QuickSetupPanelProps) {
  const [startTime, setStartTime] = useState(DEFAULT_QUICK_SETUP_START);
  const [endTime, setEndTime] = useState(DEFAULT_QUICK_SETUP_END);
  const [selectedDays, setSelectedDays] = useState<number[]>(ALL_DAYS_OF_WEEK);

  function toggleDay(dayOfWeek: number, checked: boolean) {
    setSelectedDays((days) =>
      checked ? [...days, dayOfWeek] : days.filter((day) => day !== dayOfWeek),
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-6 rounded-sm border bg-muted/40 p-4",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <Zap className="size-4 text-primary" aria-hidden="true" />
          <p className="text-sm font-semibold">Quick setup</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Apply the same open hours to the selected days.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-28 flex-1 flex-col gap-1.5">
          <Label
            htmlFor="quick-setup-start"
            className="text-xs text-muted-foreground"
          >
            Start
          </Label>
          <TimeInput
            id="quick-setup-start"
            value={startTime}
            onChange={setStartTime}
          />
        </div>
        <div className="flex min-w-28 flex-1 flex-col gap-1.5">
          <Label
            htmlFor="quick-setup-end"
            className="text-xs text-muted-foreground"
          >
            End
          </Label>
          <TimeInput
            id="quick-setup-end"
            value={endTime}
            onChange={setEndTime}
          />
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        className="shrink-0"
        disabled={selectedDays.length === 0}
        onClick={() => onApply(startTime, endTime, selectedDays)}
      >
        Apply
      </Button>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(2.5rem,1fr))] gap-x-3 gap-y-2">
        {ALL_DAYS_OF_WEEK.map((dayOfWeek) => {
          const id = `quick-setup-day-${dayOfWeek}`;
          return (
            <div key={dayOfWeek} className="flex items-center gap-1.5">
              <Checkbox
                id={id}
                checked={selectedDays.includes(dayOfWeek)}
                onCheckedChange={(checked) =>
                  toggleDay(dayOfWeek, checked === true)
                }
              />
              <Label htmlFor={id} className="text-xs text-muted-foreground">
                {DAY_LABELS[dayOfWeek].slice(0, 2)}
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
