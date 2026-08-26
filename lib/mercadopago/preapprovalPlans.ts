import { PreApprovalPlan } from "mercadopago";
import { prisma } from "@/infrastructure/db/client";
import { PLAN_DETAILS } from "@/lib/consts/planPricing";
import type { Plan } from "@/core/clubs/types";
import { getPlatformMercadoPagoClient } from "./platformClient";

export type FreeTrialFrequencyType = "days" | "months";

export interface FreeTrialConfig {
  frequency: number;
  frequency_type: FreeTrialFrequencyType;
}

/**
 * Pure precedence rule for a tier's free-trial length: the admin-configured
 * `MembershipTrialConfig.trialDays` override wins when present (expressed in
 * DAYS); otherwise fall back to the static `PLAN_DETAILS[plan].welcomeFreeMonths`
 * default (expressed in MONTHS). Returns `undefined` when neither is set
 * (e.g. MAX has no `welcomeFreeMonths`). See spec's "Admin-Configurable
 * Trial Length Per Plan" and design.md's "Free trial wiring" decision.
 */
export function resolveFreeTrialConfig(
  trialOverrideDays: number | null | undefined,
  fallbackWelcomeFreeMonths: number | null | undefined,
): FreeTrialConfig | undefined {
  if (trialOverrideDays != null) {
    return { frequency: trialOverrideDays, frequency_type: "days" };
  }
  if (fallbackWelcomeFreeMonths != null) {
    return { frequency: fallbackWelcomeFreeMonths, frequency_type: "months" };
  }
  return undefined;
}

export interface CreateMembershipPreapprovalPlanParams {
  plan: Plan;
  currency: string;
  backUrl: string;
}

export interface MembershipPreapprovalPlanResult {
  id: string;
  initPoint?: string;
}

/**
 * Creates a `preapproval_plan` template for a club membership tier's monthly
 * billing, carrying `auto_recurring.free_trial` per `resolveFreeTrialConfig`'s
 * precedence rule. Always uses the platform-scoped client (never a club's
 * OAuth token) — see design.md's "MP client for membership" decision.
 * Currency is threaded explicitly, never hardcoded (spec's "Currency
 * Threaded as Explicit Parameter").
 */
export async function createMembershipPreapprovalPlan(
  params: CreateMembershipPreapprovalPlanParams,
): Promise<MembershipPreapprovalPlanResult> {
  const planDetails = PLAN_DETAILS[params.plan];
  if (planDetails.monthlyPrice == null) {
    throw new Error(
      `Plan ${params.plan} has no fixed monthly price — cannot create a Mercado Pago preapproval_plan (MAX is contact-us/custom, not automated)`,
    );
  }

  const trialConfig = await prisma.membershipTrialConfig.findUnique({
    where: { plan: params.plan },
  });
  const freeTrial = resolveFreeTrialConfig(
    trialConfig?.trialDays,
    planDetails.welcomeFreeMonths,
  );

  const client = getPlatformMercadoPagoClient();
  const preapprovalPlan = new PreApprovalPlan(client);
  const result = await preapprovalPlan.create({
    body: {
      reason: `Club membership — ${params.plan} monthly`,
      back_url: params.backUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: planDetails.monthlyPrice,
        currency_id: params.currency,
        ...(freeTrial ? { free_trial: freeTrial } : {}),
      },
    },
  });

  if (!result.id) {
    throw new Error("Mercado Pago did not return a preapproval_plan id");
  }

  return { id: result.id, initPoint: result.init_point };
}

export interface GetOrCreateMembershipPreapprovalPlanIdParams {
  plan: Plan;
  currency: string;
  backUrl: string;
}

function isUniqueConstraintViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

