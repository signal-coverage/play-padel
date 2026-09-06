import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    clubMembershipSubscription: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    club: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatch: vi.fn(),
}));

vi.mock("@/core/clubs/services/clubs.service", () => ({
  getClubOwner: vi.fn(),
}));

import { prisma } from "@/infrastructure/db/client";
import { dispatch } from "@/lib/notifications/dispatcher";
import { getClubOwner } from "@/core/clubs/services/clubs.service";
import {
  ALLOWED_MEMBERSHIP_TRANSITIONS,
  InvalidMembershipTransitionError,
  assertMembershipTransition,
  addOneCycle,
  resolveTrialEndsAt,
  createPendingMembershipSubscription,
  startTrial,
  recordSuccessfulCharge,
  recordFailedCharge,
  recordAutoCancellation,
  recordManualPeriodExpiredWithoutRenewal,
  recordManualLockout,
  requestPlanChange,
  changeTrialPlan,
  findMembershipSubscriptionByPreapprovalId,
  attachPendingPreapproval,
  attachPendingPreference,
  getMembershipSubscription,
  seedPendingMembershipSubscriptionFromClub,
  reactivateCancelledSubscription,
  saveMembershipPayerIdentification,
  activateFreePlan,
  ClubNotFoundError,
  RealSubscriptionExistsError,
} from "./membership.service";

const findUniqueMock = prisma.clubMembershipSubscription
  .findUnique as ReturnType<typeof vi.fn>;
const findFirstMock = prisma.clubMembershipSubscription.findFirst as ReturnType<
  typeof vi.fn
>;
const createMock = prisma.clubMembershipSubscription.create as ReturnType<
  typeof vi.fn
>;
const updateMock = prisma.clubMembershipSubscription.update as ReturnType<
  typeof vi.fn
>;
const clubUpdateMock = prisma.club.update as ReturnType<typeof vi.fn>;
const clubFindUniqueMock = prisma.club.findUnique as ReturnType<typeof vi.fn>;
const transactionMock = prisma.$transaction as ReturnType<typeof vi.fn>;
const dispatchMock = dispatch as ReturnType<typeof vi.fn>;
const getClubOwnerMock = getClubOwner as ReturnType<typeof vi.fn>;

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    clubId: "club_1",
    plan: "BASIC",
    pendingPlan: null,
    cycle: "MONTHLY",
    pendingCycle: null,
    renewalMode: "AUTO",
    status: "PENDING",
    currency: "ARS",
    mpPreapprovalId: null,
    mpPreferenceId: null,
    mpCustomerId: null,
    mpCardId: null,
    trialEndsAt: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    pastDueSince: null,
    pastDueUntil: null,
    lastWebhookEventId: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  findUniqueMock.mockReset();
  findFirstMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
  clubUpdateMock.mockReset();
  clubFindUniqueMock.mockReset();
  transactionMock.mockReset();
  dispatchMock.mockReset();
  getClubOwnerMock.mockReset();
  // Mirrors billing.service.test.ts's own `$transaction` mock convention:
  // the array form is just `Promise.all` over already-invoked mocked calls.
  transactionMock.mockImplementation((ops: Promise<unknown>[]) =>
    Promise.all(ops),
  );
  dispatchMock.mockResolvedValue(undefined);
  getClubOwnerMock.mockResolvedValue({
    id: "user_owner",
    displayName: "Owner Person",
    photoURL: null,
    email: "owner@example.com",
  });
});

describe("ALLOWED_MEMBERSHIP_TRANSITIONS / assertMembershipTransition (pure)", () => {
  it.each([
    ["PENDING", "TRIALING"],
    ["PENDING", "ACTIVE"],
    ["TRIALING", "ACTIVE"],
    ["ACTIVE", "PAST_DUE"],
    ["ACTIVE", "ACTIVE"],
    ["PAST_DUE", "ACTIVE"],
    ["PAST_DUE", "PAST_DUE"],
    ["PAST_DUE", "CANCELLED"],
    ["ACTIVE", "CANCELLED"],
    ["CANCELLED", "PENDING"],
  ] as const)("allows %s -> %s", (from, to) => {
    expect(() => assertMembershipTransition(from, to)).not.toThrow();
  });

  it.each([
    ["CANCELLED", "ACTIVE"],
    ["CANCELLED", "TRIALING"],
    ["CANCELLED", "PAST_DUE"],
    ["CANCELLED", "CANCELLED"],
    ["ACTIVE", "TRIALING"],
    ["ACTIVE", "PENDING"],
    ["PAST_DUE", "TRIALING"],
    ["PAST_DUE", "PENDING"],
    ["PENDING", "PAST_DUE"],
    ["PENDING", "CANCELLED"],
  ] as const)("rejects %s -> %s", (from, to) => {
    expect(() => assertMembershipTransition(from, to)).toThrow(
      InvalidMembershipTransitionError,
    );
  });

  it("CANCELLED allows exactly one outgoing transition — back to PENDING via an explicit owner-triggered reactivation, never straight back to a paid status", () => {
    expect(ALLOWED_MEMBERSHIP_TRANSITIONS.CANCELLED).toEqual(["PENDING"]);
  });
});

describe("addOneCycle (pure)", () => {
  it("adds one month for MONTHLY", () => {
    expect(addOneCycle(new Date("2026-01-15T00:00:00Z"), "MONTHLY")).toEqual(
      new Date("2026-02-15T00:00:00Z"),
    );
  });

  it("adds one year for ANNUAL", () => {
    expect(addOneCycle(new Date("2026-01-15T00:00:00Z"), "ANNUAL")).toEqual(
      new Date("2027-01-15T00:00:00Z"),
    );
  });
});

