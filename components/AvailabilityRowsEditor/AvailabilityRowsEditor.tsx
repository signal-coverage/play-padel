"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { DAY_LABELS } from "@/core/courts/consts";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TimeInput } from "@/components/ui/time-input";
import { Separator } from "@/components/ui/separator";
import { QuickSetupPanel } from "./components/QuickSetupPanel";
import type { AvailabilityDayRow, AvailabilityRowsEditorProps } from "./types";

// Same easing LandingAbout's own accordion uses.
const ACCORDION_EASE = [0.2, 0, 0, 1] as const;

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
  layout = "stacked",
}: AvailabilityRowsEditorProps) {
  const shouldReduceMotion = useReducedMotion();
  // Only meaningful for the "split" layout's accordion day list below — -1
  // means every day starts collapsed; clicking a day's header expands it
  // and collapses whichever other day was open, same one-open-at-a-time
  // behavior as LandingAbout's own accordion.
  const [expandedDay, setExpandedDay] = useState(-1);

  function updateRow(dayOfWeek: number, patch: Partial<AvailabilityDayRow>) {
    onChange(
      rows.map((row) =>
        row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row,
      ),
    );
  }

  function applyToSelectedDays(
    startTime: string,
    endTime: string,
    days: number[],
  ) {
    onChange(
      rows.map((row) =>
        days.includes(row.dayOfWeek)
          ? { ...row, active: true, startTime, endTime }
          : row,
      ),
    );
  }

  const dayRows = rows.map((row) => (
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
              <TimeInput
                id={`day-${row.dayOfWeek}-start`}
                value={row.startTime}
                onChange={(value) =>
                  updateRow(row.dayOfWeek, { startTime: value })
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
              <TimeInput
                id={`day-${row.dayOfWeek}-end`}
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
  ));

  if (layout === "split") {
    // Accordion day list, not toggle rows: only the currently-expanded
    // day's start/end inputs render, so the column stays compact instead of
    // showing all 7 days' full row height. The active/inactive Switch stays
    // in the header regardless of expand state — collapsing a day never
    // hides whether it's open for bookings, only its start/end inputs.
    const accordionDayRows = rows.map((row) => {
      const isExpanded = expandedDay === row.dayOfWeek;
      const dayLabel = DAY_LABELS[row.dayOfWeek];
      return (
        <div key={row.dayOfWeek} className="border-b border-border">
          <div className="flex items-center justify-between gap-3 py-3">
            <button
              type="button"
              onClick={() => setExpandedDay(isExpanded ? -1 : row.dayOfWeek)}
              className="flex flex-1 items-center text-left text-sm font-medium"
            >
              {dayLabel}
            </button>
            <div className="flex shrink-0 items-center gap-3">
              <Switch
                checked={row.active}
                onCheckedChange={(checked) =>
                  updateRow(row.dayOfWeek, { active: checked })
                }
                aria-label={dayLabel}
              />
              <button
                type="button"
                onClick={() => setExpandedDay(isExpanded ? -1 : row.dayOfWeek)}
                aria-label={
                  isExpanded ? `Collapse ${dayLabel}` : `Expand ${dayLabel}`
                }
                className={cn(
                  "text-muted-foreground transition-transform",
                  isExpanded && "rotate-180",
                )}
              >
                <ChevronDown className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: ACCORDION_EASE }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 pb-4">
                  <div className="flex flex-1 flex-col gap-1">
                    <Label
                      htmlFor={`day-${row.dayOfWeek}-start`}
                      className="text-xs text-muted-foreground"
                    >
                      Start
                    </Label>
                    <TimeInput
                      id={`day-${row.dayOfWeek}-start`}
                      value={row.startTime}
                      onChange={(value) =>
                        updateRow(row.dayOfWeek, { startTime: value })
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
                    <TimeInput
                      id={`day-${row.dayOfWeek}-end`}
                      value={row.endTime}
                      onChange={(value) =>
                        updateRow(row.dayOfWeek, { endTime: value })
                      }
                      disabled={!row.active}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    });

    return (
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex w-64 shrink-0 flex-col">
          <QuickSetupPanel onApply={applyToSelectedDays} className="h-full" />
        </div>
        <Separator orientation="vertical" />
        {/* overflow-x-hidden is load-bearing, not decorative: CSS computes
            overflow-x as `auto` whenever overflow-y is non-visible and
            overflow-x is left at its default (per the overflow spec's
            "propagation" rule), so without it any transient sub-pixel
            overflow — e.g. framer-motion measuring this row's own height
            during the day-accordion's expand animation below — flashes a
            horizontal scrollbar for a frame. Pin it closed explicitly. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto border-t border-border">
          {accordionDayRows}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <QuickSetupPanel onApply={applyToSelectedDays} />
      {dayRows}
    </div>
  );
}
