import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listActiveClubs } from "@/core/clubs/services/clubs.service";

// Player-facing club list: any signed-in user can browse clubs to book a
// court at (see docs/reservation-flow.md). No role check beyond auth.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clubs = await listActiveClubs();
  return NextResponse.json({ clubs });
}
