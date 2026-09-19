import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/mercadopago/membershipPreapprovals", () => ({
  getMembershipPreapproval: vi.fn(),
}));

vi.mock("@/core/billing/services/membership.service", () => {
  class InvalidMembershipTransitionError extends Error {
    constructor(from: string, to: string) {
      super(`Cannot transition membership status from ${from} to ${to}`);
      this.name = "InvalidMembershipTransitionError";
    }
  }
  return {
    findMembershipSubscriptionByPreapprovalId: vi.fn(),
    recordSuccessfulCharge: vi.fn(),
    recordFailedCharge: vi.fn(),
    recordAutoCancellation: vi.fn(),
    InvalidMembershipTransitionError,
  };
});

import { getMembershipPreapproval } from "@/lib/mercadopago/membershipPreapprovals";
import {
  findMembershipSubscriptionByPreapprovalId,
  recordSuccessfulCharge,
  recordFailedCharge,
  recordAutoCancellation,
  InvalidMembershipTransitionError,
} from "@/core/billing/services/membership.service";
import {
  resolveMembershipWebhookDecision,
  handleSubscriptionPreapprovalTopic,
} from "./membershipWebhookHandlers";

const getMembershipPreapprovalMock = getMembershipPreapproval as ReturnType<
  typeof vi.fn
>;
const findMembershipSubscriptionByPreapprovalIdMock =
  findMembershipSubscriptionByPreapprovalId as ReturnType<typeof vi.fn>;
const recordSuccessfulChargeMock = recordSuccessfulCharge as ReturnType<
  typeof vi.fn
>;
const recordFailedChargeMock = recordFailedCharge as ReturnType<typeof vi.fn>;
const recordAutoCancellationMock = recordAutoCancellation as ReturnType<
  typeof vi.fn
>;

beforeEach(() => {
  getMembershipPreapprovalMock.mockReset();
  findMembershipSubscriptionByPreapprovalIdMock.mockReset();
  recordSuccessfulChargeMock.mockReset();
  recordFailedChargeMock.mockReset();
  recordAutoCancellationMock.mockReset();
});

describe("resolveMembershipWebhookDecision (pure)", () => {
  it("resolves auto_cancellation when MP reports the preapproval as canceled", () => {
    expect(
      resolveMembershipWebhookDecision({
        status: "canceled",
        summarized: null,
      }),
    ).toEqual({ action: "auto_cancellation" });
  });

  it("resolves successful_charge for an authorized preapproval with no pending charge and a green semaphore", () => {
    expect(
      resolveMembershipWebhookDecision({
        status: "authorized",
        summarized: {
          chargedQuantity: 1,
          pendingChargeQuantity: 0,
          lastChargedDate: "2026-08-24T12:00:00Z",
          semaphore: "green",
        },
      }),
    ).toEqual({ action: "successful_charge" });
  });

  it("resolves successful_charge for an authorized preapproval with no summarized info at all (first authorization, nothing charged yet)", () => {
    expect(
      resolveMembershipWebhookDecision({
        status: "authorized",
        summarized: null,
      }),
    ).toEqual({ action: "successful_charge" });
  });

  it("resolves failed_charge for an authorized preapproval with a pending charge (MP recycling retry)", () => {
    expect(
      resolveMembershipWebhookDecision({
        status: "authorized",
        summarized: {
          chargedQuantity: 2,
          pendingChargeQuantity: 1,
          lastChargedDate: "2026-07-24T12:00:00Z",
          semaphore: "red",
        },
      }),
    ).toEqual({ action: "failed_charge" });
  });

  it("resolves failed_charge for an authorized preapproval with a yellow/red semaphore even if pendingChargeQuantity reads 0", () => {
    expect(
      resolveMembershipWebhookDecision({
        status: "authorized",
        summarized: {
          chargedQuantity: 2,
          pendingChargeQuantity: 0,
          lastChargedDate: "2026-07-24T12:00:00Z",
          semaphore: "yellow",
        },
      }),
    ).toEqual({ action: "failed_charge" });
  });

  it("resolves noop for a paused preapproval (expected manual-mode pause between cycles, not an error)", () => {
    expect(
      resolveMembershipWebhookDecision({ status: "paused", summarized: null }),
    ).toEqual({ action: "noop", reason: expect.stringContaining("paused") });
  });

  it("resolves noop for a pending preapproval (not yet authorized)", () => {
    expect(
      resolveMembershipWebhookDecision({ status: "pending", summarized: null }),
    ).toEqual({ action: "noop", reason: expect.stringContaining("pending") });
  });
});

