import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listActiveClubs } from "@/core/clubs/services/clubs.service";
import {
  listCourtsByClub,
  getCourtSlots,
  hasAnyFreeSlot,
} from "@/core/courts/services/courts.service";
import type { ClubBrowseSummary } from "@/app/dashboard/browse/_components/BrowseCourts/types";

// Player-facing club list: any signed-in user can browse clubs to book a
// court at (see docs/reservation-flow.md). No role check beyond auth.
// Requires ?date= so each club can report whether it has any bookable slot
// that day — the Browse Courts club panel grays out clubs with none.
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateParam = request.nextUrl.searchParams.get("date");
  const date = dateParam ? parseLocalDate(dateParam) : null;
  if (!date) {
    return NextResponse.json(
      { error: "Missing or invalid date (expected YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  try {
    const activeClubs = await listActiveClubs();
    const clubs: ClubBrowseSummary[] = await Promise.all(
      activeClubs.map(async (club) => {
        const courts = await listCourtsByClub(club.id);
        const slotsByCourt = await Promise.all(
          courts.map((court) => getCourtSlots(court.id, date)),
        );
        return {
          ...club,
          courtCount: courts.length,
          hasAvailabilityToday: hasAnyFreeSlot(slotsByCourt),
        };
      }),
    );

    return NextResponse.json({ clubs });
  } catch {
    return NextResponse.json(
      { error: "Could not load clubs" },
      { status: 500 },
    );
  }
}

// "YYYY-MM-DD" -> local-midnight Date. Same convention (and same reasoning
// — getCourtSlots derives dayOfWeek from the server's local calendar day)
// as app/api/player/clubs/[clubId]/availability/route.ts's own helper of
// the same name; duplicated rather than shared since that route's version
// isn't exported and this project doesn't currently have a shared
// date-parsing util module worth introducing for one six-line function.
function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}
