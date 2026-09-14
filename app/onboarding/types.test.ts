import { describe, it, expect } from "vitest";
import enMessages from "@/messages/en.json";
import { buildOnboardingFormSchema } from "./types";

// Built from the REAL English message catalog (not re-typed literals) so
// this test can never silently drift from what actually ships — if
// messages/en.json's OnboardingValidation.invalidWhatsappNumber ever
// changes, this test's expectations change with it automatically.
const t = (key: string): string =>
  (enMessages.OnboardingValidation as Record<string, string>)[key] ?? key;
const onboardingFormSchema = buildOnboardingFormSchema(t);

// Base valid "owner" payload — every required owner field filled with a
// realistic value, so each test only needs to override `whatsappNumber`.
function ownerPayload(whatsappNumber: string) {
  return {
    userType: "owner" as const,
    name: "Club Padel Norte",
    email: "club@example.com",
    phone: "1123456789",
    whatsappNumber,
    whatsappCountry: "AR",
    address: "Av. Corrientes 1234",
    legalName: "Padel Norte SA",
    taxId: "30-12345678-9",
    displayName: "Owner Name",
    confirmedAge: true,
    acceptedTerms: true,
  };
}

describe("onboardingFormSchema — WhatsApp number validation (owner branch)", () => {
  it("rejects a WhatsApp number that's only a country code (zero real digits)", () => {
    const result = onboardingFormSchema.safeParse(ownerPayload("+54"));

    expect(result.success).toBe(false);
    if (!result.success) {
      const whatsappIssue = result.error.issues.find(
        (issue) => issue.path[0] === "whatsappNumber",
      );
      expect(whatsappIssue?.message).toBe("Enter a valid WhatsApp number");
    }
  });

  it("rejects a WhatsApp number with fewer than 8 digits", () => {
    const result = onboardingFormSchema.safeParse(ownerPayload("+541234"));

    expect(result.success).toBe(false);
    if (!result.success) {
      const whatsappIssue = result.error.issues.find(
        (issue) => issue.path[0] === "whatsappNumber",
      );
      expect(whatsappIssue?.message).toBe("Enter a valid WhatsApp number");
    }
  });

  it("accepts a real WhatsApp number (country code + enough digits)", () => {
    const result = onboardingFormSchema.safeParse(
      ownerPayload("+5491123456789"),
    );

    expect(result.success).toBe(true);
  });
});