describe("handleSubscriptionPreapprovalTopic (subscription_preapproval — both cycles)", () => {
  it("acks ok:true without any lookup when dataId is null", async () => {
    const response = await handleSubscriptionPreapprovalTopic(null, "notif_1");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(
      findMembershipSubscriptionByPreapprovalIdMock,
    ).not.toHaveBeenCalled();
  });

  it("acks without fetching the preapproval when no subscription references the given preapproval id (resolves club BEFORE fetching from MP)", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue(null);

    const response = await handleSubscriptionPreapprovalTopic(
      "preap_1",
      "notif_1",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(findMembershipSubscriptionByPreapprovalIdMock).toHaveBeenCalledWith(
      "preap_1",
    );
    expect(getMembershipPreapprovalMock).not.toHaveBeenCalled();
  });

  it("resolves the owning club BEFORE re-fetching the preapproval, and re-fetches BEFORE calling any state-machine transition", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue({
      clubId: "club_1",
    });
    getMembershipPreapprovalMock.mockResolvedValue({
      id: "preap_1",
      status: "authorized",
      summarized: null,
    });
    recordSuccessfulChargeMock.mockResolvedValue({});

    await handleSubscriptionPreapprovalTopic("preap_1", "notif_1");

    const resolveOrder =
      findMembershipSubscriptionByPreapprovalIdMock.mock.invocationCallOrder[0];
    const fetchOrder = getMembershipPreapprovalMock.mock.invocationCallOrder[0];
    const transitionOrder =
      recordSuccessfulChargeMock.mock.invocationCallOrder[0];

    expect(resolveOrder).toBeLessThan(fetchOrder);
    expect(fetchOrder).toBeLessThan(transitionOrder);
    expect(getMembershipPreapprovalMock).toHaveBeenCalledWith("preap_1");
  });

  it("never trusts the webhook body's own status — only the re-fetched preapproval decides the transition", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue({
      clubId: "club_1",
    });
    getMembershipPreapprovalMock.mockResolvedValue({
      id: "preap_1",
      status: "canceled",
      summarized: null,
    });
    recordAutoCancellationMock.mockResolvedValue({});

    const response = await handleSubscriptionPreapprovalTopic(
      "preap_1",
      "notif_1",
    );

    expect(response.status).toBe(200);
    expect(recordAutoCancellationMock).toHaveBeenCalledWith(
      expect.objectContaining({ clubId: "club_1", webhookEventId: "notif_1" }),
    );
  });

  it("calls recordSuccessfulCharge for a healthy authorized preapproval", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue({
      clubId: "club_1",
    });
    getMembershipPreapprovalMock.mockResolvedValue({
      id: "preap_1",
      status: "authorized",
      summarized: {
        chargedQuantity: 1,
        pendingChargeQuantity: 0,
        lastChargedDate: "2026-08-24T12:00:00Z",
        semaphore: "green",
      },
    });
    recordSuccessfulChargeMock.mockResolvedValue({});

    await handleSubscriptionPreapprovalTopic("preap_1", "notif_1");

    expect(recordSuccessfulChargeMock).toHaveBeenCalledWith(
      expect.objectContaining({ clubId: "club_1", webhookEventId: "notif_1" }),
    );
    expect(recordFailedChargeMock).not.toHaveBeenCalled();
    expect(recordAutoCancellationMock).not.toHaveBeenCalled();
  });

  it("calls recordFailedCharge for an authorized preapproval stuck in MP's own recycling retry", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue({
      clubId: "club_1",
    });
    getMembershipPreapprovalMock.mockResolvedValue({
      id: "preap_1",
      status: "authorized",
      summarized: {
        chargedQuantity: 2,
        pendingChargeQuantity: 1,
        lastChargedDate: "2026-07-24T12:00:00Z",
        semaphore: "red",
      },
    });
    recordFailedChargeMock.mockResolvedValue({});

    await handleSubscriptionPreapprovalTopic("preap_1", "notif_1");

    expect(recordFailedChargeMock).toHaveBeenCalledWith(
      expect.objectContaining({ clubId: "club_1", webhookEventId: "notif_1" }),
    );
    expect(recordSuccessfulChargeMock).not.toHaveBeenCalled();
  });

  it("does nothing (still acks 200) for a paused preapproval", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue({
      clubId: "club_1",
    });
    getMembershipPreapprovalMock.mockResolvedValue({
      id: "preap_1",
      status: "paused",
      summarized: null,
    });

    const response = await handleSubscriptionPreapprovalTopic(
      "preap_1",
      "notif_1",
    );

    expect(response.status).toBe(200);
    expect(recordSuccessfulChargeMock).not.toHaveBeenCalled();
    expect(recordFailedChargeMock).not.toHaveBeenCalled();
    expect(recordAutoCancellationMock).not.toHaveBeenCalled();
  });

  it("returns 500 when re-fetching the preapproval from Mercado Pago fails", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue({
      clubId: "club_1",
    });
    getMembershipPreapprovalMock.mockRejectedValue(new Error("MP down"));

    const response = await handleSubscriptionPreapprovalTopic(
      "preap_1",
      "notif_1",
    );

    expect(response.status).toBe(500);
    expect(recordSuccessfulChargeMock).not.toHaveBeenCalled();
  });

  it("acks 200 (idempotent no-op) instead of 500 when the transition is a duplicate/invalid one already applied", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue({
      clubId: "club_1",
    });
    getMembershipPreapprovalMock.mockResolvedValue({
      id: "preap_1",
      status: "canceled",
      summarized: null,
    });
    recordAutoCancellationMock.mockRejectedValue(
      new InvalidMembershipTransitionError("CANCELLED", "CANCELLED"),
    );

    const response = await handleSubscriptionPreapprovalTopic(
      "preap_1",
      "notif_1",
    );

    expect(response.status).toBe(200);
  });

  it("returns 500 (so Mercado Pago retries) on a genuine, non-transition-related failure", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue({
      clubId: "club_1",
    });
    getMembershipPreapprovalMock.mockResolvedValue({
      id: "preap_1",
      status: "authorized",
      summarized: null,
    });
    recordSuccessfulChargeMock.mockRejectedValue(
      new Error("DB connection lost"),
    );

    const response = await handleSubscriptionPreapprovalTopic(
      "preap_1",
      "notif_1",
    );

    expect(response.status).toBe(500);
  });
});
