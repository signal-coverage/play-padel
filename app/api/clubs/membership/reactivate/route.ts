import { NextResponse } from "next/server";
import { requireOwnerClub } from "../../_lib/require-owner";
import {
  getMembershipSubscription,
  reactivateCancelledSubscription,
} from "@/core/billing/services/membership.service";

// Resets the caller's own club's CANCELLED membership subscription back to
// PENDING so the owner can start a brand-new checkout through the existing,
// unmodified PlanSelectionModal / POST /api/clubs/membership flow — see
// `reactivateCancelledSubscription`'s doc comment for why this is a full
// reset rather than a partial one. Triggered only by an explicit owner
// action ("Renew membership" on `ClubInactiveCard`), never automatically.
export async function POST() {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const existing = await getMembershipSubscription(authResult.context.clubId);
  if (!existing) {
    return NextResponse.json(
      { error: "No membership subscription found" },
      { status: 404 },
    );
  }

  if (existing.status !== "CANCELLED") {
    return NextResponse.json(
      {
        error: `Cannot reactivate — subscription is ${existing.status}, expected CANCELLED`,
      },
      { status: 409 },
    );
  }

  try {
    const subscription = await reactivateCancelledSubscription(
      authResult.context.clubId,
    );
    return NextResponse.json({ subscription });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to reactivate membership";
    console.error(
      `[clubs/membership/reactivate] Failed for club ${authResult.context.clubId}:`,
      err,
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
