import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/client";
import { updateMembershipTrialConfigSchema } from "@/core/billing/schemas/membershipTrialConfig.schema";
import { updateMembershipPreapprovalPlan } from "@/lib/mercadopago/preapprovalPlans";

// Minimal-scope admin surface: a static-secret bearer guard, not a new
// admin role — see spec's "Admin-Configurable Trial Length Per Plan" and
// design.md's "Admin trial-length override" decision. Same
// `Authorization: Bearer <secret>` convention already used by the cron
// routes (see app/api/cron/notifications/route.ts), just with a distinct
// secret since this is a human-triggered admin action, not Vercel Cron.
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${process.env.MEMBERSHIP_ADMIN_SECRET}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateMembershipTrialConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { plan, trialDays, updatedBy } = parsed.data;

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
