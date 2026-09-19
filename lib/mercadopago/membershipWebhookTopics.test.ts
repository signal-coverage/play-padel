import { describe, it, expect } from "vitest";
import { MEMBERSHIP_WEBHOOK_TOPIC } from "./membershipWebhookTopics";

describe("MEMBERSHIP_WEBHOOK_TOPIC", () => {
  it("is the confirmed Mercado Pago subscription webhook type", () => {
    expect(MEMBERSHIP_WEBHOOK_TOPIC).toBe("subscription_preapproval");
  });
});
