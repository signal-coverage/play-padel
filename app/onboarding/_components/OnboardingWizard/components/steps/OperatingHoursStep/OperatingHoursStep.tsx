"use client";

import { useEffect, useRef } from "react";
import { useWatch } from "react-hook-form";
import { cn } from "@/lib/utils/utils";
import { DAY_LABELS } from "@/core/courts/consts";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TimeInput } from "@/components/ui/time-input";
import { FieldError } from "@/components/ui/field";
import { QuickSetupPanel } from "./components/QuickSetupPanel";
import { DEFAULT_OPERATING_HOURS_ROWS } from "./consts";
import type { OperatingHoursRow, OperatingHoursStepProps } from "./types";

/**
 * Reuses the same day-toggle + start/end time editor pattern as
 * CourtsView's AvailabilityRowsEditor/QuickSetupPanel, re-implemented here
 * (not imported) because that component's local state is CourtRecord/Sheet
 * shaped, whereas this step is driven by RHF's control/setValue directly —
 * see OperatingHoursStepProps.
 */
export function OperatingHoursStep({
  control,
  errors,
  setValue,
  shouldFocusHeading,
}: OperatingHoursStepProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (shouldFocusHeading) {
      headingRef.current?.focus();
    }
  }, [shouldFocusHeading]);

  const rows =
    useWatch({ control, name: "operatingHours" }) ??
    DEFAULT_OPERATING_HOURS_ROWS;

  function updateRow(dayOfWeek: number, patch: Partial<OperatingHoursRow>) {
    const next = rows.map((row) =>
      row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row,
    );
    setValue("operatingHours", next, { shouldValidate: true });
  }

  function applyToAllDays(startTime: string, endTime: string) {
    const next = rows.map((row) => ({
      ...row,
      active: true,
      startTime,
      endTime,
    }));
    setValue("operatingHours", next, { shouldValidate: true });
  }

  const rootMessage = errors.operatingHours?.message;

  return (
    <>
      <div>
        <h2
          ref={headingRef}
          className="text-base font-semibold mb-0.5"
          tabIndex={-1}
        >
          When is your club open?
        </h2>
        <p className="text-sm text-muted-foreground">
          Set the days and hours players can book courts. You can fine-tune each
          court individually later.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <QuickSetupPanel onApply={applyToAllDays} />

        {rows.map((row) => (
          <div
            key={row.dayOfWeek}
            className="flex flex-col gap-2 rounded-sm border p-3"
          >
            <div className="flex items-center justify-between">
              <Label htmlFor={`operating-hours-day-${row.dayOfWeek}-active`}>
                {DAY_LABELS[row.dayOfWeek]}
              </Label>
              <Switch
                id={`operating-hours-day-${row.dayOfWeek}-active`}
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
                      htmlFor={`operating-hours-day-${row.dayOfWeek}-start`}
                      className="text-xs text-muted-foreground"
                    >
                      Start
                    </Label>
                    <TimeInput
                      id={`operating-hours-day-${row.dayOfWeek}-start`}
                      value={row.startTime}
                      onChange={(value) =>
                        updateRow(row.dayOfWeek, { startTime: value })
                      }
                      disabled={!row.active}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <Label
                      htmlFor={`operating-hours-day-${row.dayOfWeek}-end`}
                      className="text-xs text-muted-foreground"
                    >
                      End
                    </Label>
                    <TimeInput
                      id={`operating-hours-day-${row.dayOfWeek}-end`}
                      value={row.endTime}
                      onChange={(value) =>
                        updateRow(row.dayOfWeek, { endTime: value })
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

      <FieldError errors={[{ message: rootMessage }]} />
    </>
  );
}
