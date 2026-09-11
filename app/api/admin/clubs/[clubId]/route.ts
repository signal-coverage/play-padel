import { NextResponse, type NextRequest } from "next/server";
import {
  getClubById,
  updateClub,
  getClubOwner,
} from "@/core/clubs/services/clubs.service";
import { updateClubSchema } from "@/core/clubs/schemas/club.schema";
import { requestPlanChange } from "@/core/billing/services/membership.service";
import { requireAdminProfile } from "@/lib/auth/adminProfile";
import { dispatch } from "@/lib/notifications/dispatcher";

type RouteParams = { params: Promise<{ clubId: string }> };

// Admin-only equivalent of GET /api/clubs, explicitly keyed by a `clubId`
// route param instead of resolving the caller's own club — an admin can view
// ANY club's settings, not just one they own. The owner-only GET /api/clubs
// route is untouched.
//
// Also includes the club's `owner` ({ id, displayName } | null) so
// AdminClubSettingsView can wire its "Impersonate owner" button to the
// right userId without a separate round-trip.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdminProfile();
  if (!authResult.ok) return authResult.response;

  const { clubId } = await params;
  const club = await getClubById(clubId);
  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  const owner = await getClubOwner(clubId);

  return NextResponse.json({ club, owner });
}

// Admin-only equivalent of PATCH /api/clubs — same validation/plan-change
// routing as the owner-only route, just targeting the route's `clubId`
// instead of the caller's own club. The owner-only PATCH /api/clubs route is
// untouched.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdminProfile();
  if (!authResult.ok) return authResult.response;

  const { clubId } = await params;
  const existing = await getClubById(clubId);
  if (!existing) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateClubSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  // Mirrors PATCH /api/clubs exactly: a requested plan routes through the
  // membership state machine's `requestPlanChange` rather than being written
  // to `Club.plan` directly (see that route's own comment for the full
  // rationale) — `plan` is stripped from the payload passed to `updateClub`
  // below so it can never sneak back in as a direct write.
  const { plan, ...rest } = parsed.data;

  if (plan) {
    try {
      await requestPlanChange({ clubId, newPlan: plan });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not change plan";
      return NextResponse.json({ error: message }, { status: 409 });
    }
  }

  try {
    const club = await updateClub(clubId, rest, authResult.context.userId);

    // The owner has zero other live signal that an admin touched their club
    // on their behalf — only this route's own caller (the admin) sees the
    // result. Deliberately NOT inside updateClub() itself, which is also
    // called by the owner-only PATCH /api/clubs route — putting it there
    // would notify an owner "an admin updated your club" every time they
    // update it themselves.
    try {
      const owner = await getClubOwner(clubId);
      if (owner) {
        await dispatch({
          type: "CLUB_UPDATED_BY_ADMIN",
          clubId,
          recipientId: owner.id,
          recipientEmail: owner.email,
          recipientName: owner.displayName,
          subject: "Your club settings were updated",
          html: "An administrator updated your club's settings.",
          sendEmail: false,
        });
      }
    } catch {
      // notification failure must not affect the update response
    }

    return NextResponse.json({ club });
  } catch {
    return NextResponse.json(
      { error: "Failed to update club" },
      { status: 500 },
    );
  }
}
