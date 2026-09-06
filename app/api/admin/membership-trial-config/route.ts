import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/infrastructure/db/client";
import { updateMembershipTrialConfigSchema } from "@/core/billing/schemas/membershipTrialConfig.schema";
import { updateMembershipPreapprovalPlan } from "@/lib/mercadopago/preapprovalPlans";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const configs = await prisma.membershipTrialConfig.findMany({
    orderBy: { plan: "asc" },
  });

  return NextResponse.json({ configs });
}

/**
 * Upserts a plan tier's trial-length override. Consumed downstream by
 * `resolveFreeTrialConfig` (lib/mercadopago/preapprovalPlans.ts, Phase 2)
 * and `resolveTrialEndsAt`/`startTrial` (core/billing/services/
 * membership.service.ts, Phase 3), both already wired to prefer this
 * override over the static `welcomeFreeMonths` default.
 *
 * After persisting the override, propagates the new trial length to every
 * already-created `preapproval_plan` for this tier — one per currency, per
 * `MembershipPreapprovalPlanCache` (see
 * lib/mercadopago/preapprovalPlans.ts's `getOrCreateMembershipPreapprovalPlanId`)
 * — via `updateMembershipPreapprovalPlan`, so existing cached plan objects
 * stay in sync instead of only affecting future checkouts. If no tier's
 * plan has been created yet (nobody has checked out on it), this is a
 * clean no-op — the next checkout creates it fresh with the new config.
 * Propagation is best-effort per currency: a failure updating one cached
 * plan is logged and does not block propagation to the others or the
 * overall 200 response, since the authoritative trialDays write already
 * succeeded.
 */
export async function PATCH(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  // requireAdmin() already confirmed this resolves to a signed-in admin —
  // re-read here only to get the userId itself for the audit trail below.
  const { userId } = await auth();
  const updatedBy = userId!;

  const body = await request.json().catch(() => null);
  const parsed = updateMembershipTrialConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { plan, trialDays } = parsed.data;

  const config = await prisma.membershipTrialConfig.upsert({
    where: { plan },
    create: { plan, trialDays, updatedBy },
    update: { trialDays, updatedBy },
  });

  const cachedPlans = await prisma.membershipPreapprovalPlanCache.findMany({
    where: { plan },
  });

  await Promise.allSettled(
    cachedPlans.map(async (cached) => {
      try {
        await updateMembershipPreapprovalPlan({
          preapprovalPlanId: cached.preapprovalPlanId,
          plan,
          currency: cached.currency,
        });
      } catch (err) {
        console.error(
          `[admin/membership-trial-config] Failed to propagate trialDays=${trialDays} to preapproval_plan ${cached.preapprovalPlanId} (plan=${plan}, currency=${cached.currency}):`,
          err,
        );
      }
    }),
  );

  return NextResponse.json({ config });
}
