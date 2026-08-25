import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/client";
import { updateMembershipTrialConfigSchema } from "@/core/billing/schemas/membershipTrialConfig.schema";

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

  const { plan, trialDays, mpPreapprovalPlanId, updatedBy } = parsed.data;

  const config = await prisma.membershipTrialConfig.upsert({
    where: { plan },
    create: {
      plan,
      trialDays,
      mpPreapprovalPlanId: mpPreapprovalPlanId ?? null,
      updatedBy,
    },
    update: {
      trialDays,
      mpPreapprovalPlanId: mpPreapprovalPlanId ?? null,
      updatedBy,
    },
  });

  return NextResponse.json({ config });
}
