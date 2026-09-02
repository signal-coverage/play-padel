import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    clubMembershipSubscription: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/mercadopago/membershipPreapprovals", () => ({
  getMembershipPreapproval: vi.fn(),
}));

vi.mock("@/core/billing/services/membership.service", () => ({
  recordAutoCancellation: vi.fn(),
  recordSuccessfulCharge: vi.fn(),
  recordManualPeriodExpiredWithoutRenewal: vi.fn(),
  recordManualLockout: vi.fn(),
}));

import { prisma } from "@/infrastructure/db/client";
import { getMembershipPreapproval } from "@/lib/mercadopago/membershipPreapprovals";
import {
  recordAutoCancellation,
  recordSuccessfulCharge,
  recordManualPeriodExpiredWithoutRenewal,
  recordManualLockout,
} from "@/core/billing/services/membership.service";
import {
  GET,
  AUTO_BACKSTOP_WINDOW_DAYS,
  MANUAL_GRACE_WINDOW_DAYS,
} from "./route";

const findManyMock = prisma.clubMembershipSubscription.findMany as ReturnType<
  typeof vi.fn
>;
const getMembershipPreapprovalMock = getMembershipPreapproval as ReturnType<
  typeof vi.fn
>;
const recordAutoCancellationMock = recordAutoCancellation as ReturnType<
  typeof vi.fn
>;
const recordSuccessfulChargeMock = recordSuccessfulCharge as ReturnType<
  typeof vi.fn
>;
const recordManualPeriodExpiredWithoutRenewalMock =
  recordManualPeriodExpiredWithoutRenewal as ReturnType<typeof vi.fn>;
const recordManualLockoutMock = recordManualLockout as ReturnType<typeof vi.fn>;

function makeRequest(authHeader?: string) {
  return new Request(
    "https://app.example.com/api/cron/membership-grace-sweep",
    { headers: authHeader ? { authorization: authHeader } : {} },
  );
}

// Per-scenario fixture buckets, dispatched by `where` shape so each test can
// seed only the buckets it cares about without over-specifying call order.
let autoStuckSubs: Array<{ clubId: string; mpPreapprovalId: string | null }> =
  [];
let annualTrialSubs: Array<{ clubId: string }> = [];
let manualActiveSubs: Array<{ clubId: string }> = [];
let manualPastDueSubs: Array<{ clubId: string }> = [];

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  autoStuckSubs = [];
  annualTrialSubs = [];
  manualActiveSubs = [];
  manualPastDueSubs = [];

  findManyMock.mockReset();
  findManyMock.mockImplementation(
    async (args: { where: Record<string, unknown> }) => {
      const { where } = args;
      if (where.renewalMode === "AUTO" && where.status === "PAST_DUE") {
        return autoStuckSubs;
      }
      if (where.cycle === "ANNUAL" && where.status === "TRIALING") {
        return annualTrialSubs;
      }
      if (where.renewalMode === "MANUAL" && where.status === "ACTIVE") {
        return manualActiveSubs;
      }
      if (where.renewalMode === "MANUAL" && where.status === "PAST_DUE") {
        return manualPastDueSubs;
      }
      return [];
    },
  );

  getMembershipPreapprovalMock.mockReset();
  recordAutoCancellationMock.mockReset().mockResolvedValue({});
  recordSuccessfulChargeMock.mockReset().mockResolvedValue({});
  recordManualPeriodExpiredWithoutRenewalMock.mockReset().mockResolvedValue({});
  recordManualLockoutMock.mockReset().mockResolvedValue({});
});

