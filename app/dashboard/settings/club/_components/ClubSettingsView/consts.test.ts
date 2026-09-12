import { describe, it, expect } from "vitest";
import { clubSettingsFormSchema } from "./consts";

function basePayload(whatsappNumber: string) {
  return {
    name: "Club Padel Norte",
    legalName: "",
    taxId: "",
    email: "club@example.com",
    phone: "",
    whatsappNumber,
    whatsappCountry: "",
    address: "",
    country: "",
    province: "",
    city: "",
    zipCode: "",
    timezone: "America/Argentina/Buenos_Aires",
    currency: "ARS",
  };
}

describe("clubSettingsFormSchema — whatsappNumber", () => {
  it("allows an empty string (optional field)", () => {
    const result = clubSettingsFormSchema.safeParse(basePayload(""));
    expect(result.success).toBe(true);
  });

  it("rejects a whatsappNumber that's only a country code (zero real digits)", () => {
    const result = clubSettingsFormSchema.safeParse(basePayload("+54"));
    expect(result.success).toBe(false);
  });

  it("rejects a whatsappNumber with fewer than 8 digits", () => {
    const result = clubSettingsFormSchema.safeParse(basePayload("+541234"));
    expect(result.success).toBe(false);
  });

  it("accepts a real whatsappNumber (country code + enough digits)", () => {
    const result = clubSettingsFormSchema.safeParse(
      basePayload("+5491123456789"),
    );
    expect(result.success).toBe(true);
  });
});