describe("resolveTrialEndsAt (pure)", () => {
  it("uses the admin override (expressed in days) when present", () => {
    expect(resolveTrialEndsAt(new Date("2026-01-01T00:00:00Z"), 10, 3)).toEqual(
      new Date("2026-01-11T00:00:00Z"),
    );
  });

  it("falls back to welcomeFreeMonths (expressed in months) when no override is set", () => {
    expect(
      resolveTrialEndsAt(new Date("2026-01-01T00:00:00Z"), null, 3),
    ).toEqual(new Date("2026-04-01T00:00:00Z"));
  });

  it("returns null when neither override nor fallback is set (e.g. MAX)", () => {
    expect(
      resolveTrialEndsAt(new Date("2026-01-01T00:00:00Z"), null, null),
    ).toBeNull();
  });
});

describe("createPendingMembershipSubscription", () => {
  it("creates a PENDING row with no MP object yet, defaulting cycle/renewalMode to MONTHLY/AUTO", async () => {
    createMock.mockResolvedValue(
      row({ status: "PENDING", plan: "PRO", currency: "ARS" }),
    );

    const result = await createPendingMembershipSubscription({
      clubId: "club_1",
      plan: "PRO",
      currency: "ARS",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        clubId: "club_1",
        plan: "PRO",
        cycle: "MONTHLY",
        renewalMode: "AUTO",
        currency: "ARS",
        status: "PENDING",
      },
    });
    expect(result.status).toBe("PENDING");
  });

  it("honors an explicit cycle/renewalMode when provided instead of the default", async () => {
    createMock.mockResolvedValue(
      row({
        status: "PENDING",
        plan: "BASIC",
        cycle: "ANNUAL",
        renewalMode: "MANUAL",
      }),
    );

    await createPendingMembershipSubscription({
      clubId: "club_1",
      plan: "BASIC",
      currency: "ARS",
      cycle: "ANNUAL",
      renewalMode: "MANUAL",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        clubId: "club_1",
        plan: "BASIC",
        cycle: "ANNUAL",
        renewalMode: "MANUAL",
        currency: "ARS",
        status: "PENDING",
      },
    });
  });
});

describe("startTrial", () => {
  it("creates a new row in TRIALING when none exists yet (PENDING is implicit)", async () => {
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue(
      row({
        status: "TRIALING",
        plan: "PRO",
        renewalMode: "AUTO",
        trialEndsAt: new Date("2026-04-01T00:00:00Z"),
      }),
    );

    const result = await startTrial({
      clubId: "club_1",
      plan: "PRO",
      cycle: "MONTHLY",
      renewalMode: "AUTO",
      currency: "ARS",
      fallbackWelcomeFreeMonths: 3,
      now: new Date("2026-01-01T00:00:00Z"),
    });

    expect(result.status).toBe("TRIALING");
    expect(result.trialEndsAt).toEqual(new Date("2026-04-01T00:00:00Z"));
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clubId: "club_1",
        plan: "PRO",
        cycle: "MONTHLY",
        renewalMode: "AUTO",
        currency: "ARS",
        status: "TRIALING",
        trialEndsAt: new Date("2026-04-01T00:00:00Z"),
      }),
    });
  });

  it("transitions an existing PENDING row (created by onboarding) to TRIALING", async () => {
    findUniqueMock.mockResolvedValue(row({ status: "PENDING" }));
    updateMock.mockResolvedValue(row({ status: "TRIALING" }));

    await startTrial({
      clubId: "club_1",
      plan: "BASIC",
      cycle: "MONTHLY",
      renewalMode: "MANUAL",
      currency: "ARS",
      fallbackWelcomeFreeMonths: 1,
      now: new Date("2026-01-01T00:00:00Z"),
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clubId: "club_1" } }),
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects starting a trial from ACTIVE", async () => {
    findUniqueMock.mockResolvedValue(row({ status: "ACTIVE" }));

    await expect(
      startTrial({
        clubId: "club_1",
        plan: "BASIC",
        cycle: "MONTHLY",
        renewalMode: "AUTO",
        currency: "ARS",
        fallbackWelcomeFreeMonths: 1,
      }),
    ).rejects.toThrow(InvalidMembershipTransitionError);
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects when the plan has no trial configured (e.g. MAX — no override, no welcomeFreeMonths)", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(
      startTrial({
        clubId: "club_1",
        plan: "MAX",
        cycle: "MONTHLY",
        renewalMode: "AUTO",
        currency: "ARS",
        fallbackWelcomeFreeMonths: null,
      }),
    ).rejects.toThrow(/no trial configured/i);
    expect(createMock).not.toHaveBeenCalled();
  });

  // Regression: reactivateCancelledSubscription resets a club back to
  // PENDING so it can start a trial exactly like a first-time signup — but
  // that club's Club.status is still INACTIVE from its earlier cancellation
  // (recordAutoCancellation/recordManualLockout are the only two writers of
  // Club.status, and both only ever set INACTIVE). Without this, a
  // reactivated club that reaches TRIALING (the synchronous, no-webhook
  // confirmation path for a trial-eligible plan) would stay locked behind
  // ClubOperationalGate forever, since getClubOperationalStatus gates on
  // Club.status === "ACTIVE", not on the subscription's own status.
  it("clears Club.status back to ACTIVE when a trial starts (undoes an earlier cancellation)", async () => {
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue(row({ status: "TRIALING" }));
    clubUpdateMock.mockResolvedValue({ id: "club_1", status: "ACTIVE" });

    await startTrial({
      clubId: "club_1",
      plan: "PRO",
      cycle: "MONTHLY",
      renewalMode: "AUTO",
      currency: "ARS",
      fallbackWelcomeFreeMonths: 3,
      now: new Date("2026-01-01T00:00:00Z"),
    });

    expect(clubUpdateMock).toHaveBeenCalledWith({
      where: { id: "club_1" },
      data: { status: "ACTIVE" },
    });
  });
});

