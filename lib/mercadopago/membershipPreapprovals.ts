import { PreApproval } from "mercadopago";
import { getPlatformMercadoPagoClient } from "./platformClient";

export interface CreateMembershipPreapprovalParams {
  clubId: string;
  preapprovalPlanId: string;
  payerEmail: string;
  cardTokenId: string;
  currency: string;
  /**
   * Must equal the referenced preapproval_plan's own `auto_recurring.
   * transaction_amount` (see preapprovalPlans.ts's
   * createMembershipPreapprovalPlan) — confirmed via a real Mercado Pago
   * sandbox call that creating a preapproval linked to a plan WITHOUT this
   * field is rejected ("The transaction_amount must be the same as
   * preapproval_plan"), even though the plan already carries an amount. MP's
   * own "Subscription with an associated plan" docs always include it.
   */
  transactionAmount: number;
  backUrl: string;
}

export interface MembershipPreapprovalResult {
  id: string;
  status: string;
  initPoint?: string;
}

export type MembershipPreapprovalSemaphore = "green" | "yellow" | "red";

/**
 * Aggregated charge history/health for a preapproval, mirrored from the
 * SDK's `SummarizedResponse` type. `status` alone stays `"authorized"`
 * throughout MP's own dunning retries — `pendingChargeQuantity` and
 * `semaphore` are what actually distinguish a routine successful charge
 * from a failed/recycling one (see design.md's "Grace period source of
 * truth" decision).
 */
export interface MembershipPreapprovalSummarized {
  chargedQuantity: number | null;
  pendingChargeQuantity: number | null;
  lastChargedDate: string | null;
  semaphore: MembershipPreapprovalSemaphore | null;
}

export interface MembershipPreapprovalDetail {
  id: string;
  status: string;
  summarized: MembershipPreapprovalSummarized | null;
}

/**
 * Creates a club's monthly membership subscription as an ALREADY-AUTHORIZED
 * Mercado Pago preapproval (`status: "authorized"`, with a tokenised card on
 * file) — never a pending/unauthorized one. Matches the resolved proposal
 * decision: no trial or subscription may start without an authorized
 * payment method (see spec's "Trial Requires Pre-Authorized MP Preapproval").
 * References `preapprovalPlanId` so the plan's `auto_recurring.free_trial`
 * (see preapprovalPlans.ts) governs when the first real charge occurs.
 */
export async function createMembershipPreapproval(
  params: CreateMembershipPreapprovalParams,
): Promise<MembershipPreapprovalResult> {
  const client = getPlatformMercadoPagoClient();
  const preApproval = new PreApproval(client);
  const result = await preApproval.create({
    body: {
      preapproval_plan_id: params.preapprovalPlanId,
      payer_email: params.payerEmail,
      card_token_id: params.cardTokenId,
      external_reference: params.clubId,
      back_url: params.backUrl,
      status: "authorized",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: params.transactionAmount,
        currency_id: params.currency,
      },
    },
  });

  if (!result.id || !result.status) {
    throw new Error("Mercado Pago did not return a preapproval id/status");
  }

  return {
    id: result.id,
    status: result.status,
    initPoint: result.init_point,
  };
}

/**
 * Pauses a preapproval — the mechanism used for BOTH the manual-renewal
 * post-charge re-pause AND the manual-mode missed-renewal lockout. Pause is
 * reversible (unlike MP's own irreversible cancel), preserving win-back
 * recoverability. See design.md's "Pause vs. cancel semantics" decision.
 */
export async function pauseMembershipPreapproval(
  preapprovalId: string,
): Promise<{ id: string; status: string }> {
  const client = getPlatformMercadoPagoClient();
  const preApproval = new PreApproval(client);
  const result = await preApproval.update({
    id: preapprovalId,
    body: { status: "paused" },
  });

  if (!result.id || !result.status) {
    throw new Error(
      "Mercado Pago did not confirm pausing the preapproval (missing id/status)",
    );
  }

  return { id: result.id, status: result.status };
}

/**
 * Retrieves a preapproval's current state directly from Mercado Pago. Used
 * by the cron backstop (Phase 5) to reconcile an AUTO-mode subscription that
 * appears stuck in `PAST_DUE` well past the point MP's own recycling/dunning
 * timeline should have resolved it one way or another — i.e. a probable
 * missed webhook, not an independently-computed grace clock (see design.md's
 * "Grace period source of truth" decision). This function only reads;
 * callers decide what to do with the result (e.g. call
 * `recordAutoCancellation`/`recordSuccessfulCharge`).
 */
export async function getMembershipPreapproval(
  preapprovalId: string,
): Promise<MembershipPreapprovalDetail> {
  const client = getPlatformMercadoPagoClient();
  const preApproval = new PreApproval(client);
  const result = await preApproval.get({ id: preapprovalId });

  if (!result.id || !result.status) {
    throw new Error("Mercado Pago did not return a preapproval id/status");
  }

  const summarized = result.summarized
    ? {
        chargedQuantity: result.summarized.charged_quantity ?? null,
        pendingChargeQuantity:
          result.summarized.pending_charge_quantity ?? null,
        lastChargedDate: result.summarized.last_charged_date ?? null,
        semaphore:
          (result.summarized.semaphore as MembershipPreapprovalSemaphore) ??
          null,
      }
    : null;

  return { id: result.id, status: result.status, summarized };
}

export interface ReactivateMembershipPreapprovalParams {
  preapprovalId: string;
  /** ISO 8601 date bounding the reactivation to exactly one more cycle. */
  cycleEndDate: string;
}

// The SDK's own `updatePreApprovalRequest.auto_recurring` type only declares
// `transaction_amount`/`currency_id` (see
// node_modules/mercadopago/dist/clients/preApproval/update/types.d.ts) — it
// does not model `end_date`, even though Mercado Pago's actual
// `/preapproval/{id}` endpoint accepts it to bound a reactivation to exactly
// one more cycle (see design.md's "Manual renewal mechanism" decision,
// confirmed via live docs). Declared and cast locally instead of widening
// the SDK's own type — same approach as oauth.ts's locally-declared
// `MpOAuthTokenResponse` for an SDK type gap.
type ReactivateAutoRecurringBody = { end_date: string };

/**
 * Reactivates a paused preapproval, bounded to charge exactly once more
 * (`cycleEndDate`) before the post-charge handler re-pauses it. Used by the
 * owner's "renew now" action for manual-renewal clubs. See design.md's
 * "Manual renewal mechanism" decision.
 */
export async function reactivateMembershipPreapproval(
  params: ReactivateMembershipPreapprovalParams,
): Promise<{ id: string; status: string }> {
  const client = getPlatformMercadoPagoClient();
  const preApproval = new PreApproval(client);
  const autoRecurring: ReactivateAutoRecurringBody = {
    end_date: params.cycleEndDate,
  };
  const result = await preApproval.update({
    id: params.preapprovalId,
    body: {
      status: "authorized",
      auto_recurring: autoRecurring,
    } as unknown as Parameters<typeof preApproval.update>[0]["body"],
  });

  if (!result.id || !result.status) {
    throw new Error(
      "Mercado Pago did not confirm reactivating the preapproval (missing id/status)",
    );
  }

  return { id: result.id, status: result.status };
}
