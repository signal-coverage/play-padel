import { NextResponse } from "next/server";
import { activateFreePlanSchema } from "@/core/billing/schemas/membershipFreePlan.schema";
import {
  activateFreePlan,
  ClubNotFoundError,
  RealSubscriptionExistsError,
} from "@/core/billing/services/membership.service";
import { requireAdmin } from "@/lib/auth/admin";

// Activates the hidden, admin-only "FREE" plan tier (see core/clubs/types's
// Plan comment and PLAN_ORDER in components/PlanSelectionModal/consts.ts) so
// an app owner can unblock a specific club's dashboard for internal testing
// without a real Mercado Pago subscription.
export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = activateFreePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { clubId, force } = parsed.data;

  try {
    const subscription = await activateFreePlan({ clubId, force });
    return NextResponse.json({ subscription });
  } catch (err) {
    if (err instanceof ClubNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof RealSubscriptionExistsError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
