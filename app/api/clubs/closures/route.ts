import { NextResponse } from "next/server";
import { listClosuresByClub } from "@/core/courts/services/courts.service";
import { requireOwnerClub } from "../_lib/require-owner";

// Club-wide closures listing — aggregates every court's CourtClosure rows
// for the caller's own club. Backs Club Settings' "Closures" tab, which
// needs to show every closure created by its "close the whole club" form
// (one CourtClosure per active court) without the owner opening each
// court's own Closures sheet individually. Ungated by requireClubOperational
// like the per-court GET in ../courts/[courtId]/closures/route.ts — reading
// closures should never be blocked by the club's Mercado Pago connection
// status.
export async function GET() {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const closures = await listClosuresByClub(authResult.context.clubId);
  return NextResponse.json({ closures });
}