describe("recordSuccessfulCharge", () => {
  it("activates a PENDING subscription on its first successful charge (no trial, e.g. ANNUAL)", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "PENDING", plan: "BASIC", cycle: "ANNUAL" }),
    );
    updateMock.mockResolvedValue(row({ status: "ACTIVE" }));

    await recordSuccessfulCharge({
      clubId: "club_1",
      chargedAt: new Date("2026-01-01T00:00:00Z"),
      webhookEventId: "evt_1",
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
      data: expect.objectContaining({
        status: "ACTIVE",
        plan: "BASIC",
        cycle: "ANNUAL",
        pendingPlan: null,
        pendingCycle: null,
        currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
        currentPeriodEnd: new Date("2027-01-01T00:00:00Z"),
        pastDueSince: null,
        pastDueUntil: null,
        lastWebhookEventId: "evt_1",
      }),
    });
  });

  it("activates a TRIALING subscription once the first real charge succeeds after the trial", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "TRIALING", cycle: "MONTHLY" }),
    );
    updateMock.mockResolvedValue(row({ status: "ACTIVE" }));

    await recordSuccessfulCharge({
      clubId: "club_1",
      chargedAt: new Date("2026-02-01T00:00:00Z"),
      webhookEventId: "evt_2",
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ACTIVE",
          currentPeriodEnd: new Date("2026-03-01T00:00:00Z"),
        }),
      }),
    );
  });

  it("recovers a PAST_DUE subscription back to ACTIVE on a late successful payment", async () => {
    findUniqueMock.mockResolvedValue(
      row({
        status: "PAST_DUE",
        pastDueSince: new Date("2026-01-05T00:00:00Z"),
        pastDueUntil: new Date("2026-01-20T00:00:00Z"),
      }),
    );
    updateMock.mockResolvedValue(row({ status: "ACTIVE" }));

    await recordSuccessfulCharge({
      clubId: "club_1",
      chargedAt: new Date("2026-01-10T00:00:00Z"),
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ACTIVE",
          pastDueSince: null,
          pastDueUntil: null,
        }),
      }),
    );
  });

  it("applies a pendingPlan change at the renewal boundary — no proration", async () => {
    findUniqueMock.mockResolvedValue(
      row({
        status: "ACTIVE",
        plan: "BASIC",
        cycle: "MONTHLY",
        pendingPlan: "PRO",
        pendingCycle: null,
      }),
    );
    updateMock.mockResolvedValue(row({ status: "ACTIVE", plan: "PRO" }));

    await recordSuccessfulCharge({
      clubId: "club_1",
      chargedAt: new Date("2026-02-01T00:00:00Z"),
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ plan: "PRO", pendingPlan: null }),
      }),
    );
  });

  it("is idempotent — replaying the same webhookEventId is a no-op", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "ACTIVE", lastWebhookEventId: "evt_dup" }),
    );

    const result = await recordSuccessfulCharge({
      clubId: "club_1",
      chargedAt: new Date("2026-03-01T00:00:00Z"),
      webhookEventId: "evt_dup",
    });

    expect(updateMock).not.toHaveBeenCalled();
    expect(result.status).toBe("ACTIVE");
  });

  it("rejects recording a charge for a CANCELLED subscription (must create a fresh one instead)", async () => {
    findUniqueMock.mockResolvedValue(row({ status: "CANCELLED" }));

    await expect(
      recordSuccessfulCharge({ clubId: "club_1", chargedAt: new Date() }),
    ).rejects.toThrow(InvalidMembershipTransitionError);
  });

  it("throws when no subscription row exists for the club", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(
      recordSuccessfulCharge({ clubId: "club_404", chargedAt: new Date() }),
    ).rejects.toThrow(/no membership subscription/i);
  });

  // Regression, same reasoning as startTrial's own test above: a reactivated
  // club's first real charge (e.g. a non-trial ANNUAL plan, or the eventual
  // real charge after a reactivated trial ends) must also clear whatever
  // earlier cancellation left Club.status at INACTIVE — recordAutoCancellation/
  // recordManualLockout are the only other writers of this field, and both
  // only ever set INACTIVE, so nothing else ever undoes it.
  it("clears Club.status back to ACTIVE on a successful charge (undoes an earlier cancellation)", async () => {
    findUniqueMock.mockResolvedValue(row({ status: "PENDING" }));
    updateMock.mockResolvedValue(row({ status: "ACTIVE" }));
    clubUpdateMock.mockResolvedValue({ id: "club_1", status: "ACTIVE" });

    await recordSuccessfulCharge({
      clubId: "club_1",
      chargedAt: new Date("2026-01-01T00:00:00Z"),
    });

    expect(clubUpdateMock).toHaveBeenCalledWith({
      where: { id: "club_1" },
      data: { status: "ACTIVE" },
    });
  });

  it("does not touch Club.status when the charge is a no-op replay", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "ACTIVE", lastWebhookEventId: "evt_dup" }),
    );

    await recordSuccessfulCharge({
      clubId: "club_1",
      chargedAt: new Date("2026-03-01T00:00:00Z"),
      webhookEventId: "evt_dup",
    });

    expect(clubUpdateMock).not.toHaveBeenCalled();
  });

  // Regression for the atomicity bug: previously these were two separate,
  // unwrapped writes — if the subscription update committed and the
  // Club.status update then threw, this function's own webhookEventId
  // idempotency guard above would permanently short-circuit any retry
  // before the missing Club.status write could ever be re-attempted,
  // leaving Club.status stuck stale forever. Wrapping both in one
  // $transaction guarantees they land together or not at all.
  it("wraps the subscription update and the Club.status sync in a single $transaction", async () => {
    findUniqueMock.mockResolvedValue(row({ status: "PENDING" }));
    updateMock.mockResolvedValue(row({ status: "ACTIVE" }));
    clubUpdateMock.mockResolvedValue({ id: "club_1", status: "ACTIVE" });

    await recordSuccessfulCharge({
      clubId: "club_1",
      chargedAt: new Date("2026-01-01T00:00:00Z"),
    });

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(transactionMock.mock.calls[0][0]).toHaveLength(2);
    // Both mocked calls must have been invoked to build the transaction's
    // operations array, and the update must have happened BEFORE
    // $transaction resolved (i.e. it isn't run separately afterwards).
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(clubUpdateMock).toHaveBeenCalledTimes(1);
  });
});

