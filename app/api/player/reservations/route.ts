import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  listReservationsByUser,
  createReservation,
  canSelfCancel,
} from "@/core/reservations/services/reservations.service";

// Player's "my reservations" list, across all clubs. Each row also carries a
// server-computed canSelfCancel flag (docs/reservation-flow.md: self-cancel
// allowed until 2h before scheduledStart) so the client never has to
// reimplement that cutoff rule — it just reads the flag.
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const includePast =
    request.nextUrl.searchParams.get("includePast") === "true";
  const reservations = await listReservationsByUser(userId, { includePast });
  const withFlag = reservations.map((reservation) => ({
    ...reservation,
    canSelfCancel: canSelfCancel(reservation),
  }));

  return NextResponse.json({ reservations: withFlag });
}

// Instant CONFIRMED booking, no owner approval (docs/reservation-flow.md).
// createReservation already runs both the court-level and user-level
// (all-clubs) overlap conflict checks internally, so this route does not
// duplicate that logic — it only forwards the caller's own Clerk userId
// rather than trusting one from the request body.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const courtId = body?.courtId;
  const scheduledStart = body?.scheduledStart;
  const scheduledEnd = body?.scheduledEnd;
  const notes = typeof body?.notes === "string" ? body.notes : undefined;

  if (
    typeof courtId !== "string" ||
    typeof scheduledStart !== "string" ||
    typeof scheduledEnd !== "string"
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const reservation = await createReservation(userId, {
      userId,
      courtId,
      scheduledStart,
      scheduledEnd,
      notes,
    });
    return NextResponse.json({ reservation }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create reservation";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
