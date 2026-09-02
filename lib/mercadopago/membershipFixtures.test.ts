import { describe, it, expect } from "vitest";
import {
  buildPreapprovalPlanResponse,
  buildPreapprovalResponse,
  buildPausedPreapprovalResponse,
  buildReactivatedPreapprovalResponse,
  buildAuthorizedPaymentResponse,
} from "./membershipFixtures";

describe("buildPreapprovalPlanResponse", () => {
  it("defaults to an active plan with no free_trial field", () => {
    const plan = buildPreapprovalPlanResponse();

    expect(plan.status).toBe("active");
    expect(plan.auto_recurring.frequency_type).toBe("months");
    expect(plan.auto_recurring).not.toHaveProperty("free_trial");
  });

  it("includes auto_recurring.free_trial only when a free trial is requested", () => {
    const plan = buildPreapprovalPlanResponse({
      freeTrialFrequency: 14,
      freeTrialFrequencyType: "days",
    });

    expect(plan.auto_recurring.free_trial).toEqual({
      frequency: 14,
      frequency_type: "days",
    });
  });
});

describe("buildPreapprovalResponse", () => {
  it("defaults to an authorized preapproval with no init_point", () => {
    const preapproval = buildPreapprovalResponse();

    expect(preapproval.status).toBe("authorized");
    expect(preapproval.init_point).toBeUndefined();
  });

  it("includes init_point when status is pending", () => {
    const preapproval = buildPreapprovalResponse({ status: "pending" });

    expect(preapproval.status).toBe("pending");
    expect(preapproval.init_point).toBe(
      "https://www.mercadopago.com/subscriptions/checkout?preapproval_id=preap_2c9380848d1e6d1b018d1ea9e2a70099",
    );
  });
});

describe("buildPausedPreapprovalResponse", () => {
  it("forces status to paused regardless of overrides", () => {
    const paused = buildPausedPreapprovalResponse({ status: "authorized" });

    expect(paused.status).toBe("paused");
  });
});

describe("buildReactivatedPreapprovalResponse", () => {
  it("forces status to authorized and carries the bounded end_date through", () => {
    const reactivated = buildReactivatedPreapprovalResponse({
      status: "paused",
      endDate: "2026-09-24T12:00:00.000-04:00",
    });

    expect(reactivated.status).toBe("authorized");
    expect(reactivated.auto_recurring.end_date).toBe(
      "2026-09-24T12:00:00.000-04:00",
    );
  });
});

describe("buildAuthorizedPaymentResponse", () => {
  it("defaults to a processed installment", () => {
    const installment = buildAuthorizedPaymentResponse();

    expect(installment.status).toBe("processed");
    expect(installment.retry_attempt).toBe(0);
  });

  it("represents a recycling (retry) installment with a nonzero retry_attempt", () => {
    const installment = buildAuthorizedPaymentResponse({
      status: "recycling",
      retryAttempt: 2,
    });

    expect(installment.status).toBe("recycling");
    expect(installment.retry_attempt).toBe(2);
  });
});
