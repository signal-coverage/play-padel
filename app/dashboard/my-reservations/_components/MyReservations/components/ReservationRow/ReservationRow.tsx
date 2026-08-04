"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReservationStatusBadge } from "@/components/ReservationStatusBadge";
import { formatReservationDateTime } from "../../utils";
import type { ReservationRowProps } from "./types";

export function ReservationRow({ reservation, onCancel }: ReservationRowProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">{reservation.courtName}</p>
          <p className="text-xs text-muted-foreground">
            {formatReservationDateTime(
              reservation.scheduledStart,
              reservation.scheduledEnd,
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ReservationStatusBadge status={reservation.status} />
          {reservation.canSelfCancel && (
            <Button variant="destructive" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
