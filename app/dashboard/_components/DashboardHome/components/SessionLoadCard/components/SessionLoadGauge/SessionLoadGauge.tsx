import { ArrowDownRight, ArrowUpRight, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { GAUGE_RADIUS, GAUGE_STROKE_WIDTH } from "../../consts";
import type { SessionLoadGaugeProps } from "./types";

const TONE_BADGE_VARIANT = {
  good: "success",
  watch: "warning",
  bad: "destructive",
} as const;

const TONE_LABEL = {
  good: "Good",
  watch: "Watch",
  bad: "Needs attention",
} as const;

const TONE_RING_CLASS = {
  good: "stroke-success",
  watch: "stroke-warning",
  bad: "stroke-destructive",
} as const;

export function SessionLoadGauge({
  percent,
  tone,
  caption,
  trend,
  hasData,
  emptyMessage,
}: SessionLoadGaugeProps) {
  if (!hasData) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
        <EmptyMedia variant="icon" className="mb-0 size-8 rounded-full">
          <Gauge className="size-4" />
        </EmptyMedia>
        <EmptyTitle className="text-xs">No sessions yet</EmptyTitle>
        <EmptyDescription className="text-xs">{emptyMessage}</EmptyDescription>
      </div>
    );
  }

  const clampedPercent = Math.max(0, Math.min(100, percent));
  const circumference = 2 * Math.PI * GAUGE_RADIUS;
  const dash = (clampedPercent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="relative size-28">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={GAUGE_RADIUS}
            fill="none"
            strokeWidth={GAUGE_STROKE_WIDTH}
            className="stroke-muted"
          />
          <circle
            cx="50"
            cy="50"
            r={GAUGE_RADIUS}
            fill="none"
            strokeWidth={GAUGE_STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            className={TONE_RING_CLASS[tone]}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-heading text-2xl font-bold">{percent}%</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{caption}</p>
      <div className="flex items-center gap-2">
        <Badge variant={TONE_BADGE_VARIANT[tone]}>{TONE_LABEL[tone]}</Badge>
        {trend && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {trend.direction === "up" ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {trend.text}
          </span>
        )}
      </div>
    </div>
  );
}