describe("recordFailedCharge (AUTO recycling signal)", () => {
  it("moves ACTIVE to PAST_DUE on the first failed/recycling installment", async () => {
    findUniqueMock.mockResolvedValue(row({ status: "ACTIVE" }));
    updateMock.mockResolvedValue(row({ status: "PAST_DUE" }));

    await recordFailedCharge({
      clubId: "club_1",
      failedAt: new Date("2026-01-05T00:00:00Z"),
      webhookEventId: "evt_fail_1",
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
      data: expect.objectContaining({
        status: "PAST_DUE",
        pastDueSince: new Date("2026-01-05T00:00:00Z"),
        lastWebhookEventId: "evt_fail_1",
      }),
    });
  });

  it("does not reset pastDueSince on a second recycling retry within MP's own dunning window", async () => {
    findUniqueMock.mockResolvedValue(
      row({
        status: "PAST_DUE",
        pastDueSince: new Date("2026-01-05T00:00:00Z"),
      }),
    );
    updateMock.mockResolvedValue(row({ status: "PAST_DUE" }));

    await recordFailedCharge({
      clubId: "club_1",
      failedAt: new Date("2026-01-08T00:00:00Z"),
      webhookEventId: "evt_fail_2",
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pastDueSince: new Date("2026-01-05T00:00:00Z"),
        }),
      }),
    );
  });

  it("is idempotent on webhookEventId replay", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "PAST_DUE", lastWebhookEventId: "evt_dup" }),
    );

    await recordFailedCharge({
      clubId: "club_1",
      failedAt: new Date(),
      webhookEventId: "evt_dup",
    });

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a failed-charge signal for a PENDING subscription (no charge attempt should exist yet)", async () => {
    findUniqueMock.mockResolvedValue(row({ status: "PENDING" }));

    await expect(
      recordFailedCharge({ clubId: "club_1", failedAt: new Date() }),
    ).rejects.toThrow(InvalidMembershipTransitionError);
  });

  it("dispatches a MEMBERSHIP_PAST_DUE notification to the owner on the first ACTIVE -> PAST_DUE transition", async () => {
    findUniqueMock.mockResolvedValue(row({ status: "ACTIVE" }));
    updateMock.mockResolvedValue(row({ status: "PAST_DUE" }));

    await recordFailedCharge({
      clubId: "club_1",
      failedAt: new Date("2026-01-05T00:00:00Z"),
      webhookEventId: "evt_fail_1",
    });

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "MEMBERSHIP_PAST_DUE",
        clubId: "club_1",
        recipientId: "user_owner",
        recipientEmail: "owner@example.com",
        recipientName: "Owner Person",
        sendEmail: false,
      }),
    );
  });

  it("does not dispatch again on a second recycling retry while already PAST_DUE (idempotent)", async () => {
    findUniqueMock.mockResolvedValue(
      row({
        status: "PAST_DUE",
        pastDueSince: new Date("2026-01-05T00:00:00Z"),
      }),
    );
    updateMock.mockResolvedValue(row({ status: "PAST_DUE" }));

    await recordFailedCharge({
      clubId: "club_1",
      failedAt: new Date("2026-01-08T00:00:00Z"),
      webhookEventId: "evt_fail_2",
    });

    expect(dispatchMock).not.toHaveBeenCalled();
  });
});

describe("recordAutoCancellation (AUTO: MP auto-cancelled after 3 rejections)", () => {
  it("moves PAST_DUE to CANCELLED and syncs Club.status to INACTIVE", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "PAST_DUE", clubId: "club_1" }),
    );
    updateMock.mockResolvedValue(row({ status: "CANCELLED" }));
    clubUpdateMock.mockResolvedValue({ id: "club_1", status: "INACTIVE" });

    await recordAutoCancellation({
      clubId: "club_1",
      cancelledAt: new Date("2026-01-20T00:00:00Z"),
      webhookEventId: "evt_cancel_1",
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CANCELLED" }),
      }),
    );
    expect(clubUpdateMock).toHaveBeenCalledWith({
      where: { id: "club_1" },
      data: { status: "INACTIVE" },
    });
  });

  it("rejects cancelling a subscription that is not ACTIVE or PAST_DUE", async () => {
    findUniqueMock.mockResolvedValue(row({ status: "CANCELLED" }));

    await expect(
      recordAutoCancellation({ clubId: "club_1", cancelledAt: new Date() }),
    ).rejects.toThrow(InvalidMembershipTransitionError);
    expect(clubUpdateMock).not.toHaveBeenCalled();
  });

  it("is idempotent on webhookEventId replay and does not re-sync Club.status", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "CANCELLED", lastWebhookEventId: "evt_dup" }),
    );

    await recordAutoCancellation({
      clubId: "club_1",
      cancelledAt: new Date(),
      webhookEventId: "evt_dup",
    });

    expect(updateMock).not.toHaveBeenCalled();
    expect(clubUpdateMock).not.toHaveBeenCalled();
  });

  // Same atomicity regression as recordSuccessfulCharge above: without a
  // shared $transaction, a failure between the two writes would leave
  // Club.status permanently stale behind this function's own
  // webhookEventId idempotency guard.
  it("wraps the subscription update and the Club.status sync in a single $transaction", async () => {
    findUniqueMock.mockResolvedValue(row({ status: "PAST_DUE" }));
    updateMock.mockResolvedValue(row({ status: "CANCELLED" }));
    clubUpdateMock.mockResolvedValue({ id: "club_1", status: "INACTIVE" });

    await recordAutoCancellation({
      clubId: "club_1",
      cancelledAt: new Date("2026-01-20T00:00:00Z"),
    });

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(transactionMock.mock.calls[0][0]).toHaveLength(2);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(clubUpdateMock).toHaveBeenCalledTimes(1);
  });
});

