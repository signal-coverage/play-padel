"use client";

import { useState } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCancelReservation } from "@/app/dashboard/my-reservations/_components/MyReservations/hooks";
import { CancelConfirmDialog } from "@/app/dashboard/my-reservations/_components/MyReservations/components/CancelConfirmDialog";
import type { CancelTarget } from "@/app/dashboard/my-reservations/_components/MyReservations/types";
import { groupUpcomingByDay } from "../../utils";
import type { UpcomingItem } from "../../types";

export function UpcomingListItems({ items }: { items: UpcomingItem[] }) {
  const groups = groupUpcomingByDay(items);
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);
  const cancelReservation = useCancelReservation();

  return (
    <div className="flex-1 space-y-5 overflow-y-auto">
      {groups.map((group) => (
        <div key={group.key} className="space-y-3">
          <div className="label-mono">{group.label}</div>
          {group.items.map((item) => (
            <div
              key={item.id}
              className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {item.courtName}
                </p>
                <p className="truncate text-xs tabular-nums text-muted-foreground">
                  {format(item.scheduledStart, "HH:mm")}–
                  {format(item.scheduledEnd, "HH:mm")}
                  {item.notes ? ` • ${item.notes}` : ""}
                </p>
                {item.userName && (
                  <p className="mt-0.5 label-mono">Booked by {item.userName}</p>
                )}
              </div>
              {item.canSelfCancel && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Cancel reservation"
                  onClick={() =>
                    setCancelTarget({
                      id: item.id,
                      courtName: item.courtName,
                      scheduledStart: item.scheduledStart,
                    })
                  }
                  className="shrink-0 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ))}

      <CancelConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        target={cancelTarget}
        isSubmitting={cancelReservation.isPending}
        onConfirm={() => {
          if (!cancelTarget) return;
          cancelReservation.mutate(cancelTarget.id, {
            onSuccess: () => setCancelTarget(null),
          });
        }}
      />
    </div>
  );
}
