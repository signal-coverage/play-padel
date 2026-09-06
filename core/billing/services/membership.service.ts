import { prisma } from "@/infrastructure/db/client";
import type { Plan } from "@/core/clubs/types";
import { resolveFreeTrialConfig } from "@/lib/mercadopago/preapprovalPlans";
import { dispatch } from "@/lib/notifications/dispatcher";
import { getClubOwner } from "@/core/clubs/services/clubs.service";

/**
 * Notification failure must never affect a billing state transition — the
 * same swallowing discipline as core/billing/services/billing.service.ts's
 * recordPayment.
 */
async function notifyMembershipPastDue(clubId: string): Promise<void> {
  try {
    const owner = await getClubOwner(clubId);
    if (owner) {
      await dispatch({
        type: "MEMBERSHIP_PAST_DUE",
        clubId,
        recipientId: owner.id,
        recipientEmail: owner.email,
        recipientName: owner.displayName,
        subject: "Your membership payment is past due",
        html: "Your club's membership payment failed and is now past due. Please update your payment method.",
        sendEmail: false,
      });
    }
  } catch {
    // notification failure must not affect billing state transitions
  }
}

// Local unions mirroring `prisma/schema.prisma`'s enums, kept decoupled from
// the generated Prisma client — same convention already established by
// `lib/mercadopago/membershipStatus.ts`'s `MembershipSubscriptionStatus`.
export type MembershipStatusValue =
  "PENDING" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED";

export type MembershipCycleValue = "MONTHLY" | "ANNUAL";
export type MembershipRenewalModeValue = "AUTO" | "MANUAL";