describe("recordManualPeriodExpiredWithoutRenewal (MANUAL grace-period entry, cron-driven)", () => {
  it("moves an ACTIVE MANUAL subscription to PAST_DUE with an authoritative pastDueUntil deadline", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "ACTIVE", renewalMode: "MANUAL" }),
    );
    updateMock.mockResolvedValue(row({ status: "PAST_DUE" }));

    await recordManualPeriodExpiredWithoutRenewal({
      clubId: "club_1",
      now: new Date("2026-01-10T00:00:00Z"),
      graceWindowDays: 7,
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
      data: expect.objectContaining({
        status: "PAST_DUE",
        pastDueSince: new Date("2026-01-10T00:00:00Z"),
        pastDueUntil: new Date("2026-01-17T00:00:00Z"),
      }),
    });
  });

  it("dispatches a MEMBERSHIP_PAST_DUE notification to the owner on the transition", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "ACTIVE", renewalMode: "MANUAL" }),
    );
    updateMock.mockResolvedValue(row({ status: "PAST_DUE" }));

    await recordManualPeriodExpiredWithoutRenewal({
      clubId: "club_1",
      now: new Date("2026-01-10T00:00:00Z"),
      graceWindowDays: 7,
    });

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "MEMBERSHIP_PAST_DUE",
        clubId: "club_1",
        recipientId: "user_owner",
        recipientEmail: "owner@example.com",
        recipientName: "Owner Person",
        sendEmail: false,
      }),
    );
  });

  it("is idempotent — an already-PAST_DUE MANUAL subscription is left unchanged", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "PAST_DUE", renewalMode: "MANUAL" }),
    );

    await recordManualPeriodExpiredWithoutRenewal({
      clubId: "club_1",
      now: new Date(),
      graceWindowDays: 7,
    });

    expect(updateMock).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it("rejects AUTO-mode subscriptions — AUTO has no app-side grace-window clock", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "ACTIVE", renewalMode: "AUTO" }),
    );

    await expect(
      recordManualPeriodExpiredWithoutRenewal({
        clubId: "club_1",
        now: new Date(),
        graceWindowDays: 7,
      }),
    ).rejects.toThrow(/MANUAL/i);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("recordManualLockout (MANUAL's sole/authoritative lockout trigger, cron-driven)", () => {
  it("moves PAST_DUE to CANCELLED once the grace deadline has passed and syncs Club.status", async () => {
    findUniqueMock.mockResolvedValue(
      row({
        status: "PAST_DUE",
        renewalMode: "MANUAL",
        pastDueUntil: new Date("2026-01-17T00:00:00Z"),
      }),
    );
    updateMock.mockResolvedValue(row({ status: "CANCELLED" }));
    clubUpdateMock.mockResolvedValue({ id: "club_1", status: "INACTIVE" });

    await recordManualLockout({
      clubId: "club_1",
      now: new Date("2026-01-18T00:00:00Z"),
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CANCELLED" }),
      }),
    );
    expect(clubUpdateMock).toHaveBeenCalledWith({
      where: { id: "club_1" },
      data: { status: "INACTIVE" },
    });
  });

  it("rejects locking out before the pastDueUntil deadline has actually passed", async () => {
    findUniqueMock.mockResolvedValue(
      row({
        status: "PAST_DUE",
        renewalMode: "MANUAL",
        pastDueUntil: new Date("2026-01-17T00:00:00Z"),
      }),
    );

    await expect(
      recordManualLockout({
        clubId: "club_1",
        now: new Date("2026-01-16T00:00:00Z"),
      }),
    ).rejects.toThrow(/deadline/i);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects locking out a subscription that is not PAST_DUE (e.g. still ACTIVE)", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "ACTIVE", renewalMode: "MANUAL" }),
    );

    await expect(
      recordManualLockout({ clubId: "club_1", now: new Date() }),
    ).rejects.toThrow(InvalidMembershipTransitionError);
  });

  it("is idempotent — an already-CANCELLED subscription is left unchanged", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "CANCELLED", renewalMode: "MANUAL" }),
    );

    await recordManualLockout({ clubId: "club_1", now: new Date() });

    expect(updateMock).not.toHaveBeenCalled();
    expect(clubUpdateMock).not.toHaveBeenCalled();
  });

  // Same atomicity regression as recordSuccessfulCharge/
  // recordAutoCancellation above.
  it("wraps the subscription update and the Club.status sync in a single $transaction", async () => {
    findUniqueMock.mockResolvedValue(
      row({
        status: "PAST_DUE",
        renewalMode: "MANUAL",
        pastDueUntil: new Date("2026-01-17T00:00:00Z"),
      }),
    );
    updateMock.mockResolvedValue(row({ status: "CANCELLED" }));
    clubUpdateMock.mockResolvedValue({ id: "club_1", status: "INACTIVE" });

    await recordManualLockout({
      clubId: "club_1",
      now: new Date("2026-01-18T00:00:00Z"),
    });

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(transactionMock.mock.calls[0][0]).toHaveLength(2);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(clubUpdateMock).toHaveBeenCalledTimes(1);
  });
});

describe("saveMembershipPayerIdentification", () => {
  it("persists the confirmed identification type/number and returns the updated snapshot", async () => {
    updateMock.mockResolvedValue(
      row({
        payerIdentificationType: "CUIT",
        payerIdentificationNumber: "30-12345678-9",
      }),
    );

    const result = await saveMembershipPayerIdentification("club_1", {
      type: "CUIT",
      number: "30-12345678-9",
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
      data: {
        payerIdentificationType: "CUIT",
        payerIdentificationNumber: "30-12345678-9",
      },
    });
    expect(result.payerIdentificationType).toBe("CUIT");
    expect(result.payerIdentificationNumber).toBe("30-12345678-9");
  });
});

