import { Badge } from "@/components/ui/badge";
import { getOrCreateAppUser } from "@/lib/dal";
import { formatDateInTz, formatTimeInTz } from "@/lib/format-time";
import { ReservationStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import { CancelReservationButton } from "./cancel-reservation-button";

const STATUS_STYLES: Record<ReservationStatus, string> = {
  CONFIRMED: "bg-[#61C9A8]/15 text-[#61C9A8]",
  PENDING_PAYMENT: "bg-[#585858]/15 text-[#585858]",
  CANCELLED: "bg-[#F24236]/15 text-[#F24236]",
  EXPIRED: "bg-[#F24236]/15 text-[#F24236]",
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  CONFIRMED: "Confirmed",
  PENDING_PAYMENT: "Pending payment",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

const CANCELLABLE_STATUSES: ReservationStatus[] = [
  ReservationStatus.CONFIRMED,
  ReservationStatus.PENDING_PAYMENT,
];

/** Lists the current user's reservations (spec: "Cancellation"). */
export default async function ReservationsPage() {
  const user = await getOrCreateAppUser();

  const reservations = await prisma.reservation.findMany({
    where: { userId: user.id },
    include: { court: { include: { club: true } } },
    orderBy: { startsAt: "desc" },
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">My reservations</h1>
        <p className="text-sm text-muted-foreground">
          Cancelling a paid deposit does not refund it.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {reservations.map((reservation) => (
          <div
            key={reservation.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border p-4"
          >
            <div>
              <p className="font-medium">
                {reservation.court.club.name} — {reservation.court.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDateInTz(
                  reservation.startsAt,
                  reservation.court.club.timezone
                )}{" "}
                ·{" "}
                {formatTimeInTz(
                  reservation.startsAt,
                  reservation.court.club.timezone
                )}{" "}
                –{" "}
                {formatTimeInTz(
                  reservation.endsAt,
                  reservation.court.club.timezone
                )}
              </p>
              <Badge className={`mt-1 ${STATUS_STYLES[reservation.status]}`}>
                {STATUS_LABELS[reservation.status]}
              </Badge>
            </div>
            {CANCELLABLE_STATUSES.includes(reservation.status) ? (
              <CancelReservationButton reservationId={reservation.id} />
            ) : null}
          </div>
        ))}
        {reservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reservations yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
