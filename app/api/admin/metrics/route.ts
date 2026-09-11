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

  const [
    totalClubs,
    pendingApprovalClubs,
    activeClubs,
    totalCourts,
    totalPlayers,
    totalReservations,
  ] = await Promise.all([
    // Unfiltered — every club, regardless of status/approval. The
    // activeClubs/inactiveClubs/pendingApprovalClubs breakdown below is a
    // mutually exclusive partition of this SAME total (see their own
    // comments), not a smaller, separately filtered count — the Total
    // Clubs card shows both together.
    prisma.club.count(),
    // A club still mid-onboarding, waiting on admin review (see
    // core/clubs/services/clubs.service.ts's approveClub/rejectClub and
    // lib/mercadopago/operationalStatus.ts's PENDING_APPROVAL cause).
    // Filtered on `approvalStatus`, not `status` — a brand-new club's
    // `status` still defaults to ACTIVE at this point (see Club.status's
    // own schema comment), so `status` alone can't isolate this bucket.
    prisma.club.count({ where: { approvalStatus: "PENDING" } }),
    // A genuinely live, operating club: both approved AND status ACTIVE.
    // Excludes a rejected club (rejectClub only ever writes
    // `approvalStatus`, never `status` — a rejected club's stale `status`
    // can otherwise still read ACTIVE) and an approved-but-deactivated one
    // (e.g. its owner's Clerk account was deleted — see
    // app/api/webhooks/clerk/route.ts).
    prisma.club.count({
      where: { approvalStatus: "APPROVED", status: "ACTIVE" },
    }),
    prisma.court.count(),
    prisma.userProfile.count({ where: { role: "player" } }),
    prisma.reservation.count({
      where: { status: { in: [...ACTIVE_RESERVATION_STATUSES] } },
    }),
  ]);

  // Derived, not queried — the remainder of totalClubs once the two
  // explicit buckets above are subtracted out. Always sums back exactly to
  // totalClubs (activeClubs + inactiveClubs + pendingApprovalClubs ===
  // totalClubs) by construction, with no separate query or risk of a
  // double-counted/uncovered club. Covers a rejected club, an
  // approved-but-inactive/suspended/disabled one, and anything else that
  // isn't one of the two explicit buckets.
  const inactiveClubs = totalClubs - pendingApprovalClubs - activeClubs;

  return NextResponse.json({
    metrics: {
      totalClubs,
      activeClubs,
      inactiveClubs,
      pendingApprovalClubs,
      totalCourts,
      totalPlayers,
      totalReservations,
    },
  });
}
