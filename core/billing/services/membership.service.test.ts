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
    },
  },
}));

import { prisma } from "@/infrastructure/db/client";
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
  findMembershipSubscriptionByPreapprovalId,
  attachPendingPreapproval,
  attachPendingPreference,
  getMembershipSubscription,
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
  ] as const)("allows %s -> %s", (from, to) => {
    expect(() => assertMembershipTransition(from, to)).not.toThrow();
  });

  it.each([
    ["CANCELLED", "ACTIVE"],
    ["CANCELLED", "TRIALING"],
    ["CANCELLED", "PAST_DUE"],
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

  it("CANCELLED is terminal — zero allowed outgoing transitions (a fresh subscription must be created instead)", () => {
    expect(ALLOWED_MEMBERSHIP_TRANSITIONS.CANCELLED).toEqual([]);
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
