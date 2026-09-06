import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/client";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";

// Public (to any signed-in user, any role) directory of every active
// player — intentionally global, not scoped to a club. No pagination and
// no server-side search: the full list is returned and the client filters
// it by name, matching this codebase's existing search convention (see
// SearchableCardsGrid).
//
// email/phone are real PII, not matchmaking info — they're only included
// for an admin caller (who needs them for PlayerEditSheet/CSV export, see
// app/dashboard/players/_components/PlayersDirectory). A regular player
// browsing this directory to find someone to play with never sees another
// player's contact details, even though the UI-level `isAdmin` check that
// hides those actions is not itself a security boundary.
export async function GET() {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const [rows, caller] = await Promise.all([
    prisma.userProfile.findMany({
      where: { role: "player", status: "ACTIVE" },
      select: {
        id: true,
        displayName: true,
        photoURL: true,
        padelCategory: true,
        preferredSide: true,
        dominantHand: true,
        email: true,
        phone: true,
      },
      orderBy: { displayName: "asc" },
    }),
    prisma.userProfile.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    }),
  ]);

  const isAdmin = caller?.isAdmin === true;

  const players = rows.map((row) => ({
    id: row.id,
    displayName: row.displayName,
    avatarUrl: row.photoURL,
    padelCategory: row.padelCategory,
    preferredSide: row.preferredSide,
    dominantHand: row.dominantHand,
    ...(isAdmin && { email: row.email, phone: row.phone }),
  }));

  return NextResponse.json({ players });
}