describe("requestPlanChange (mid-cycle, no proration — takes effect at next renewal boundary)", () => {
  it("sets pendingPlan on an ACTIVE subscription without changing the current plan immediately", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "ACTIVE", plan: "BASIC", cycle: "MONTHLY" }),
    );
    updateMock.mockResolvedValue(
      row({ status: "ACTIVE", plan: "BASIC", pendingPlan: "PRO" }),
    );

    const result = await requestPlanChange({
      clubId: "club_1",
      newPlan: "PRO",
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
      data: { pendingPlan: "PRO", pendingCycle: null },
    });
    expect(result.plan).toBe("BASIC");
  });

  it("sets pendingCycle when the owner also changes the billing cycle", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "ACTIVE", plan: "BASIC", cycle: "MONTHLY" }),
    );
    updateMock.mockResolvedValue(row({ status: "ACTIVE" }));

    await requestPlanChange({
      clubId: "club_1",
      newPlan: "PRO",
      newCycle: "ANNUAL",
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
      data: { pendingPlan: "PRO", pendingCycle: "ANNUAL" },
    });
  });

  it("clears a previously pending change when the owner picks the plan/cycle they already have", async () => {
    findUniqueMock.mockResolvedValue(
      row({
        status: "ACTIVE",
        plan: "PRO",
        cycle: "MONTHLY",
        pendingPlan: "PLUS",
        pendingCycle: "ANNUAL",
      }),
    );
    updateMock.mockResolvedValue(row({ status: "ACTIVE" }));

    await requestPlanChange({
      clubId: "club_1",
      newPlan: "PRO",
      newCycle: "MONTHLY",
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
      data: { pendingPlan: null, pendingCycle: null },
    });
  });

  it("rejects requesting a plan change on a non-ACTIVE subscription", async () => {
    findUniqueMock.mockResolvedValue(row({ status: "TRIALING" }));

    await expect(
      requestPlanChange({ clubId: "club_1", newPlan: "PRO" }),
    ).rejects.toThrow(/ACTIVE/i);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("changeTrialPlan (immediate, TRIALING only — no proration since nothing has been charged yet on either cycle)", () => {
  it("updates plan immediately when status is TRIALING", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "TRIALING", plan: "BASIC" }),
    );
    updateMock.mockResolvedValue(row({ status: "TRIALING", plan: "PRO" }));

    const result = await changeTrialPlan({
      clubId: "club_1",
      newPlan: "PRO",
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
      data: { plan: "PRO" },
    });
    expect(result.plan).toBe("PRO");
  });

  it.each(["PENDING", "ACTIVE", "PAST_DUE", "CANCELLED"] as const)(
    "throws when status is %s (immediate plan change only applies while TRIALING)",
    async (status) => {
      findUniqueMock.mockResolvedValue(row({ status }));

      await expect(
        changeTrialPlan({ clubId: "club_1", newPlan: "PRO" }),
      ).rejects.toThrow(/TRIALING/);
      expect(updateMock).not.toHaveBeenCalled();
    },
  );
});

describe("findMembershipSubscriptionByPreapprovalId (webhook club resolution)", () => {
  it("returns the owning clubId for a known mpPreapprovalId", async () => {
    findFirstMock.mockResolvedValue({ clubId: "club_7" });

    const result = await findMembershipSubscriptionByPreapprovalId("preap_1");

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { mpPreapprovalId: "preap_1" },
      select: { clubId: true },
    });
    expect(result).toEqual({ clubId: "club_7" });
  });

  it("returns null when no subscription references the given preapprovalId", async () => {
    findFirstMock.mockResolvedValue(null);

    const result =
      await findMembershipSubscriptionByPreapprovalId("preap_unknown");

    expect(result).toBeNull();
  });
});

describe("attachPendingPreapproval (MONTHLY checkout — no trial configured)", () => {
  it("stores the created preapproval id on a PENDING subscription without advancing status", async () => {
    findUniqueMock.mockResolvedValue(row({ status: "PENDING" }));
    updateMock.mockResolvedValue(
      row({ status: "PENDING", mpPreapprovalId: "preap_99" }),
    );

    const result = await attachPendingPreapproval({
      clubId: "club_1",
      plan: "PRO",
      cycle: "MONTHLY",
      renewalMode: "AUTO",
      currency: "ARS",
      mpPreapprovalId: "preap_99",
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
      data: {
        plan: "PRO",
        cycle: "MONTHLY",
        renewalMode: "AUTO",
        currency: "ARS",
        mpPreapprovalId: "preap_99",
      },
    });
    expect(result.status).toBe("PENDING");
  });

  it("rejects attaching a fresh preapproval when the subscription is not PENDING", async () => {
    findUniqueMock.mockResolvedValue(row({ status: "ACTIVE" }));

    await expect(
      attachPendingPreapproval({
        clubId: "club_1",
        plan: "PRO",
        cycle: "MONTHLY",
        renewalMode: "AUTO",
        currency: "ARS",
        mpPreapprovalId: "preap_99",
      }),
    ).rejects.toThrow(/PENDING/);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("attachPendingPreference (ANNUAL checkout)", () => {
  it("stores the created preference id on a PENDING subscription without advancing status", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "PENDING", cycle: "ANNUAL" }),
    );
    updateMock.mockResolvedValue(
      row({ status: "PENDING", cycle: "ANNUAL", mpPreferenceId: "pref_1" }),
    );

    const result = await attachPendingPreference({
      clubId: "club_1",
      plan: "PLUS",
      currency: "ARS",
      mpPreferenceId: "pref_1",
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
      data: {
        plan: "PLUS",
        cycle: "ANNUAL",
        renewalMode: "AUTO",
        currency: "ARS",
        mpPreferenceId: "pref_1",
      },
    });
    expect(result.status).toBe("PENDING");
  });

  it("rejects attaching a fresh preference when the subscription is not PENDING", async () => {
    findUniqueMock.mockResolvedValue(row({ status: "PAST_DUE" }));

    await expect(
      attachPendingPreference({
        clubId: "club_1",
        plan: "PLUS",
        currency: "ARS",
        mpPreferenceId: "pref_1",
      }),
    ).rejects.toThrow(/PENDING/);
    expect(updateMock).not.toHaveBeenCalled();
  });

  // "Pay now" follow-up fix: an ANNUAL trial starts with no MP object at
  // all (see `startTrial`'s ANNUAL caller), so this is the only path that
  // ever lets it reach ACTIVE before the cron sweep cancels it at
  // `trialEndsAt`.
  it("allows attaching a preference to a TRIALING ANNUAL subscription (pay now during trial) without advancing status", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "TRIALING", cycle: "ANNUAL", trialEndsAt: new Date() }),
    );
    updateMock.mockResolvedValue(
      row({
        status: "TRIALING",
        cycle: "ANNUAL",
        mpPreferenceId: "pref_paynow_1",
      }),
    );

    const result = await attachPendingPreference({
      clubId: "club_1",
      plan: "PLUS",
      currency: "ARS",
      mpPreferenceId: "pref_paynow_1",
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
      data: {
        plan: "PLUS",
        cycle: "ANNUAL",
        renewalMode: "AUTO",
        currency: "ARS",
        mpPreferenceId: "pref_paynow_1",
      },
    });
    expect(result.status).toBe("TRIALING");
  });

  it("rejects attaching a preference to a TRIALING MONTHLY subscription (pay-now exception only applies to ANNUAL)", async () => {
    findUniqueMock.mockResolvedValue(
      row({ status: "TRIALING", cycle: "MONTHLY" }),
    );

    await expect(
      attachPendingPreference({
        clubId: "club_1",
        plan: "PLUS",
        currency: "ARS",
        mpPreferenceId: "pref_1",
      }),
    ).rejects.toThrow(/PENDING/);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe("getMembershipSubscription (read for GET /api/clubs/membership)", () => {
  it("returns the subscription snapshot for a club that has one", async () => {
    findUniqueMock.mockResolvedValue(row({ status: "ACTIVE", plan: "PRO" }));

    const result = await getMembershipSubscription("club_1");

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
    });
    expect(result?.status).toBe("ACTIVE");
    expect(result?.plan).toBe("PRO");
  });

  it("returns null when the club has no membership subscription yet", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await getMembershipSubscription("club_missing");

    expect(result).toBeNull();
  });
});