export interface MembershipSubscriptionSnapshot {
  id: string;
  clubId: string;
  plan: Plan;
  pendingPlan: Plan | null;
  cycle: MembershipCycleValue;
  pendingCycle: MembershipCycleValue | null;
  renewalMode: MembershipRenewalModeValue;
  status: MembershipStatusValue;
  currency: string;
  mpPreapprovalId: string | null;
  mpPreferenceId: string | null;
  mpCustomerId: string | null;
  mpCardId: string | null;
  payerIdentificationType: string | null;
  payerIdentificationNumber: string | null;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  pastDueSince: Date | null;
  pastDueUntil: Date | null;
  lastWebhookEventId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type SubscriptionRow = NonNullable<
  Awaited<ReturnType<typeof prisma.clubMembershipSubscription.findUnique>>
>;

function toSnapshot(row: SubscriptionRow): MembershipSubscriptionSnapshot {
  return {
    id: row.id,
    clubId: row.clubId,
    plan: row.plan as Plan,
    pendingPlan: (row.pendingPlan as Plan | null) ?? null,
    cycle: row.cycle as MembershipCycleValue,
    pendingCycle: (row.pendingCycle as MembershipCycleValue | null) ?? null,
    renewalMode: row.renewalMode as MembershipRenewalModeValue,
    status: row.status as MembershipStatusValue,
    currency: row.currency,
    mpPreapprovalId: row.mpPreapprovalId ?? null,
    mpPreferenceId: row.mpPreferenceId ?? null,
    mpCustomerId: row.mpCustomerId ?? null,
    mpCardId: row.mpCardId ?? null,
    payerIdentificationType: row.payerIdentificationType ?? null,
    payerIdentificationNumber: row.payerIdentificationNumber ?? null,
    trialEndsAt: row.trialEndsAt ?? null,
    currentPeriodStart: row.currentPeriodStart ?? null,
    currentPeriodEnd: row.currentPeriodEnd ?? null,
    pastDueSince: row.pastDueSince ?? null,
    pastDueUntil: row.pastDueUntil ?? null,
    lastWebhookEventId: row.lastWebhookEventId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function requireSubscription(clubId: string): Promise<SubscriptionRow> {
  const existing = await prisma.clubMembershipSubscription.findUnique({
    where: { clubId },
  });
  if (!existing) {
    throw new Error(`No membership subscription found for club ${clubId}`);
  }
  return existing;
}

/**
 * Explicit allow-list of valid `MembershipStatus` transitions — the single
 * source of truth consulted by every state-changing function below. A
 * self-loop (e.g. `ACTIVE -> ACTIVE`) is intentionally allowed where a
 * legitimate real-world event re-confirms the same status (a monthly AUTO
 * renewal charge while already ACTIVE, or a second recycling retry while
 * already PAST_DUE) — see spec's "Webhook-Only State Confirmation" and
 * design's grace-period decisions. `CANCELLED` is almost terminal: a club
 * must go through a brand-new checkout attempt, never straight back to
 * ACTIVE — see design's "Pause vs. cancel semantics" decision. The one
 * narrow exception is `CANCELLED -> PENDING`, an explicit owner-triggered
 * reactivation (see `reactivateCancelledSubscription` below).
 */
export const ALLOWED_MEMBERSHIP_TRANSITIONS: Record<
  MembershipStatusValue,
  MembershipStatusValue[]
> = {
  PENDING: ["PENDING", "TRIALING", "ACTIVE"],
  TRIALING: ["TRIALING", "ACTIVE", "CANCELLED"],
  ACTIVE: ["ACTIVE", "PAST_DUE", "CANCELLED"],
  PAST_DUE: ["PAST_DUE", "ACTIVE", "CANCELLED"],
  // Almost terminal: the one narrow exception is CANCELLED -> PENDING,
  // triggered only by an owner explicitly clicking "Renew membership" (see
  // `reactivateCancelledSubscription` below). Once reset to PENDING, the
  // existing PENDING-only checkout flow just works unmodified, exactly like
  // a first-time signup.
  CANCELLED: ["PENDING"],
};

export class InvalidMembershipTransitionError extends Error {
  constructor(from: MembershipStatusValue, to: MembershipStatusValue) {
    super(`Cannot transition membership status from ${from} to ${to}`);
    this.name = "InvalidMembershipTransitionError";
  }
}

/** Thrown by `activateFreePlan` when the given `clubId` has no `Club` row. */
export class ClubNotFoundError extends Error {
  constructor(clubId: string) {
    super(`Club ${clubId} not found`);
    this.name = "ClubNotFoundError";
  }
}

/**
 * Thrown by `activateFreePlan`'s safety guard when the club already has a
 * real (or real-attempt) Mercado Pago subscription — a non-null
 * `mpPreapprovalId`/`mpPreferenceId` — and `force` was not passed. Prevents
 * an admin from accidentally converting a real paying club to FREE by
 * mistyping a `clubId`.
 */
export class RealSubscriptionExistsError extends Error {
  constructor() {
    super(
      "Club already has a real Mercado Pago subscription — pass force to override",
    );
    this.name = "RealSubscriptionExistsError";
  }
}

export function assertMembershipTransition(
  from: MembershipStatusValue,
  to: MembershipStatusValue,
): void {
  if (!ALLOWED_MEMBERSHIP_TRANSITIONS[from].includes(to)) {
    throw new InvalidMembershipTransitionError(from, to);
  }
}

/**
 * Pure date helper: advances `from` by exactly one billing cycle. Used both
 * to compute the next `currentPeriodEnd` on a successful charge and (later,
 * by the cron sweep) to reason about MANUAL-mode deadlines.
 */
export function addOneCycle(from: Date, cycle: MembershipCycleValue): Date {
  const next = new Date(from);
  if (cycle === "MONTHLY") {
    next.setUTCMonth(next.getUTCMonth() + 1);
  } else {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  }
  return next;
}

function addDays(from: Date, days: number): Date {
  const next = new Date(from);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Pure helper: resolves a trial's end date from a start date using the same
 * precedence rule as `resolveFreeTrialConfig` (admin override in days wins,
 * else the static `welcomeFreeMonths` default in months, else no trial).
 * Reused here instead of duplicated so the precedence logic has one owner
 * (`lib/mercadopago/preapprovalPlans.ts`).
 */
export function resolveTrialEndsAt(
  startsAt: Date,
  trialOverrideDays: number | null | undefined,
  fallbackWelcomeFreeMonths: number | null | undefined,
): Date | null {
  const config = resolveFreeTrialConfig(
    trialOverrideDays,
    fallbackWelcomeFreeMonths,
  );
  if (!config) return null;

  const end = new Date(startsAt);
  if (config.frequency_type === "days") {
    end.setUTCDate(end.getUTCDate() + config.frequency);
  } else {
    end.setUTCMonth(end.getUTCMonth() + config.frequency);
  }
  return end;
}

export interface CreatePendingMembershipSubscriptionInput {
  clubId: string;
  plan: Plan;
  currency: string;
  cycle?: MembershipCycleValue;
  renewalMode?: MembershipRenewalModeValue;
}

/**
 * Seeds the initial `ClubMembershipSubscription` row for a newly onboarded
 * club, in `PENDING` status with no MP object yet (see design's Onboarding
 * flow: `Club.plan` is still written directly by `createClub` since court
 * capacity needs it immediately — this only adds state-machine tracking on
 * top of that). `cycle`/`renewalMode` default to this codebase's established
 * MONTHLY/AUTO convention (also the default `row()` fixture used across this
 * test file) since the onboarding wizard does not yet collect them — Phase
 * 7's dashboard `PlanSelectionModal` is where an owner actually chooses
 * these, before ever paying.
 */
export async function createPendingMembershipSubscription(
  input: CreatePendingMembershipSubscriptionInput,
): Promise<MembershipSubscriptionSnapshot> {
  const row = await prisma.clubMembershipSubscription.create({
    data: {
      clubId: input.clubId,
      plan: input.plan,
      cycle: input.cycle ?? "MONTHLY",
      renewalMode: input.renewalMode ?? "AUTO",
      currency: input.currency,
      status: "PENDING",
    },
  });

  return toSnapshot(row);
}

export interface SeedPendingMembershipSubscriptionFromClubInput {
  clubId: string;
  /** Falls back to `Club.plan` when omitted. */
  plan?: Plan;
  /** Falls back to `Club.currency` when omitted. */
  currency?: string;
  cycle?: MembershipCycleValue;
  renewalMode?: MembershipRenewalModeValue;
}

/**
 * Shared lazy-creation fallback for a club that predates Phase 6.2's
 * onboarding-time PENDING-row seeding — used by BOTH `POST` (which already
 * knows `plan`/`cycle`/`renewalMode` from its request body and only needs
 * `Club.currency`) and `GET` (which has no request body at all and must
 * derive `plan` and `currency` purely from `Club`, see
 * app/api/clubs/membership/route.ts). Only queries the `Club` columns that
 * are actually missing, to avoid changing either call site's existing query
 * shape. Defaults to `Club.plan`'s own schema default (`BASIC`) / `ARS` in
 * the unexpected case the `Club` row itself cannot be found.
 */
export async function seedPendingMembershipSubscriptionFromClub(
  input: SeedPendingMembershipSubscriptionFromClubInput,
): Promise<MembershipSubscriptionSnapshot> {
  let plan = input.plan;
  let currency = input.currency;

  if (plan == null || currency == null) {
    const club = await prisma.club.findUnique({
      where: { id: input.clubId },
      select: {
        ...(plan == null ? { plan: true } : {}),
        ...(currency == null ? { currency: true } : {}),
      },
    });
    plan = plan ?? (club as { plan?: Plan } | null)?.plan ?? "BASIC";
    currency =
      currency ?? (club as { currency?: string } | null)?.currency ?? "ARS";
  }

  return createPendingMembershipSubscription({
    clubId: input.clubId,
    plan,
    currency,
    cycle: input.cycle,
    renewalMode: input.renewalMode,
  });
}

export interface StartTrialInput {
  clubId: string;
  plan: Plan;
  cycle: MembershipCycleValue;
  renewalMode: MembershipRenewalModeValue;
  currency: string;
  trialOverrideDays?: number | null;
  fallbackWelcomeFreeMonths?: number | null;
  mpPreapprovalId?: string | null;
  now?: Date;
}

/**
 * Starts a free trial for a club membership. Creates the
 * `ClubMembershipSubscription` row in `TRIALING` if none exists yet (a
 * missing row is treated as an implicit `PENDING`), or transitions an
 * existing `PENDING` row (created by onboarding — a later batch) into
 * `TRIALING`. Every trial requires an already-authorized MP preapproval on
 * the caller's side (see spec's "Trial Requires Pre-Authorized MP
 * Preapproval") — this function only records the resulting state, it does
 * not call Mercado Pago itself.
 */
export async function startTrial(
  input: StartTrialInput,
): Promise<MembershipSubscriptionSnapshot> {
  const now = input.now ?? new Date();
  const existing = await prisma.clubMembershipSubscription.findUnique({
    where: { clubId: input.clubId },
  });
  const currentStatus: MembershipStatusValue =
    (existing?.status as MembershipStatusValue | undefined) ?? "PENDING";
  assertMembershipTransition(currentStatus, "TRIALING");

  const trialEndsAt = resolveTrialEndsAt(
    now,
    input.trialOverrideDays,
    input.fallbackWelcomeFreeMonths,
  );
  if (!trialEndsAt) {
    throw new Error(
      `Plan ${input.plan} has no trial configured — cannot start a trial`,
    );
  }

  const data = {
    plan: input.plan,
    cycle: input.cycle,
    renewalMode: input.renewalMode,
    currency: input.currency,
    status: "TRIALING" as const,
    trialEndsAt,
    mpPreapprovalId: input.mpPreapprovalId ?? null,
    pendingPlan: null,
    pendingCycle: null,
  };

  const row = existing
    ? await prisma.clubMembershipSubscription.update({
        where: { clubId: input.clubId },
        data,
      })
    : await prisma.clubMembershipSubscription.create({
        data: { clubId: input.clubId, ...data },
      });

  // A trial reaching TRIALING is a confirmed state (isMembershipConfirmed),
  // so the club must be operational again — most relevantly, a club coming
  // back from CANCELLED via reactivateCancelledSubscription (reset to
  // PENDING, then this) needs its earlier `Club.status = "INACTIVE"` (set by
  // recordAutoCancellation/recordManualLockout, the only other writers of
  // this field) undone here, or it would stay locked out of
  // ClubOperationalGate forever despite an actually-confirmed membership.
  await prisma.club.update({
    where: { id: input.clubId },
    data: { status: "ACTIVE" },
  });

  return toSnapshot(row);
}

export interface RecordSuccessfulChargeInput {
  clubId: string;
  chargedAt: Date;
  webhookEventId?: string | null;
}

/**
 * Records a successful charge — the single "success" transition covering
 * every scenario where a real MP charge/authorization confirms payment:
 * first charge after a trial, first charge with no trial (e.g. ANNUAL),
 * a routine AUTO renewal (ACTIVE -> ACTIVE), a MANUAL owner-triggered
 * "renew now" charge, or recovery from `PAST_DUE`. If a `pendingPlan`/
 * `pendingCycle` was requested mid-cycle, this renewal boundary is exactly
 * when it takes effect (no proration — see spec's "Mid-Cycle Plan Change").
 * Idempotent via `webhookEventId`: replaying the same event is a no-op.
 */
export async function recordSuccessfulCharge(
  input: RecordSuccessfulChargeInput,
): Promise<MembershipSubscriptionSnapshot> {
  const current = await requireSubscription(input.clubId);
  const currentStatus = current.status as MembershipStatusValue;

  if (
    input.webhookEventId != null &&
    current.lastWebhookEventId === input.webhookEventId
  ) {
    return toSnapshot(current);
  }

  assertMembershipTransition(currentStatus, "ACTIVE");

  const effectivePlan = (current.pendingPlan as Plan | null) ?? current.plan;
  const effectiveCycle =
    (current.pendingCycle as MembershipCycleValue | null) ?? current.cycle;
  const currentPeriodEnd = addOneCycle(
    input.chargedAt,
    effectiveCycle as MembershipCycleValue,
  );

  // Both writes are wrapped in a single $transaction (same convention as
  // `billing.service.ts`'s `recordPayment`): the subscription-status write
  // and the Club.status sync below must both land or neither does. Without
  // this, a transient failure between the two writes would leave
  // `Club.status` permanently stale — and this function's own
  // `webhookEventId` idempotency guard above (designed to make retries
  // safe) would then permanently short-circuit before the missing second
  // write could ever be retried.
  const [row] = await prisma.$transaction([
    prisma.clubMembershipSubscription.update({
      where: { clubId: input.clubId },
      data: {
        status: "ACTIVE",
        plan: effectivePlan,
        cycle: effectiveCycle,
        pendingPlan: null,
        pendingCycle: null,
        currentPeriodStart: input.chargedAt,
        currentPeriodEnd,
        pastDueSince: null,
        pastDueUntil: null,
        lastWebhookEventId: input.webhookEventId ?? current.lastWebhookEventId,
      },
    }),
    // Same reasoning as startTrial's own Club.status reset: a real charge
    // confirms the membership, so any earlier `Club.status = "INACTIVE"`
    // (recordAutoCancellation/recordManualLockout, the only other writers of
    // this field) must be undone here — otherwise a reactivated club stays
    // locked out of ClubOperationalGate even after successfully paying.
    prisma.club.update({
      where: { id: input.clubId },
      data: { status: "ACTIVE" },
    }),
  ]);

  return toSnapshot(row);
}

export interface RecordFailedChargeInput {
  clubId: string;
  failedAt: Date;
  webhookEventId?: string | null;
}

/**
 * Records an AUTO-mode failed/recycling installment reported by MP. Moves
 * `ACTIVE -> PAST_DUE` (or is a no-op re-confirmation if already
 * `PAST_DUE`, e.g. a second retry within MP's own ~10-day/4-retry dunning
 * window). `pastDueSince` is only ever set on the FIRST failure — later
 * retries never reset it, since MP's own timeline (not a local day-count)
 * is authoritative for AUTO mode (see design's resolved grace-period
 * decision). Idempotent via `webhookEventId`.
 */
export async function recordFailedCharge(
  input: RecordFailedChargeInput,
): Promise<MembershipSubscriptionSnapshot> {
  const current = await requireSubscription(input.clubId);
  const currentStatus = current.status as MembershipStatusValue;

  if (
    input.webhookEventId != null &&
    current.lastWebhookEventId === input.webhookEventId
  ) {
    return toSnapshot(current);
  }

  assertMembershipTransition(currentStatus, "PAST_DUE");

  const row = await prisma.clubMembershipSubscription.update({
    where: { clubId: input.clubId },
    data: {
      status: "PAST_DUE",
      pastDueSince: current.pastDueSince ?? input.failedAt,
      lastWebhookEventId: input.webhookEventId ?? current.lastWebhookEventId,
    },
  });

  // Only notify on a genuine first-time transition — MP's own dunning
  // retries re-call this while already PAST_DUE, and those must not
  // re-notify the owner.
  if (currentStatus !== "PAST_DUE") {
    await notifyMembershipPastDue(input.clubId);
  }

  return toSnapshot(row);
}

export interface RecordAutoCancellationInput {
  clubId: string;
  cancelledAt: Date;
  webhookEventId?: string | null;
}

/**
 * Records MP's own auto-cancellation of a preapproval after 3 consecutively
 * rejected installments — the AUTO path's only cancellation trigger (never
 * an independently-computed day-count, see design's resolved grace-period
 * decision). Syncs `Club.status` to `INACTIVE` so the existing
 * `require-club-operational.ts`/`operationalStatus.ts` gate takes over with
 * zero changes of its own (see design's "Technical Approach"). Idempotent
 * via `webhookEventId` — a replayed cancellation webhook does not re-run
 * the `Club.status` sync.
 */
export async function recordAutoCancellation(
  input: RecordAutoCancellationInput,
): Promise<MembershipSubscriptionSnapshot> {
  const current = await requireSubscription(input.clubId);
  const currentStatus = current.status as MembershipStatusValue;

  if (
    input.webhookEventId != null &&
    current.lastWebhookEventId === input.webhookEventId
  ) {
    return toSnapshot(current);
  }

  assertMembershipTransition(currentStatus, "CANCELLED");

  // Wrapped in a single $transaction — same reasoning as
  // `recordSuccessfulCharge` above: the subscription-status write and the
  // `Club.status` sync must both land or neither does, so a failure
  // between them can never leave `Club.status` permanently stale behind
  // this function's own idempotency guard.
  const [row] = await prisma.$transaction([
    prisma.clubMembershipSubscription.update({
      where: { clubId: input.clubId },
      data: {
        status: "CANCELLED",
        lastWebhookEventId: input.webhookEventId ?? current.lastWebhookEventId,
      },
    }),
    prisma.club.update({
      where: { id: input.clubId },
      data: { status: "INACTIVE" },
    }),
  ]);

  return toSnapshot(row);
}

export interface RecordManualPeriodExpiredInput {
  clubId: string;
  now: Date;
  graceWindowDays: number;
}

/**
 * MANUAL-mode only: called by the cron sweep (a later batch) once a club's
 * `currentPeriodEnd` has passed with no "renew now" reactivation. Moves
 * `ACTIVE -> PAST_DUE` and stamps the AUTHORITATIVE `pastDueUntil` lockout
 * deadline (`now + graceWindowDays`) — unlike AUTO mode, MANUAL has no
 * MP-side retry signal, so this app-tracked deadline is the sole source of
 * truth (see design's resolved grace-period decision). Idempotent: an
 * already-`PAST_DUE` subscription is left unchanged so the deadline is
 * never reset on every cron tick.
 */
export async function recordManualPeriodExpiredWithoutRenewal(
  input: RecordManualPeriodExpiredInput,
): Promise<MembershipSubscriptionSnapshot> {
  const current = await requireSubscription(input.clubId);
  const currentStatus = current.status as MembershipStatusValue;

  if (current.renewalMode !== "MANUAL") {
    throw new Error(
      "recordManualPeriodExpiredWithoutRenewal only applies to MANUAL renewal mode subscriptions",
    );
  }

  if (currentStatus === "PAST_DUE") {
    return toSnapshot(current);
  }

  assertMembershipTransition(currentStatus, "PAST_DUE");

  const row = await prisma.clubMembershipSubscription.update({
    where: { clubId: input.clubId },
    data: {
      status: "PAST_DUE",
      pastDueSince: input.now,
      pastDueUntil: addDays(input.now, input.graceWindowDays),
    },
  });

  // The early return above guarantees this is a genuine first-time
  // transition by the time we reach here.
  await notifyMembershipPastDue(input.clubId);

  return toSnapshot(row);
}

export interface RecordManualLockoutInput {
  clubId: string;
  now: Date;
}

/**
 * MANUAL-mode only: the cron sweep's sole/authoritative lockout trigger
 * (see design's resolved grace-period decision — MANUAL has no MP-side
 * backstop, unlike AUTO). Requires the subscription to already be
 * `PAST_DUE` with its `pastDueUntil` deadline actually passed; moves it to
 * `CANCELLED` (locally — the underlying MP preapproval stays merely
 * PAUSED, not MP-cancelled, preserving win-back recoverability, see
 * design's "Pause vs. cancel semantics" decision) and syncs `Club.status`
 * to `INACTIVE`. Idempotent: an already-`CANCELLED` subscription is left
 * unchanged.
 */
export async function recordManualLockout(
  input: RecordManualLockoutInput,
): Promise<MembershipSubscriptionSnapshot> {
  const current = await requireSubscription(input.clubId);
  const currentStatus = current.status as MembershipStatusValue;

  if (currentStatus === "CANCELLED") {
    return toSnapshot(current);
  }

  if (currentStatus !== "PAST_DUE") {
    throw new InvalidMembershipTransitionError(currentStatus, "CANCELLED");
  }

  if (!current.pastDueUntil || input.now < current.pastDueUntil) {
    throw new Error(
      "Cannot lock out a MANUAL subscription before its pastDueUntil grace deadline has passed",
    );
  }

  // Wrapped in a single $transaction — same reasoning as
  // `recordSuccessfulCharge`/`recordAutoCancellation` above.
  const [row] = await prisma.$transaction([
    prisma.clubMembershipSubscription.update({
      where: { clubId: input.clubId },
      data: { status: "CANCELLED" },
    }),
    prisma.club.update({
      where: { id: input.clubId },
      data: { status: "INACTIVE" },
    }),
  ]);

  return toSnapshot(row);
}

export interface ChangeTrialPlanInput {
  clubId: string;
  newPlan: Plan;
}

/**
 * Changes a club's plan tier IMMEDIATELY while the subscription is still
 * TRIALING — deliberately separate from `requestPlanChange` above, which
 * only applies once ACTIVE and defers the change to the next renewal
 * boundary with no proration. While TRIALING, no real charge has happened
 * yet on EITHER cycle (MONTHLY already has an authorized-but-uncharged
 * preapproval; ANNUAL has no Mercado Pago object at all), so there is
 * nothing to prorate — whatever plan the owner picks simply becomes what
 * eventually gets charged. Same billing cycle only: this never touches
 * `cycle`. Overwrites `plan` directly (never `pendingPlan`/`pendingCycle`,
 * which exist solely for the deferred ACTIVE-only mechanism).
 */
export async function changeTrialPlan(
  input: ChangeTrialPlanInput,
): Promise<MembershipSubscriptionSnapshot> {
  const current = await requireSubscription(input.clubId);
  const currentStatus = current.status as MembershipStatusValue;

  if (currentStatus !== "TRIALING") {
    throw new Error(
      "Plan can only be changed immediately while the membership subscription is TRIALING",
    );
  }

  const row = await prisma.clubMembershipSubscription.update({
    where: { clubId: input.clubId },
    data: { plan: input.newPlan },
  });

  return toSnapshot(row);
}

export interface ActivateFreePlanInput {
  clubId: string;
  /**
   * Overrides the safety guard that otherwise refuses to touch a
   * subscription that already has a real `mpPreapprovalId`/`mpPreferenceId`.
   * Defaults to `false`.
   */
  force?: boolean;
  now?: Date;
}

/**
 * Admin-only override: activates the hidden "FREE" plan tier for a club so
 * the app owner can unblock `ClubOperationalGate` for internal testing (e.g.
 * exercising the player-side reservation payment flow) without a real
 * Mercado Pago checkout. Mirrors `startTrial`/`recordSuccessfulCharge`'s
 * `Club.status = "ACTIVE"` side effect to reverse any prior lockout.
 *
 * Deliberately bypasses `assertMembershipTransition` — this is an explicit
 * admin action overriding billing state outside the normal event-driven
 * lifecycle, the same philosophy as `app/api/admin/club-status/route.ts`
 * overriding `Club.status` outside the billing state machine's own
 * transitions.
 *
 * Safety guard: refuses to overwrite an existing subscription that already
 * has a real MP preapproval/preference id unless `force` is explicitly
 * passed (see `RealSubscriptionExistsError`) — a net against accidentally
 * converting a real paying club to FREE via a mistyped `clubId`.
 */
export async function activateFreePlan(
  input: ActivateFreePlanInput,
): Promise<MembershipSubscriptionSnapshot> {
  const now = input.now ?? new Date();

  const club = await prisma.club.findUnique({
    where: { id: input.clubId },
    select: { currency: true },
  });
  if (!club) {
    throw new ClubNotFoundError(input.clubId);
  }

  const existing = await prisma.clubMembershipSubscription.findUnique({
    where: { clubId: input.clubId },
  });

  const hasRealSubscription =
    existing != null &&
    (existing.mpPreapprovalId != null || existing.mpPreferenceId != null);

  if (hasRealSubscription && !input.force) {
    throw new RealSubscriptionExistsError();
  }

  const data = {
    plan: "FREE" as const,
    cycle: "ANNUAL" as const,
    renewalMode: "MANUAL" as const,
    status: "ACTIVE" as const,
    currency: club.currency,
    currentPeriodStart: now,
    currentPeriodEnd: null,
    mpPreapprovalId: null,
    mpPreferenceId: null,
    mpCustomerId: null,
    mpCardId: null,
    pendingPlan: null,
    pendingCycle: null,
    pastDueSince: null,
    pastDueUntil: null,
    trialEndsAt: null,
  };

  const row = existing
    ? await prisma.clubMembershipSubscription.update({
        where: { clubId: input.clubId },
        data,
      })
    : await prisma.clubMembershipSubscription.create({
        data: { clubId: input.clubId, ...data },
      });

  // Same reasoning as startTrial's/recordSuccessfulCharge's own Club.status
  // reset: reverses any prior lockout (recordAutoCancellation/
  // recordManualLockout are the only other writers of this field) so the
  // club is immediately operational for testing. Also forces
  // approvalStatus to APPROVED — a FREE plan can never itself go through
  // the admin approval queue (see prisma/schema.prisma's
  // Club.approvalStatus and lib/mercadopago/operationalStatus.ts's
  // PENDING_APPROVAL cause), so without this a FREE-plan test club would
  // stay stuck behind the new approval gate despite its subscription being
  // fully confirmed. This is the only other place besides an admin's own
  // approve action that ever sets approvalStatus to APPROVED.
  await prisma.club.update({
    where: { id: input.clubId },
    data: { status: "ACTIVE", approvalStatus: "APPROVED" },
  });

  return toSnapshot(row);
}

/**
 * Resolves which club a Mercado Pago preapproval id belongs to. Consumed by
 * the membership webhook route (Phase 4) to figure out whose subscription a
 * `subscription_preapproval` notification's `data.id` refers to, BEFORE
 * ever re-fetching the preapproval from MP — mirrors the reservation
 * webhook's own "resolve the owning entity before fetching from MP"
 * ordering (see app/api/webhooks/mercadopago/route.ts).
 */
export async function findMembershipSubscriptionByPreapprovalId(
  preapprovalId: string,
): Promise<{ clubId: string } | null> {
  const row = await prisma.clubMembershipSubscription.findFirst({
    where: { mpPreapprovalId: preapprovalId },
    select: { clubId: true },
  });
  return row ?? null;
}

export interface AttachPendingPreapprovalInput {
  clubId: string;
  plan: Plan;
  cycle: MembershipCycleValue;
  renewalMode: MembershipRenewalModeValue;
  currency: string;
  mpPreapprovalId: string;
}

/**
 * Records that a MONTHLY checkout created a real MP preapproval WITHOUT
 * advancing membership status — per spec's "Webhook-Only State
 * Confirmation", only a confirmed webhook may move a subscription out of
 * PENDING into ACTIVE/TRIALING. Used when the created preapproval has no
 * free trial configured for the tier (see `startTrial` for the
 * trial-eligible counterpart, which the caller — the checkout route —
 * chooses between based on `resolveFreeTrialConfig`). Only valid from
 * PENDING: an already-active/trialing/past-due subscription must go
 * through `requestPlanChange` or the manual "renew now" flow instead of a
 * fresh checkout attach.
 */
export async function attachPendingPreapproval(
  input: AttachPendingPreapprovalInput,
): Promise<MembershipSubscriptionSnapshot> {
  const current = await requireSubscription(input.clubId);
  if ((current.status as MembershipStatusValue) !== "PENDING") {
    throw new Error(
      `Cannot attach a new preapproval while membership subscription is ${current.status} — expected PENDING`,
    );
  }

  const row = await prisma.clubMembershipSubscription.update({
    where: { clubId: input.clubId },
    data: {
      plan: input.plan,
      cycle: input.cycle,
      renewalMode: input.renewalMode,
      currency: input.currency,
      mpPreapprovalId: input.mpPreapprovalId,
    },
  });

  return toSnapshot(row);
}

export interface AttachPendingPreferenceInput {
  clubId: string;
  plan: Plan;
  currency: string;
  mpPreferenceId: string;
}

/**
 * Records that an ANNUAL checkout created a real MP (platform) preference
 * WITHOUT advancing membership status — same "webhook is the only thing
 * that confirms payment" rule as `attachPendingPreapproval`. `cycle` is
 * always forced to `ANNUAL` and `renewalMode` to `AUTO`: annual billing is
 * a one-time Checkout Pro payment (spec's "Annual Billing Uses One-Time
 * Payment") with no recurring/manual-renewal concept, so `renewalMode` is
 * only a nominal placeholder to satisfy the non-nullable column.
 *
 * Valid from PENDING (first-ever ANNUAL checkout attempt), same guard as
 * `attachPendingPreapproval`, OR from an existing TRIALING+ANNUAL
 * subscription (the "pay now during trial" follow-up fix — ANNUAL trials
 * start with no MP object at all, see `startTrial`'s ANNUAL caller in
 * app/api/clubs/membership/route.ts, so this is the only way one can ever
 * reach ACTIVE before the cron sweep cancels it at `trialEndsAt`). This
 * function never touches `status` itself either way — a TRIALING
 * subscription stays TRIALING, now with an `mpPreferenceId` attached, until
 * the payment webhook confirms it (spec's "Webhook-Only State
 * Confirmation").
 */
export async function attachPendingPreference(
  input: AttachPendingPreferenceInput,
): Promise<MembershipSubscriptionSnapshot> {
  const current = await requireSubscription(input.clubId);
  const currentStatus = current.status as MembershipStatusValue;
  const isAnnualTrialPayNow =
    currentStatus === "TRIALING" &&
    (current.cycle as MembershipCycleValue) === "ANNUAL";

  if (currentStatus !== "PENDING" && !isAnnualTrialPayNow) {
    throw new Error(
      `Cannot attach a new preference while membership subscription is ${current.status} — expected PENDING`,
    );
  }

  const row = await prisma.clubMembershipSubscription.update({
    where: { clubId: input.clubId },
    data: {
      plan: input.plan,
      cycle: "ANNUAL",
      renewalMode: "AUTO",
      currency: input.currency,
      mpPreferenceId: input.mpPreferenceId,
    },
  });

  return toSnapshot(row);
}

/**
 * Reads a club's current membership subscription snapshot, or `null` if
 * none exists yet. Consumed by `GET /api/clubs/membership` (Phase 4) —
 * unlike `requireMembershipPaid` (lib/mercadopago/membershipStatus.ts),
 * which only answers the narrow "is this paid?" gating question, this
 * returns the full snapshot (plan, pendingPlan, cycle, trialEndsAt, etc.)
 * the membership UI needs to render.
 */
export async function getMembershipSubscription(
  clubId: string,
): Promise<MembershipSubscriptionSnapshot | null> {
  const existing = await prisma.clubMembershipSubscription.findUnique({
    where: { clubId },
  });
  return existing ? toSnapshot(existing) : null;
}

/**
 * Persists the cardholder identification (type/number, e.g. `{ type: "CUIT",
 * number: "30-12345678-9" }`) the owner actually confirmed while entering a
 * card via the Mercado Pago Card Payment Brick — only ever called when the
 * owner explicitly opts in via the checkout drawer's "Save this ID for
 * future payments" checkbox (see app/api/clubs/membership/route.ts's POST
 * handler). Remembered so a LATER card re-collection (a renewal or plan
 * change) can prefill the Brick's identification field with what was
 * actually confirmed last time, instead of always falling back to the
 * club's own onboarding-collected `Club.taxId`. Assumes the subscription row
 * already exists — this is only ever invoked right after a MONTHLY checkout
 * in the same request that just confirmed/attached a preapproval, so a
 * straightforward `update` (rather than `requireSubscription`'s extra guard)
 * is enough here.
 */
export async function saveMembershipPayerIdentification(
  clubId: string,
  identification: { type: string; number: string },
): Promise<MembershipSubscriptionSnapshot> {
  const row = await prisma.clubMembershipSubscription.update({
    where: { clubId },
    data: {
      payerIdentificationType: identification.type,
      payerIdentificationNumber: identification.number,
    },
  });

  return toSnapshot(row);
}

export interface RequestPlanChangeInput {
  clubId: string;
  newPlan: Plan;
  newCycle?: MembershipCycleValue;
}

/**
 * Requests a mid-cycle plan/cycle change on an ACTIVE subscription. Per the
 * resolved proposal decision, there is no proration: the current plan/cycle
 * keeps billing unchanged for the rest of the cycle, and the requested
 * change only takes effect at the next renewal boundary (applied by
 * `recordSuccessfulCharge`). Picking the plan/cycle the club already has
 * clears any previously pending change instead of leaving a stale one.
 */
export async function requestPlanChange(
  input: RequestPlanChangeInput,
): Promise<MembershipSubscriptionSnapshot> {
  const current = await requireSubscription(input.clubId);
  const currentStatus = current.status as MembershipStatusValue;

  if (currentStatus !== "ACTIVE") {
    throw new Error(
      "Plan changes can only be requested while the membership subscription is ACTIVE",
    );
  }

  const pendingPlan = input.newPlan === current.plan ? null : input.newPlan;
  const pendingCycle =
    input.newCycle && input.newCycle !== current.cycle ? input.newCycle : null;

  const row = await prisma.clubMembershipSubscription.update({
    where: { clubId: input.clubId },
    data: { pendingPlan, pendingCycle },
  });

  return toSnapshot(row);
}

/**
 * Resets a CANCELLED subscription back to a clean PENDING state so the
 * owner can start a brand-new checkout through the existing, unmodified
 * PENDING-based flow (`PlanSelectionModal` -> `POST /api/clubs/membership`),
 * exactly like a first-time signup. Triggered only by an explicit owner
 * action ("Renew membership" on `ClubInactiveCard`) — this is the single
 * narrow `CANCELLED -> PENDING` transition allowed in
 * `ALLOWED_MEMBERSHIP_TRANSITIONS` above; every other function in this file
 * still refuses to touch a CANCELLED row.
 *
 * This is a FULL reset, not a partial one: a cancelled subscription's old MP
 * identifiers (preapproval/preference/customer/card), trial dates, and
 * billing-period dates are all stale relative to a brand-new checkout
 * attempt. Leaving any of them in place risks the new checkout accidentally
 * reusing a dead MP object (e.g. a cancelled preapproval id) or a stale
 * trial-eligibility window computed against the previous subscription's
 * lifecycle. Nulling every one of them guarantees the next checkout behaves
 * identically to a club's very first one.
 *
 * Deliberately does NOT touch `Club.status` — it stays `INACTIVE` until a
 * real charge later confirms via the existing webhook path
 * (`lib/mercadopago/membershipWebhookHandlers.ts`), the same state a
 * first-time owner mid-checkout is already in.
 */
export async function reactivateCancelledSubscription(
  clubId: string,
): Promise<MembershipSubscriptionSnapshot> {
  const current = await requireSubscription(clubId);
  const currentStatus = current.status as MembershipStatusValue;

  if (currentStatus !== "CANCELLED") {
    throw new Error(
      `Cannot reactivate — subscription is ${currentStatus}, expected CANCELLED`,
    );
  }

  // Belt-and-suspenders documentation of intent, consistent with how every
  // other transition in this file is guarded — passes given
  // `ALLOWED_MEMBERSHIP_TRANSITIONS.CANCELLED` above, never actually thrown
  // given the explicit check right above it.
  assertMembershipTransition(currentStatus, "PENDING");

  const row = await prisma.clubMembershipSubscription.update({
    where: { clubId },
    data: {
      status: "PENDING",
      mpPreapprovalId: null,
      mpPreferenceId: null,
      mpCustomerId: null,
      mpCardId: null,
      trialEndsAt: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      pastDueSince: null,
      pastDueUntil: null,
      pendingPlan: null,
      pendingCycle: null,
      lastWebhookEventId: null,
    },
  });

  return toSnapshot(row);
}
