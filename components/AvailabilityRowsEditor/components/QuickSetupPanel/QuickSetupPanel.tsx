"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TimeInput } from "@/components/ui/time-input";
import { DEFAULT_QUICK_SETUP_END, DEFAULT_QUICK_SETUP_START } from "./consts";
import type { QuickSetupPanelProps } from "./types";

export function QuickSetupPanel({ onApply }: QuickSetupPanelProps) {
  const [startTime, setStartTime] = useState(DEFAULT_QUICK_SETUP_START);
  const [endTime, setEndTime] = useState(DEFAULT_QUICK_SETUP_END);

  return (
    <div className="flex flex-col gap-6 rounded-sm border bg-muted/40 p-4">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <Zap className="size-4 text-primary" aria-hidden="true" />
          <p className="text-sm font-semibold">Quick setup</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Apply the same open hours to all 7 days at once.
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
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          onClick={() => onApply(startTime, endTime)}
        >
          Apply to all
        </Button>
      </div>
    </div>
  );
}
