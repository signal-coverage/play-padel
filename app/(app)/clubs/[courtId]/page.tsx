import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { formatDateInTz, formatTimeInTz } from "@/lib/format-time";
import { prisma } from "@/lib/prisma";
import { listAvailability } from "@/lib/reservations";

import { BookSlotButton } from "./book-slot-button";

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Slot-grid booking view (spec: "Slot Availability View"). Access requires
 * the `app/(app)` gate (authenticated, onboarded, email-verified) inherited
 * from the parent layout.
 */
export default async function CourtAvailabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ courtId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { courtId } = await params;
  const { date: requestedDate } = await searchParams;

  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: { club: true },
  });

  if (!court) {
    notFound();
  }

  const timeZone = court.club.timezone;
  const date = requestedDate ?? formatDateInTz(new Date(), timeZone);
  const { slots } = await listAvailability(courtId, date);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div>
        <Link
          href="/clubs"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to clubs
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {court.club.name} — {court.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {court.club.depositRequired
            ? `Booking requires an ARS ${court.club.depositAmountArs} deposit.`
            : "No deposit required — booking confirms instantly."}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href={`/clubs/${courtId}?date=${addDays(date, -1)}`}
          className="text-sm hover:underline"
        >
          ← Previous day
        </Link>
        <span className="text-sm font-medium">{date}</span>
        <Link
          href={`/clubs/${courtId}?date=${addDays(date, 1)}`}
          className="text-sm hover:underline"
        >
          Next day →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {slots.map((slot) => (
          <div
            key={slot.startsAt.toISOString()}
            className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
          >
            <span className="text-sm font-medium">
              {formatTimeInTz(slot.startsAt, timeZone)} –{" "}
              {formatTimeInTz(slot.endsAt, timeZone)}
            </span>
            {slot.available ? (
              <BookSlotButton
                courtId={courtId}
                startsAt={slot.startsAt.toISOString()}
                endsAt={slot.endsAt.toISOString()}
              />
            ) : (
              <Badge variant="outline" className="text-[#585858]">
                Taken
              </Badge>
            )}
          </div>
        ))}
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No slots configured for this day.
          </p>
        ) : null}
      </div>
    </div>
  );
}
