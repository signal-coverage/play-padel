// Shared MP Subscriptions (Preapproval / Preapproval Plan) response fixtures
// for club-membership-subscription tests.
//
// Why a shared module (deviation from this repo's usual inline-per-test-file
// `vi.mock(...)` convention — see preferences.test.ts / payments.test.ts):
// Phase 2+ of this change adds SIX new lib/mercadopago modules that all
// operate on the same handful of MP Subscriptions response shapes
// (preapproval_plan create/update, preapproval create/pause/reactivate, and
// the authorized-payment/installment resource used for dunning). Duplicating
// these literal shapes across six `*.test.ts` files would drift the moment
// one file's fixture is tweaked. This module only exports plain data
// builders — no `vi.mock()` wiring lives here. Each test file still does its
// own inline `vi.mock("mercadopago", () => ({ ... }))` exactly like
// preferences.test.ts/payments.test.ts do; it just imports these builders
// for the response *data* instead of hand-writing the literal object.
//
// Field names below (`auto_recurring.free_trial.{frequency,frequency_type}`,
// preapproval `status: authorized|pending|paused|canceled`, and authorized
// payment/installment `status: processed|waiting for gateway|recycling`) are
// per the design doc's MP-docs-verified field names
// (sdd/club-membership-subscription/design, "MCP Verification Status").

export type PreapprovalPlanStatus = "active" | "inactive";

export interface PreapprovalPlanFixtureOverrides {
  id?: string;
  status?: PreapprovalPlanStatus;
  reason?: string;
  transactionAmount?: number;
  currencyId?: string;
  frequency?: number;
  frequencyType?: "months" | "days";
  freeTrialFrequency?: number;
  freeTrialFrequencyType?: "months" | "days";
}

// POST/PUT /preapproval_plan response shape.
export function buildPreapprovalPlanResponse(
  overrides: PreapprovalPlanFixtureOverrides = {},
) {
  const {
    id = "plan_2c9380848d1e6d1b018d1ea9e2a70001",
    status = "active",
    reason = "Club membership — PRO monthly",
    transactionAmount = 15000,
    currencyId = "ARS",
    frequency = 1,
    frequencyType = "months",
    freeTrialFrequency,
    freeTrialFrequencyType,
  } = overrides;

  return {
    id,
    status,
    reason,
    auto_recurring: {
      frequency,
      frequency_type: frequencyType,
      transaction_amount: transactionAmount,
      currency_id: currencyId,
      ...(freeTrialFrequency != null
        ? {
            free_trial: {
              frequency: freeTrialFrequency,
              frequency_type: freeTrialFrequencyType ?? "days",
            },
          }
        : {}),
    },
    back_url: "https://app.example.com/dashboard",
    payment_methods_allowed: {
      payment_types: [{ id: "credit_card" }],
    },
    date_created: "2026-08-24T12:00:00.000-04:00",
    last_modified: "2026-08-24T12:00:00.000-04:00",
  };
}

export type PreapprovalStatus =
  "authorized" | "pending" | "paused" | "canceled";

export type PreapprovalSemaphore = "green" | "yellow" | "red";

// `summarized` mirrors the SDK's own `SummarizedResponse` type
// (node_modules/mercadopago/dist/clients/preApproval/commonTypes.d.ts) —
// aggregated charge history returned alongside a preapproval's top-level
// `status`. `semaphore` is MP's own health indicator for the subscription
// (green = healthy/no pending failed charge, yellow/red = a charge is
// pending/recycling or has repeatedly failed) and `pending_charge_quantity`
// counts charges still awaiting resolution — together these are what let
// the membership webhook handler tell a routine successful charge apart
// from a failed/recycling one, since `status` alone stays `"authorized"`
// throughout MP's own dunning retries (see design.md's "Grace period
// source of truth" decision and membershipPreapprovals.ts's
// `getMembershipPreapproval`).
export interface PreapprovalSummarizedOverrides {
  chargedQuantity?: number | null;
  pendingChargeQuantity?: number | null;
  lastChargedDate?: string | null;
  semaphore?: PreapprovalSemaphore | null;
}

export interface PreapprovalFixtureOverrides {
  id?: string;
  status?: PreapprovalStatus;
  payerEmail?: string;
  preapprovalPlanId?: string;
  externalReference?: string;
  transactionAmount?: number;
  currencyId?: string;
  frequency?: number;
  frequencyType?: "months" | "days";
  startDate?: string;
  endDate?: string;
  nextPaymentDate?: string;
  initPoint?: string;
  summarized?: PreapprovalSummarizedOverrides | null;
}

