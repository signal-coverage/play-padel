"use client";

import { Download, Eye } from "lucide-react";
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
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatReservationDateTime(
              reservation.scheduledStart,
              reservation.scheduledEnd,
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ReservationStatusBadge status={reservation.status} />
          {reservation.status === "CONFIRMED" && (
            <>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`/api/player/reservations/${reservation.id}/ticket?preview=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Preview ticket for ${reservation.courtName}`}
                >
                  <Eye size={14} strokeWidth={2.25} />
                  Preview ticket
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`/api/player/reservations/${reservation.id}/ticket`}
                  download
                  aria-label={`Download ticket for ${reservation.courtName}`}
                >
                  <Download size={14} strokeWidth={2.25} />
                  Download ticket
                </a>
              </Button>
            </>
          )}
          {reservation.hasReceipt && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`/api/player/reservations/${reservation.id}/receipt`}
                download
                aria-label={`Download receipt for ${reservation.courtName}`}
              >
                <Download size={14} strokeWidth={2.25} />
                Receipt
              </a>
            </Button>
          )}
          {reservation.canSelfCancel && (
            <Button
              variant="destructive"
              size="sm"
              aria-label={`Cancel reservation for ${reservation.courtName}`}
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
