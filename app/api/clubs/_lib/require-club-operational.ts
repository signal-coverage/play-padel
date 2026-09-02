import { NextResponse } from "next/server";
import { getClubOperationalStatus } from "@/lib/mercadopago/operationalStatus";

export type RequireClubOperationalResult =
  { ok: true } | { ok: false; response: NextResponse };

/**
 * Gate for club-side court-management WRITE routes only (create/update/
 * delete a court, create/cancel a closure, upload a photo — see design.md's
 * "Owner-side gate scope" decision). Never apply this to a GET/read route:
 * the owner's own dashboard reads must keep working regardless of
 * operational status so they can see their data and fix the problem.
 *
 * Delegates the actual "is this club usable" decision to
 * `getClubOperationalStatus` so the mutation gate, the player-facing read
 * filters, and the UI status endpoint never define "operational" differently.
 */
export async function requireClubOperational(
  clubId: string,
): Promise<RequireClubOperationalResult> {
  const { operational, cause } = await getClubOperationalStatus(clubId);

  if (operational) {
    return { ok: true };
  }

  const error =
    cause === "CLUB_INACTIVE" ? "club_inactive" : "club_mp_not_connected";

  return {
    ok: false,
    response: NextResponse.json({ error }, { status: 403 }),
  };
}