describe("GET /api/cron/membership-grace-sweep — auth", () => {
  it("rejects requests without the correct CRON_SECRET bearer token", async () => {
    const response = await GET(makeRequest("Bearer wrong-secret"));

    expect(response.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("rejects requests with no authorization header at all", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
  });
});

describe("AUTO mode — backstop-only reconciliation", () => {
  it("queries only AUTO subscriptions stuck PAST_DUE past the conservative backstop window", async () => {
    await GET(makeRequest("Bearer test-cron-secret"));

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          renewalMode: "AUTO",
          status: "PAST_DUE",
          pastDueSince: expect.objectContaining({
            not: null,
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  it("uses a window conservatively wider than MP's own ~10-day recycling/dunning timeline", () => {
    expect(AUTO_BACKSTOP_WINDOW_DAYS).toBeGreaterThan(10);
  });

  it("reconciles a missed cancellation webhook by calling recordAutoCancellation when MP reports canceled", async () => {
    autoStuckSubs = [{ clubId: "club_1", mpPreapprovalId: "preap_1" }];
    getMembershipPreapprovalMock.mockResolvedValue({
      id: "preap_1",
      status: "canceled",
    });

    const response = await GET(makeRequest("Bearer test-cron-secret"));
    const body = await response.json();

    expect(getMembershipPreapprovalMock).toHaveBeenCalledWith("preap_1");
    expect(recordAutoCancellationMock).toHaveBeenCalledWith(
      expect.objectContaining({ clubId: "club_1" }),
    );
    expect(recordSuccessfulChargeMock).not.toHaveBeenCalled();
    expect(body.autoReconciled).toBe(1);
  });

  it("reconciles a missed success webhook by calling recordSuccessfulCharge when MP reports authorized", async () => {
    autoStuckSubs = [{ clubId: "club_2", mpPreapprovalId: "preap_2" }];
    getMembershipPreapprovalMock.mockResolvedValue({
      id: "preap_2",
      status: "authorized",
    });

    const response = await GET(makeRequest("Bearer test-cron-secret"));
    const body = await response.json();

    expect(recordSuccessfulChargeMock).toHaveBeenCalledWith(
      expect.objectContaining({ clubId: "club_2" }),
    );
    expect(recordAutoCancellationMock).not.toHaveBeenCalled();
    expect(body.autoReconciled).toBe(1);
  });

  it("takes no action (never guesses) when MP reports a status other than authorized/canceled", async () => {
    autoStuckSubs = [{ clubId: "club_3", mpPreapprovalId: "preap_3" }];
    getMembershipPreapprovalMock.mockResolvedValue({
      id: "preap_3",
      status: "paused",
    });

    const response = await GET(makeRequest("Bearer test-cron-secret"));
    const body = await response.json();

    expect(recordAutoCancellationMock).not.toHaveBeenCalled();
    expect(recordSuccessfulChargeMock).not.toHaveBeenCalled();
    expect(body.autoStillPending).toBe(1);
  });

  it("counts a reconciliation failure without aborting the rest of the batch", async () => {
    autoStuckSubs = [{ clubId: "club_4", mpPreapprovalId: "preap_4" }];
    getMembershipPreapprovalMock.mockRejectedValue(new Error("MP down"));

    const response = await GET(makeRequest("Bearer test-cron-secret"));
    const body = await response.json();

    expect(body.failed).toBe(1);
  });
});

describe("ANNUAL trial expiry (app-tracked trialEndsAt gate)", () => {
  it("queries ANNUAL subscriptions still TRIALING past their trialEndsAt", async () => {
    await GET(makeRequest("Bearer test-cron-secret"));

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          cycle: "ANNUAL",
          status: "TRIALING",
          trialEndsAt: expect.objectContaining({
            not: null,
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  // sdd-verify follow-up fix: a row with `mpPreferenceId` already set means
  // a "Pay Now" checkout link was generated and the owner may have already
  // paid, with the webhook confirmation simply not having landed yet before
  // this daily cron runs. Auto-cancelling that row would wrongly cancel an
  // already-paying customer.
  it("excludes ANNUAL trials that already have a payment attempt in flight (mpPreferenceId set)", async () => {
    await GET(makeRequest("Bearer test-cron-secret"));

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          cycle: "ANNUAL",
          status: "TRIALING",
          mpPreferenceId: null,
        }),
      }),
    );
  });

  it("cancels an expired-without-payment annual trial via recordAutoCancellation", async () => {
    annualTrialSubs = [{ clubId: "club_annual_1" }];

    const response = await GET(makeRequest("Bearer test-cron-secret"));
    const body = await response.json();

    expect(recordAutoCancellationMock).toHaveBeenCalledWith(
      expect.objectContaining({ clubId: "club_annual_1" }),
    );
    expect(body.annualTrialsExpired).toBe(1);
  });
});

describe("MANUAL mode — primary/authoritative lockout mechanism", () => {
  it("queries MANUAL ACTIVE subscriptions whose currentPeriodEnd has passed", async () => {
    await GET(makeRequest("Bearer test-cron-secret"));

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          renewalMode: "MANUAL",
          status: "ACTIVE",
          currentPeriodEnd: expect.objectContaining({
            not: null,
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  it("moves an expired-without-renewal MANUAL subscription to PAST_DUE via recordManualPeriodExpiredWithoutRenewal", async () => {
    manualActiveSubs = [{ clubId: "club_manual_1" }];

    const response = await GET(makeRequest("Bearer test-cron-secret"));
    const body = await response.json();

    expect(recordManualPeriodExpiredWithoutRenewalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clubId: "club_manual_1",
        graceWindowDays: MANUAL_GRACE_WINDOW_DAYS,
      }),
    );
    expect(body.manualExpired).toBe(1);
  });

  it("queries MANUAL PAST_DUE subscriptions whose pastDueUntil deadline has passed", async () => {
    await GET(makeRequest("Bearer test-cron-secret"));

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          renewalMode: "MANUAL",
          status: "PAST_DUE",
          pastDueUntil: expect.objectContaining({
            not: null,
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  it("locks out a MANUAL subscription past its grace deadline via recordManualLockout — the sole trigger for this mode", async () => {
    manualPastDueSubs = [{ clubId: "club_manual_2" }];

    const response = await GET(makeRequest("Bearer test-cron-secret"));
    const body = await response.json();

    expect(recordManualLockoutMock).toHaveBeenCalledWith(
      expect.objectContaining({ clubId: "club_manual_2" }),
    );
    expect(body.manualLockedOut).toBe(1);
  });

  it("counts a lockout failure without aborting the rest of the batch", async () => {
    manualPastDueSubs = [{ clubId: "club_manual_3" }];
    recordManualLockoutMock.mockRejectedValue(new Error("db error"));

    const response = await GET(makeRequest("Bearer test-cron-secret"));
    const body = await response.json();

    expect(body.failed).toBe(1);
  });
});
