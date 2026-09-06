import { NextResponse } from "next/server";
import { format } from "date-fns";
import { prisma } from "@/infrastructure/db/client";
import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { toCsv } from "@/lib/csv/toCsv";

const HEADERS = [
  "id",
  "courtId",
  "courtName",
  "clubId",
  "clubName",
  "playerId",
  "playerName",
  "scheduledStart",
  "scheduledEnd",
  "status",
  "createdAt",
];

// Admin-only CSV export of every Reservation on the platform. Mirrors
// reservations.service.ts's existing convention of reading courtName/
// userName directly off the Reservation row (already denormalized there —
// see toReservation) rather than joining Court/UserProfile again; the club's
// name has no such denormalized column, so that one relation is included.
export async function GET() {
  const authResult = await requireAdminProfile();
  if (!authResult.ok) return authResult.response;

  const reservations = await prisma.reservation.findMany({
    orderBy: { scheduledStart: "desc" },
    include: { club: { select: { name: true } } },
  });

  const csv = toCsv({
    headers: HEADERS,
    rows: reservations.map((reservation) => [
      reservation.id,
      reservation.courtId,
      reservation.courtName,
      reservation.clubId,
      reservation.club.name,
      reservation.userId,
      reservation.userName,
      reservation.scheduledStart.toISOString(),
      reservation.scheduledEnd.toISOString(),
      reservation.status,
      reservation.createdAt.toISOString(),
    ]),
  });

  const filename = `reservations-export-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
