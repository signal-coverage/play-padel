import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/client";
import { ACTIVE_RESERVATION_STATUSES } from "@/core/reservations/consts";
import { requireAdminProfile } from "@/lib/auth/adminProfile";

// Global, unscoped counts backing the admin dashboard's metric cards — no
// clubId filter, since an admin's view spans every club. "Players" counts
// UserProfile rows with role: "player" (owners are excluded). "Reservations
// booked" reuses ACTIVE_RESERVATION_STATUSES (SCHEDULED, CONFIRMED) — the
// same single source of truth reservations.service.ts/courts.service.ts
// already use for "does this status count as an active reservation" — rather
// than inventing a separate "non-cancelled" definition.
export async function GET() {
  const authResult = await requireAdminProfile();
  if (!authResult.ok) return authResult.response;

  const [totalClubs, totalCourts, totalPlayers, totalReservations] =
    await Promise.all([
      prisma.club.count(),
      prisma.court.count(),
      prisma.userProfile.count({ where: { role: "player" } }),
      prisma.reservation.count({
        where: { status: { in: [...ACTIVE_RESERVATION_STATUSES] } },
      }),
    ]);

  return NextResponse.json({
    metrics: { totalClubs, totalCourts, totalPlayers, totalReservations },
  });
}
