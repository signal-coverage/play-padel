import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  listCourtsByClub,
  getCourtSlots,
} from "@/core/courts/services/courts.service";

// Player-facing composed view: a club's active courts plus each court's
// computed slots for one calendar day, shaped directly for
// components/CourtAvailabilityGrid's CourtColumn[] prop. Combines two core
// service calls server-side so the client makes one request per club/date
// instead of one per court.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId } = await params;
  const dateParam = request.nextUrl.searchParams.get("date");
  const date = dateParam ? parseLocalDate(dateParam) : null;
  if (!date) {
    return NextResponse.json(
      { error: "Missing or invalid date (expected YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  try {
    const courts = await listCourtsByClub(clubId);
    const courtsWithSlots = await Promise.all(
      courts.map(async (court) => ({
        id: court.id,
        name: court.name,
        slots: await getCourtSlots(court.id, date),
      })),
    );
    return NextResponse.json({ courts: courtsWithSlots });
  } catch {
    return NextResponse.json(
      { error: "Could not load availability for this club" },
      { status: 500 },
    );
  }
}

// "YYYY-MM-DD" -> local-midnight Date. getCourtSlots derives dayOfWeek from
// date.getDay() on the server's local calendar day with no tz conversion, so
// the parsed Date must land on local midnight of the requested day, not UTC
// midnight (which can shift the day depending on server tz offset).
function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}
