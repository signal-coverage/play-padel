import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import { getLatestPartnerForPlayer } from "@/core/reservations/services/reservationPartners.service";

// Player-facing "Latest Partner" card data (see PlayerOverview's
// PlayerStyleSection/LatestPartnerCard) — mirrors decision 4 of the Latest
// Partner spec. Returns `{ partner: null }` (not a 404) when the caller has
// no partner history yet, matching how the card is meant to render an empty
// state rather than treat "no data" as an error.
export async function GET() {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const partner = await getLatestPartnerForPlayer(userId);

  return NextResponse.json({ partner });
}
