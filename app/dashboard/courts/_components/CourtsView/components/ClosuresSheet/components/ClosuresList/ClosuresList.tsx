"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBox } from "@/components/StatusBox";
import type { ClosuresListProps } from "./types";

export function ClosuresList({
  closures,
  onCancel,
  cancellingClosureId,
}: ClosuresListProps) {
  const [now] = useState(() => Date.now());

  if (closures.length === 0) {
    return <StatusBox className="p-4">No closures yet.</StatusBox>;
  }

  return (
    <div className="flex flex-col gap-2">
      {closures.map((closure) => {
        const isCancelled = Boolean(closure.cancelledAt);
        const isPast = closure.endsAt.getTime() <= now;
        const isActive = !isCancelled && !isPast;

        return (
          <div
            key={closure.id}
            className="flex items-center justify-between gap-2 rounded-sm border p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{closure.reason}</p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {format(closure.startsAt, "MMM d, HH:mm")} –{" "}
                {format(closure.endsAt, "MMM d, HH:mm")}
              </p>
            </div>
            <Badge
              variant={
                isCancelled ? "outline" : isPast ? "secondary" : "default"
              }
            >
              {isCancelled ? "Cancelled" : isPast ? "Past" : "Active"}
            </Badge>
            {isActive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={cancellingClosureId === closure.id}
                onClick={() => onCancel(closure.id)}
              >
                {cancellingClosureId === closure.id ? "Cancelling…" : "Cancel"}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