// POST /preapproval response shape — covers both the `authorized` shape
// (card on file, MP itself may delay first charge via free_trial on the
// referenced plan) and the `pending` shape (checkout not yet completed).
export function buildPreapprovalResponse(
  overrides: PreapprovalFixtureOverrides = {},
) {
  const {
    id = "preap_2c9380848d1e6d1b018d1ea9e2a70099",
    status = "authorized",
    payerEmail = "owner@example.com",
    preapprovalPlanId = "plan_2c9380848d1e6d1b018d1ea9e2a70001",
    externalReference,
    transactionAmount = 15000,
    currencyId = "ARS",
    frequency = 1,
    frequencyType = "months",
    startDate = "2026-08-24T12:00:00.000-04:00",
    endDate,
    nextPaymentDate = "2026-09-24T12:00:00.000-04:00",
    initPoint = "https://www.mercadopago.com/subscriptions/checkout?preapproval_id=preap_2c9380848d1e6d1b018d1ea9e2a70099",
    summarized,
  } = overrides;

  return {
    id,
    status,
    payer_id: 123456789,
    payer_email: payerEmail,
    preapproval_plan_id: preapprovalPlanId,
    external_reference: externalReference,
    reason: "Club membership — PRO monthly",
    auto_recurring: {
      frequency,
      frequency_type: frequencyType,
      transaction_amount: transactionAmount,
      currency_id: currencyId,
      start_date: startDate,
      ...(endDate ? { end_date: endDate } : {}),
    },
    next_payment_date: nextPaymentDate,
    date_created: startDate,
    last_modified: startDate,
    init_point: status === "pending" ? initPoint : undefined,
    ...(summarized !== undefined
      ? {
          summarized: summarized
            ? {
                charged_amount: null,
                charged_quantity: summarized.chargedQuantity ?? null,
                last_charged_amount: null,
                last_charged_date: summarized.lastChargedDate ?? null,
                pending_charge_amount: null,
                pending_charge_quantity:
                  summarized.pendingChargeQuantity ?? null,
                quotas: null,
                semaphore: summarized.semaphore ?? null,
              }
            : null,
        }
      : {}),
  };
}

// PUT /preapproval/{id} { status: "paused" } response shape.
export function buildPausedPreapprovalResponse(
  overrides: PreapprovalFixtureOverrides = {},
) {
  return buildPreapprovalResponse({ ...overrides, status: "paused" });
}

// PUT /preapproval/{id} { status: "authorized", auto_recurring: { end_date } }
// response shape — reactivation bounded to exactly one more cycle, matching
// design.md's manual-renewal "reactivate with bounded end date" decision.
export function buildReactivatedPreapprovalResponse(
  overrides: PreapprovalFixtureOverrides & { endDate: string },
) {
  return buildPreapprovalResponse({ ...overrides, status: "authorized" });
}

export type AuthorizedPaymentInstallmentStatus =
  "processed" | "waiting for gateway" | "recycling";

export interface AuthorizedPaymentFixtureOverrides {
  id?: number;
  preapprovalId?: string;
  status?: AuthorizedPaymentInstallmentStatus;
  transactionAmount?: number;
  currencyId?: string;
  retryAttempt?: number;
}

// Authorized-payment/installment resource shape referenced by
// `subscription_authorized_payment` webhook notifications. `status:
// "recycling"` is MP's own dunning-retry state (up to 4 attempts over ~10
// days) — see design.md's "Grace period source of truth" decision: the
// platform mirrors this as local PAST_DUE and takes no independent action
// while an installment is in this state.
export function buildAuthorizedPaymentResponse(
  overrides: AuthorizedPaymentFixtureOverrides = {},
) {
  const {
    id = 987654321,
    preapprovalId = "preap_2c9380848d1e6d1b018d1ea9e2a70099",
    status = "processed",
    transactionAmount = 15000,
    currencyId = "ARS",
    retryAttempt = 0,
  } = overrides;

  return {
    id,
    preapproval_id: preapprovalId,
    status,
    type: "recurring",
    transaction_amount: transactionAmount,
    currency_id: currencyId,
    retry_attempt: retryAttempt,
    date_created: "2026-08-24T12:00:00.000-04:00",
  };
}
