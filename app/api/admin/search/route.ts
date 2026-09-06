import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/infrastructure/db/client";
import { requireAdminProfile } from "@/lib/auth/adminProfile";

// Caps each category's result set so a broad query (e.g. a single common
// letter) can't return an unbounded number of rows — this is a quick support
// lookup, not a paginated listing.
const RESULT_LIMIT = 10;

// Global admin support tool: search across clubs, players, and reservations
// by name/email/id in one place (see
// app/dashboard/admin-search/_components/AdminSearchView). Every query below
// is unscoped by clubId — an admin's view spans the whole platform, same as
// app/api/admin/clubs and app/api/admin/metrics.
export async function GET(request: NextRequest) {
  const authResult = await requireAdminProfile();
  if (!authResult.ok) return authResult.response;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  // A debounced client can still call this with an empty/whitespace-only
  // string transiently while the user is clearing the input — return empty
  // groups rather than a 400 so the UI doesn't have to special-case it.
  if (!q) {
    return NextResponse.json({ clubs: [], players: [], reservations: [] });
  }

  const [clubs, players, reservations] = await Promise.all([
    prisma.club.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { id: q },
        ],
      },
      select: { id: true, name: true, email: true, status: true },
      take: RESULT_LIMIT,
    }),
    prisma.userProfile.findMany({
      where: {
        role: "player",
        OR: [
          { displayName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { id: q },
        ],
      },
      select: { id: true, displayName: true, email: true },
      take: RESULT_LIMIT,
    }),
    // Reservation has no free-text search field beyond the denormalized
    // courtName/userName columns (see prisma/schema.prisma's Reservation
    // model) — no clubName/playerEmail to search against without an extra
    // join, so this stays limited to id/courtName/userName, same fields the
    // export route added earlier this session already relies on.
    prisma.reservation.findMany({
      where: {
        OR: [
          { id: q },
          { courtName: { contains: q, mode: "insensitive" } },
          { userName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        courtName: true,
        clubId: true,
        userName: true,
        scheduledStart: true,
        status: true,
      },
      take: RESULT_LIMIT,
    }),
  ]);

  return NextResponse.json({
    clubs,
    players,
    // Renamed userName -> playerName in the response: the UI's Search
    // results panel talks about "players" everywhere else (see the players
    // group above), so this keeps the two result groups terminologically
    // consistent even though the Reservation column is still userName.
    reservations: reservations.map((reservation) => ({
      id: reservation.id,
      courtName: reservation.courtName,
      clubId: reservation.clubId,
      playerName: reservation.userName,
      scheduledStart: reservation.scheduledStart,
      status: reservation.status,
    })),
  });
}
