import { prisma } from "@/infrastructure/db/client";

export type MembershipSubscriptionStatus =
  "PENDING" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED";

export interface MembershipPaidCheckResult {
  ok: boolean;
  status: MembershipSubscriptionStatus | null;
}

/**
 * Pure predicate: a membership status counts as "paid" for gating purposes
 * (MP-connect gate, future UI reads) only when ACTIVE or TRIALING — an
 * authorized trial is treated the same as a paid one, since it already
 * requires an authorized payment method on file. See spec's "MP-Connect
 * Gated by Membership-Paid State".
 */
export function isMembershipStatusPaid(
  status: MembershipSubscriptionStatus | null,
): boolean {
  return status === "ACTIVE" || status === "TRIALING";
}

/**
 * Rollout safety switch (see design.md's "Migration / Rollout" decision):
 * membership gating is opt-in via `MEMBERSHIP_GATING_ENABLED`. Unset (or
 * any value other than the literal string `"true"`) keeps
 * `requireMembershipPaid` a no-op pass-through so the whole membership
 * feature can ship dark and be flipped on deliberately once verified in
 * production — and flipped back off instantly during an incident, with no
 * redeploy required.
 */
function isMembershipGatingEnabled(): boolean {
  return process.env.MEMBERSHIP_GATING_ENABLED === "true";
}

/**
 * Reads a club's current `ClubMembershipSubscription` state and resolves
 * whether it counts as "paid" for gating purposes. Analogous in spirit to
 * `operationalStatus.ts`'s `getClubOperationalStatus`, but for the club's
 * OWN membership payment to the platform, not its MP-connection. Consumed
 * by the MP-connect gate (a later batch) and the shared membership UI.
 *
 * The real status is always resolved and returned (informational), but
 * `ok` is forced to `true` unless `MEMBERSHIP_GATING_ENABLED` is explicitly
 * `"true"` — see `isMembershipGatingEnabled`.
 */
export async function requireMembershipPaid(
  clubId: string,
): Promise<MembershipPaidCheckResult> {
  const subscription = await prisma.clubMembershipSubscription.findUnique({
    where: { clubId },
    select: { status: true },
  });

  const status = (subscription?.status ??
    null) as MembershipSubscriptionStatus | null;

  if (!isMembershipGatingEnabled()) {
    return { ok: true, status };
  }

  return { ok: isMembershipStatusPaid(status), status };
}
