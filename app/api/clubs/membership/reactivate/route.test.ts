import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("@/core/billing/services/membership.service", () => ({
  getMembershipSubscription: vi.fn(),
  reactivateCancelledSubscription: vi.fn(),
}));

import { requireOwnerClub } from "../../_lib/require-owner";
import {
  getMembershipSubscription,
  reactivateCancelledSubscription,
} from "@/core/billing/services/membership.service";
import { POST } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const getMembershipSubscriptionMock = getMembershipSubscription as ReturnType<
  typeof vi.fn
>;
const reactivateCancelledSubscriptionMock =
  reactivateCancelledSubscription as ReturnType<typeof vi.fn>;

const OWNER_OK = { ok: true, context: { userId: "user_1", clubId: "club_1" } };

function subscriptionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    clubId: "club_1",
    plan: "PRO",
    pendingPlan: null,
    cycle: "MONTHLY",
    pendingCycle: null,
    renewalMode: "AUTO",
    status: "CANCELLED",
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
  requireOwnerClubMock.mockReset();
  getMembershipSubscriptionMock.mockReset();
  reactivateCancelledSubscriptionMock.mockReset();

  requireOwnerClubMock.mockResolvedValue(OWNER_OK);
});

describe("POST /api/clubs/membership/reactivate", () => {
  it("returns the owner's response when not an owner", async () => {
    const unauthorized = {
      ok: false,
      response: new Response(null, { status: 401 }),
    };
    requireOwnerClubMock.mockResolvedValue(unauthorized);

    const response = await POST();

    expect(response.status).toBe(401);
    expect(getMembershipSubscriptionMock).not.toHaveBeenCalled();
  });

  it("returns 404 when no subscription exists for the club", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(null);

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBeTruthy();
    expect(reactivateCancelledSubscriptionMock).not.toHaveBeenCalled();
  });

  it("returns 409 with the current status when the subscription is not CANCELLED", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(
      subscriptionRow({ status: "ACTIVE" }),
    );

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe(
      "Cannot reactivate — subscription is ACTIVE, expected CANCELLED",
    );
    expect(reactivateCancelledSubscriptionMock).not.toHaveBeenCalled();
  });

  it("returns 200 with the reactivated PENDING subscription when status is CANCELLED", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(
      subscriptionRow({ status: "CANCELLED" }),
    );
    reactivateCancelledSubscriptionMock.mockResolvedValue(
      subscriptionRow({ status: "PENDING" }),
    );

    const response = await POST();
    const body = await response.json();

    expect(reactivateCancelledSubscriptionMock).toHaveBeenCalledWith("club_1");
    expect(response.status).toBe(200);
    expect(body.subscription.status).toBe("PENDING");
  });

  it("returns 500 with the caught error message when the service throws unexpectedly", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(
      subscriptionRow({ status: "CANCELLED" }),
    );
    reactivateCancelledSubscriptionMock.mockRejectedValue(
      new Error("DB unavailable"),
    );

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("DB unavailable");
  });
});
