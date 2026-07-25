"use client";

import { addDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import { formatGridHeaderDate } from "../../utils";
import type { DayNavigatorProps } from "./types";

export function DayNavigator({ date, onDateChange }: DayNavigatorProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Previous day"
        disabled={!onDateChange}
        onClick={() => onDateChange?.(addDays(date, -1))}
      >
        <ChevronLeft />
      </Button>

      <span className="text-sm font-medium">{formatGridHeaderDate(date)}</span>

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Next day"
        disabled={!onDateChange}
        onClick={() => onDateChange?.(addDays(date, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