/**
 * Returns a reusable `preapproval_plan` id for a given (plan tier, currency)
 * pair, creating one via `createMembershipPreapprovalPlan` only the first
 * time that pair is ever checked out — see the `MembershipPreapprovalPlanCache`
 * model (prisma/schema.prisma) and this batch's apply-progress notes. This
 * is what `app/api/clubs/membership/route.ts`'s MONTHLY branch calls instead
 * of `createMembershipPreapprovalPlan` directly, so every club on the same
 * tier+currency shares one Mercado Pago plan object instead of cluttering
 * the seller's "Planes de suscripción" dashboard with near-duplicates.
 *
 * Cached per (plan, currency) rather than plan alone: `Club.currency` is a
 * free-form per-club field (spec's "Currency Threaded as Explicit
 * Parameter"), so a plan object created for one currency must never be
 * reused for a club billed in a different currency.
 *
 * Concurrency: if two checkouts race to create the cache row for the same
 * never-before-used (plan, currency) pair, the loser's `create` throws a
 * unique-constraint violation (Prisma `P2002`) on the composite `@@id`.
 * Rather than a distributed lock (disproportionate for a genuinely rare
 * race), the loser simply re-reads the winner's row and reuses its id.
 * Worst case in that race, one harmless orphan `preapproval_plan` object is
 * left in the MP dashboard from the loser's own already-completed
 * `createMembershipPreapprovalPlan` call — an accepted low-severity edge
 * case, since it's strictly rarer than the every-checkout duplication this
 * cache exists to fix.
 */
export async function getOrCreateMembershipPreapprovalPlanId(
  params: GetOrCreateMembershipPreapprovalPlanIdParams,
): Promise<MembershipPreapprovalPlanResult> {
  const cacheKey = { plan: params.plan, currency: params.currency };

  const cached = await prisma.membershipPreapprovalPlanCache.findUnique({
    where: { plan_currency: cacheKey },
  });
  if (cached) {
    return { id: cached.preapprovalPlanId };
  }

  const created = await createMembershipPreapprovalPlan(params);

  try {
    await prisma.membershipPreapprovalPlanCache.create({
      data: { ...cacheKey, preapprovalPlanId: created.id },
    });
  } catch (err) {
    if (!isUniqueConstraintViolation(err)) throw err;

    const winner = await prisma.membershipPreapprovalPlanCache.findUnique({
      where: { plan_currency: cacheKey },
    });
    if (winner) {
      return { id: winner.preapprovalPlanId, initPoint: created.initPoint };
    }
    // Extremely unlikely: the winner's row vanished between the constraint
    // violation and this re-read. Fall back to our own freshly created plan
    // rather than throwing — it's still a valid, usable object.
  }

  return created;
}

export interface UpdateMembershipPreapprovalPlanParams {
  preapprovalPlanId: string;
  plan: Plan;
  currency: string;
}

/**
 * Updates an existing `preapproval_plan`'s pricing/trial fields — used by
 * the admin trial-config route (Phase 5) after `MembershipTrialConfig` is
 * changed, so already-issued plans reflect the new trial length without
 * needing a brand-new plan id.
 */
export async function updateMembershipPreapprovalPlan(
  params: UpdateMembershipPreapprovalPlanParams,
): Promise<MembershipPreapprovalPlanResult> {
  const planDetails = PLAN_DETAILS[params.plan];
  if (planDetails.monthlyPrice == null) {
    throw new Error(
      `Plan ${params.plan} has no fixed monthly price — cannot update a Mercado Pago preapproval_plan`,
    );
  }

  const trialConfig = await prisma.membershipTrialConfig.findUnique({
    where: { plan: params.plan },
  });
  const freeTrial = resolveFreeTrialConfig(
    trialConfig?.trialDays,
    planDetails.welcomeFreeMonths,
  );

  const client = getPlatformMercadoPagoClient();
  const preapprovalPlan = new PreApprovalPlan(client);
  const result = await preapprovalPlan.update({
    id: params.preapprovalPlanId,
    updatePreApprovalPlanRequest: {
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: planDetails.monthlyPrice,
        currency_id: params.currency,
        ...(freeTrial ? { free_trial: freeTrial } : {}),
      },
    },
  });

  if (!result.id) {
    throw new Error("Mercado Pago did not return a preapproval_plan id");
  }

  return { id: result.id, initPoint: result.init_point };
}
