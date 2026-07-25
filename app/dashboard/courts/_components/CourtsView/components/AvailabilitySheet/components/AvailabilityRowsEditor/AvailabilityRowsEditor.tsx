"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DAY_LABELS } from "@/core/courts/consts";
import { SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { availabilityRowsToEntries, buildAvailabilityRows } from "../../../../utils";
import type { AvailabilityDayRow } from "../../../../types";
import type { AvailabilityRowsEditorProps } from "./types";

/**
 * Owns the local, editable weekly-schedule draft. Seeded once from
 * `initialAvailability` via useState's lazy initializer — the parent
 * AvailabilitySheet remounts this component (via `key={courtId}`) whenever
 * a different court's data loads, instead of an effect + setState, so
 * switching courts always starts from a fresh draft without a
 * render-after-commit cascade.
 */
export function AvailabilityRowsEditor({
  initialAvailability,
  onSave,
  isSaving,
}: AvailabilityRowsEditorProps) {
  const [rows, setRows] = useState<AvailabilityDayRow[]>(() =>
    buildAvailabilityRows(initialAvailability),
  );

  function updateRow(dayOfWeek: number, patch: Partial<AvailabilityDayRow>) {
    setRows((current) =>
      current.map((row) =>
        row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row,
      ),
    );
  }

  function handleSave() {
    const entries = availabilityRowsToEntries(rows);
    const invalid = entries.find((entry) => entry.endTime <= entry.startTime);
    if (invalid) {
      toast.error("End time must be after start time for every active day");
      return;
    }
    onSave(rows);
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4">
        {rows.map((row) => (
          <div
            key={row.dayOfWeek}
            className="flex flex-col gap-2 rounded-lg border p-3"
          >
            <div className="flex items-center justify-between">
              <Label>{DAY_LABELS[row.dayOfWeek]}</Label>
              <Switch
                checked={row.active}
                onCheckedChange={(checked) =>
                  updateRow(row.dayOfWeek, { active: checked })
                }
              />
            </div>

            {row.active && (
              <div className="flex items-center gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <Input
                    type="time"
                    value={row.startTime}
                    onChange={(e) =>
                      updateRow(row.dayOfWeek, { startTime: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">End</Label>
                  <Input
                    type="time"
                    value={row.endTime}
                    onChange={(e) =>
                      updateRow(row.dayOfWeek, { endTime: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <SheetFooter>
        <Button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save schedule"}
        </Button>
      </SheetFooter>
    </>
  );
}