describe("seedPendingMembershipSubscriptionFromClub (lazy-create fallback, shared by GET and POST /api/clubs/membership)", () => {
  it("resolves both plan and currency from Club when neither is provided (GET's use case — no request body to read them from)", async () => {
    clubFindUniqueMock.mockResolvedValue({ plan: "PRO", currency: "USD" });
    createMock.mockResolvedValue(
      row({ status: "PENDING", plan: "PRO", currency: "USD" }),
    );

    const result = await seedPendingMembershipSubscriptionFromClub({
      clubId: "club_1",
    });

    expect(clubFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "club_1" },
      select: { plan: true, currency: true },
    });
    expect(createMock).toHaveBeenCalledWith({
      data: {
        clubId: "club_1",
        plan: "PRO",
        cycle: "MONTHLY",
        renewalMode: "AUTO",
        currency: "USD",
        status: "PENDING",
      },
    });
    expect(result.status).toBe("PENDING");
  });

  it("only queries Club.currency when plan is already known (POST's use case — plan comes from the request body)", async () => {
    clubFindUniqueMock.mockResolvedValue({ currency: "ARS" });
    createMock.mockResolvedValue(
      row({ status: "PENDING", plan: "PRO", currency: "ARS", cycle: "ANNUAL" }),
    );

    await seedPendingMembershipSubscriptionFromClub({
      clubId: "club_1",
      plan: "PRO",
      cycle: "ANNUAL",
      renewalMode: "AUTO",
    });

    expect(clubFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "club_1" },
      select: { currency: true },
    });
    expect(createMock).toHaveBeenCalledWith({
      data: {
        clubId: "club_1",
        plan: "PRO",
        cycle: "ANNUAL",
        renewalMode: "AUTO",
        currency: "ARS",
        status: "PENDING",
      },
    });
  });

  it("does not query Club at all when both plan and currency are already provided", async () => {
    createMock.mockResolvedValue(
      row({ status: "PENDING", plan: "BASIC", currency: "ARS" }),
    );

    await seedPendingMembershipSubscriptionFromClub({
      clubId: "club_1",
      plan: "BASIC",
      currency: "ARS",
    });

    expect(clubFindUniqueMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledWith({
      data: {
        clubId: "club_1",
        plan: "BASIC",
        cycle: "MONTHLY",
        renewalMode: "AUTO",
        currency: "ARS",
        status: "PENDING",
      },
    });
  });

  it("falls back to BASIC/ARS defaults if the Club row is somehow missing", async () => {
    clubFindUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue(
      row({ status: "PENDING", plan: "BASIC", currency: "ARS" }),
    );

    await seedPendingMembershipSubscriptionFromClub({ clubId: "club_ghost" });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        clubId: "club_ghost",
        plan: "BASIC",
        cycle: "MONTHLY",
        renewalMode: "AUTO",
        currency: "ARS",
        status: "PENDING",
      },
    });
  });
});

