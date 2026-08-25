import { describe, it, expect } from "vitest";
import {
  MEMBERSHIP_WEBHOOK_TOPIC,
  MEMBERSHIP_PAYMENT_WEBHOOK_TOPIC,
} from "./membershipWebhookTopics";

describe("MEMBERSHIP_WEBHOOK_TOPIC", () => {
  it("is the confirmed Mercado Pago subscription webhook type", () => {
    expect(MEMBERSHIP_WEBHOOK_TOPIC).toBe("subscription_preapproval");
  });
});

describe("MEMBERSHIP_PAYMENT_WEBHOOK_TOPIC", () => {
  it("is the standard Mercado Pago one-time payment webhook type, used for ANNUAL membership confirmation", () => {
    expect(MEMBERSHIP_PAYMENT_WEBHOOK_TOPIC).toBe("payment");
  });

  it("is distinct from the subscription/preapproval topic", () => {
    expect(MEMBERSHIP_PAYMENT_WEBHOOK_TOPIC).not.toBe(MEMBERSHIP_WEBHOOK_TOPIC);
  });
});
