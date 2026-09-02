"use client";

import { cn } from "@/lib/utils/utils";
import { DAY_LABELS } from "@/core/courts/consts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { QuickSetupPanel } from "./components/QuickSetupPanel";
import type { AvailabilityDayRow, AvailabilityRowsEditorProps } from "./types";

/**
 * Pure controlled weekly-schedule editor: the draft (`rows`) and its
 * mutation (`onChange`) both live in the parent, since availability is
 * submitted together with whatever else the parent form is saving instead
 * of this component owning its own save flow. Shared across feature areas
 * (courts' CourtFormSheet and club settings' operating-hours tab), which is
 * why it lives here under top-level `components/` rather than nested under
 * one feature's route folder.
 */
export function AvailabilityRowsEditor({
  rows,
  onChange,
}: AvailabilityRowsEditorProps) {
  function updateRow(dayOfWeek: number, patch: Partial<AvailabilityDayRow>) {
    onChange(
      rows.map((row) =>
        row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row,
      ),
    );
  }

  function applyToAllDays(startTime: string, endTime: string) {
    onChange(rows.map((row) => ({ ...row, active: true, startTime, endTime })));
  }

  return (
    <div className="flex flex-col gap-3">
      <QuickSetupPanel onApply={applyToAllDays} />

      {rows.map((row) => (
        <div
          key={row.dayOfWeek}
          className="flex flex-col gap-2 rounded-sm border p-3"
        >
          <div className="flex items-center justify-between">
            <Label htmlFor={`day-${row.dayOfWeek}-active`}>
              {DAY_LABELS[row.dayOfWeek]}
            </Label>
            <Switch
              id={`day-${row.dayOfWeek}-active`}
              checked={row.active}
              onCheckedChange={(checked) =>
                updateRow(row.dayOfWeek, { active: checked })
              }
            />
          </div>

          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
              row.active
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <Label
                    htmlFor={`day-${row.dayOfWeek}-start`}
                    className="text-xs text-muted-foreground"
                  >
                    Start
                  </Label>
                  <Input
                    id={`day-${row.dayOfWeek}-start`}
                    type="time"
                    value={row.startTime}
                    onChange={(e) =>
                      updateRow(row.dayOfWeek, { startTime: e.target.value })
                    }
                    disabled={!row.active}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <Label
                    htmlFor={`day-${row.dayOfWeek}-end`}
                    className="text-xs text-muted-foreground"
                  >
                    End
                  </Label>
                  <Input
                    id={`day-${row.dayOfWeek}-end`}
                    type="time"
                    value={row.endTime}
                    onChange={(e) =>
                      updateRow(row.dayOfWeek, { endTime: e.target.value })
                    }
                    disabled={!row.active}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