describe("reactivateCancelledSubscription (owner-triggered renewal — CANCELLED -> PENDING reset)", () => {
  it("resets a CANCELLED row to a clean PENDING state, nulling every stale MP/trial/period field", async () => {
    findUniqueMock.mockResolvedValue(
      row({
        status: "CANCELLED",
        mpPreapprovalId: "preap_old",
        mpPreferenceId: "pref_old",
        mpCustomerId: "cust_old",
        mpCardId: "card_old",
        trialEndsAt: new Date("2026-01-01T00:00:00Z"),
        currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
        currentPeriodEnd: new Date("2026-02-01T00:00:00Z"),
        pastDueSince: new Date("2026-01-05T00:00:00Z"),
        pastDueUntil: new Date("2026-01-20T00:00:00Z"),
        pendingPlan: "PRO",
        pendingCycle: "ANNUAL",
        lastWebhookEventId: "evt_old",
      }),
    );
    updateMock.mockResolvedValue(row({ status: "PENDING" }));

    const result = await reactivateCancelledSubscription("club_1");

    expect(updateMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
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
    expect(result.status).toBe("PENDING");
  });

  it.each(["PENDING", "TRIALING", "ACTIVE", "PAST_DUE"] as const)(
    "throws when called on a %s subscription (only a CANCELLED one can be reactivated)",
    async (status) => {
      findUniqueMock.mockResolvedValue(row({ status }));

      await expect(reactivateCancelledSubscription("club_1")).rejects.toThrow(
        `Cannot reactivate — subscription is ${status}, expected CANCELLED`,
      );
      expect(updateMock).not.toHaveBeenCalled();
    },
  );

  it("throws when no subscription row exists for the club", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(reactivateCancelledSubscription("club_404")).rejects.toThrow(
      /no membership subscription/i,
    );
  });
});

describe("activateFreePlan (admin-only override — unblocks ClubOperationalGate for internal testing)", () => {
  it("throws ClubNotFoundError when the club doesn't exist", async () => {
    clubFindUniqueMock.mockResolvedValue(null);

    await expect(activateFreePlan({ clubId: "club_ghost" })).rejects.toThrow(
      ClubNotFoundError,
    );
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("creates a fresh ACTIVE/FREE subscription when none exists yet", async () => {
    clubFindUniqueMock.mockResolvedValue({ currency: "ARS" });
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue(
      row({
        plan: "FREE",
        cycle: "ANNUAL",
        renewalMode: "MANUAL",
        status: "ACTIVE",
        currency: "ARS",
      }),
    );
    clubUpdateMock.mockResolvedValue({ id: "club_1", status: "ACTIVE" });

    const result = await activateFreePlan({
      clubId: "club_1",
      now: new Date("2026-01-01T00:00:00Z"),
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        clubId: "club_1",
        plan: "FREE",
        cycle: "ANNUAL",
        renewalMode: "MANUAL",
        status: "ACTIVE",
        currency: "ARS",
        currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
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
      },
    });
    expect(updateMock).not.toHaveBeenCalled();
    expect(result.status).toBe("ACTIVE");
    expect(result.plan).toBe("FREE");
  });

  it("updates an existing non-paid subscription in place instead of creating a new row", async () => {
    clubFindUniqueMock.mockResolvedValue({ currency: "USD" });
    findUniqueMock.mockResolvedValue(row({ status: "PENDING", plan: "BASIC" }));
    updateMock.mockResolvedValue(
      row({
        plan: "FREE",
        cycle: "ANNUAL",
        renewalMode: "MANUAL",
        status: "ACTIVE",
        currency: "USD",
      }),
    );
    clubUpdateMock.mockResolvedValue({ id: "club_1", status: "ACTIVE" });

    await activateFreePlan({
      clubId: "club_1",
      now: new Date("2026-01-01T00:00:00Z"),
    });

    expect(updateMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
      data: {
        plan: "FREE",
        cycle: "ANNUAL",
        renewalMode: "MANUAL",
        status: "ACTIVE",
        currency: "USD",
        currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
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
      },
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("refuses to overwrite a subscription with a real mpPreapprovalId when force is not passed", async () => {
    clubFindUniqueMock.mockResolvedValue({ currency: "ARS" });
    findUniqueMock.mockResolvedValue(
      row({ status: "ACTIVE", plan: "PRO", mpPreapprovalId: "preap_real" }),
    );

    await expect(activateFreePlan({ clubId: "club_1" })).rejects.toThrow(
      RealSubscriptionExistsError,
    );
    expect(updateMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(clubUpdateMock).not.toHaveBeenCalled();
  });

  it("refuses to overwrite a subscription with a real mpPreferenceId when force is not passed", async () => {
    clubFindUniqueMock.mockResolvedValue({ currency: "ARS" });
    findUniqueMock.mockResolvedValue(
      row({ status: "ACTIVE", plan: "PRO", mpPreferenceId: "pref_real" }),
    );

    await expect(activateFreePlan({ clubId: "club_1" })).rejects.toThrow(
      RealSubscriptionExistsError,
    );
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("succeeds despite an existing real mpPreapprovalId when force is true", async () => {
    clubFindUniqueMock.mockResolvedValue({ currency: "ARS" });
    findUniqueMock.mockResolvedValue(
      row({ status: "ACTIVE", plan: "PRO", mpPreapprovalId: "preap_real" }),
    );
    updateMock.mockResolvedValue(row({ plan: "FREE", status: "ACTIVE" }));
    clubUpdateMock.mockResolvedValue({ id: "club_1", status: "ACTIVE" });

    const result = await activateFreePlan({ clubId: "club_1", force: true });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clubId: "club_1" },
        data: expect.objectContaining({ plan: "FREE", mpPreapprovalId: null }),
      }),
    );
    expect(result.plan).toBe("FREE");
  });

  it("sets Club.status = ACTIVE and Club.approvalStatus = APPROVED as a side effect", async () => {
    clubFindUniqueMock.mockResolvedValue({ currency: "ARS" });
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue(row({ plan: "FREE", status: "ACTIVE" }));
    clubUpdateMock.mockResolvedValue({
      id: "club_1",
      status: "ACTIVE",
      approvalStatus: "APPROVED",
    });

    await activateFreePlan({ clubId: "club_1" });

    // Otherwise this hidden FREE-plan testing bypass would silently break
    // once the admin approval gate ships: a FREE-plan test club would still
    // get stuck on the new PENDING_APPROVAL screen (see
    // lib/mercadopago/operationalStatus.ts) despite its subscription being
    // fully confirmed.
    expect(clubUpdateMock).toHaveBeenCalledWith({
      where: { id: "club_1" },
      data: { status: "ACTIVE", approvalStatus: "APPROVED" },
    });
  });
});
