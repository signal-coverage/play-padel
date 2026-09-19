import { describe, expect, it } from "vitest";
import {
  changeTrialPlanSchema,
  createMembershipCheckoutSchema,
} from "./membershipCheckout.schema";

const validCheckout = {
  plan: "PRO",
  cycle: "MONTHLY",
  renewalMode: "AUTO",
  payerEmail: "owner@example.com",
  cardTokenId: "card_token_1",
} as const;

describe("createMembershipCheckoutSchema", () => {
  it.each(["MONTHLY", "ANNUAL"] as const)(
    "accepts a complete %s card checkout",
    (cycle) => {
      const result = createMembershipCheckoutSchema.safeParse({
        ...validCheckout,
        cycle,
      });

      expect(result.success).toBe(true);
    },
  );

  it.each([
    ["renewalMode", "renewalMode is required"],
    ["payerEmail", "payerEmail is required"],
    ["cardTokenId", "cardTokenId is required"],
  ] as const)(
    "requires %s for annual checkout as well as monthly checkout",
    (field, expectedMessage) => {
      const payload: Record<string, unknown> = {
        ...validCheckout,
        cycle: "ANNUAL",
      };
      delete payload[field];

      const result = createMembershipCheckoutSchema.safeParse(payload);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: [field],
              message: expectedMessage,
            }),
          ]),
        );
      }
    },
  );

  it("reports every missing checkout credential in one validation pass", () => {
    const result = createMembershipCheckoutSchema.safeParse({
      plan: "BASIC",
      cycle: "ANNUAL",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toEqual([
        ["renewalMode"],
        ["payerEmail"],
        ["cardTokenId"],
      ]);
    }
  });

  it("rejects malformed emails and empty card tokens", () => {
    const result = createMembershipCheckoutSchema.safeParse({
      ...validCheckout,
      payerEmail: "not-an-email",
      cardTokenId: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toEqual(
        expect.arrayContaining([["payerEmail"], ["cardTokenId"]]),
      );
    }
  });

  it("accepts complete optional payer identification when saving is enabled", () => {
    const result = createMembershipCheckoutSchema.safeParse({
      ...validCheckout,
      identification: { type: "CUIT", number: "30-12345678-9" },
      saveIdentification: true,
    });

    expect(result.success).toBe(true);
  });

  it("keeps identification optional even when saveIdentification is true", () => {
    const result = createMembershipCheckoutSchema.safeParse({
      ...validCheckout,
      saveIdentification: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects partially empty identification objects", () => {
    const result = createMembershipCheckoutSchema.safeParse({
      ...validCheckout,
      identification: { type: "DNI", number: "" },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual([
        "identification",
        "number",
      ]);
    }
  });
});

describe("changeTrialPlanSchema", () => {
  it.each(["BASIC", "PRO", "PLUS", "MAX"] as const)(
    "accepts the %s plan tier",
    (plan) => {
      expect(changeTrialPlanSchema.safeParse({ plan }).success).toBe(true);
    },
  );

  it("rejects unknown plan tiers", () => {
    expect(
      changeTrialPlanSchema.safeParse({ plan: "ENTERPRISE" }).success,
    ).toBe(false);
  });
});
