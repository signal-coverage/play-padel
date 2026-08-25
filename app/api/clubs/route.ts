import { NextResponse, type NextRequest } from "next/server";
import { getClubById, updateClub } from "@/core/clubs/services/clubs.service";
import { updateClubSchema } from "@/core/clubs/schemas/club.schema";
import { requestPlanChange } from "@/core/billing/services/membership.service";
import { requireOwnerClub } from "./_lib/require-owner";

export async function GET() {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const club = await getClubById(authResult.context.clubId);
  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  return NextResponse.json({ club });
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const body = await request.json().catch(() => null);
  const parsed = updateClubSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  // A requested plan is no longer written to `Club.plan` directly — it
  // routes through the membership state machine's `requestPlanChange`,
  // which stages it as `pendingPlan` and only applies it at the next
  // renewal boundary (no proration, see spec's "Mid-Cycle Plan Change").
  // `plan` is stripped from the payload passed to `updateClub` below so it
  // can never sneak back in as a direct write.
  const { plan, ...rest } = parsed.data;

  if (plan) {
    try {
      await requestPlanChange({
        clubId: authResult.context.clubId,
        newPlan: plan,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not change plan";
      return NextResponse.json({ error: message }, { status: 409 });
    }
  }

  try {
    const club = await updateClub(
      authResult.context.clubId,
      rest,
      authResult.context.userId,
    );
    return NextResponse.json({ club });
  } catch {
    return NextResponse.json(
      { error: "Failed to update club" },
      { status: 500 },
    );
  }
}
