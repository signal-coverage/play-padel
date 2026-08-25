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
