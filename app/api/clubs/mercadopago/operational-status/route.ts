import { NextResponse } from "next/server";
import { requireOwnerClub } from "../../_lib/require-owner";
import { getClubOperationalStatus } from "@/lib/mercadopago/operationalStatus";

/**
 * Owner-only read used by the dashboard's `ClubOperationalGate` overlay
 * (Phase 8) to decide whether to blur the dashboard and which cause to
 * show. Delegates to `getClubOperationalStatus` — the same single source
 * of truth used by the mutation gate (`requireClubOperational`) and the
 * player-facing read filters — so this never defines "operational"
 * differently than those call sites.
 */
export async function GET() {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const { operational, cause, email, nickname } =
    await getClubOperationalStatus(authResult.context.clubId);

  return NextResponse.json({ operational, cause, email, nickname });
}
