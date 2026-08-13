import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";

// Public (to any signed-in user, any role) directory of every active
// player — intentionally global, not scoped to a club. No pagination and
// no server-side search: the full list is returned and the client filters
// it by name, matching this codebase's existing search convention (see
// SearchableCardsGrid).
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.userProfile.findMany({
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
  });

  const players = rows.map((row) => ({
    id: row.id,
    displayName: row.displayName,
    avatarUrl: row.photoURL,
    padelCategory: row.padelCategory,
    preferredSide: row.preferredSide,
    dominantHand: row.dominantHand,
    email: row.email,
    phone: row.phone,
  }));

  return NextResponse.json({ players });
}
