import { describe, it, expect } from "vitest";
import { createClubSchema, updateClubSchema } from "./club.schema";

function baseCreatePayload(whatsappNumber?: string) {
  return {
    name: "Club Padel Norte",
    email: "club@example.com",
    timezone: "America/Argentina/Buenos_Aires",
    currency: "ARS",
    ...(whatsappNumber !== undefined && { whatsappNumber }),
  };
}

describe("createClubSchema — whatsappNumber", () => {
  it("allows an omitted whatsappNumber (optional field)", () => {
    const result = createClubSchema.safeParse(baseCreatePayload());
    expect(result.success).toBe(true);
  });

  it("rejects a whatsappNumber that's only a country code (zero real digits)", () => {
    const result = createClubSchema.safeParse(baseCreatePayload("+54"));
    expect(result.success).toBe(false);
  });

  it("rejects a whatsappNumber with fewer than 8 digits", () => {
    const result = createClubSchema.safeParse(baseCreatePayload("+541234"));
    expect(result.success).toBe(false);
  });

  it("accepts a real whatsappNumber (country code + enough digits)", () => {
    const result = createClubSchema.safeParse(
      baseCreatePayload("+5491123456789"),
    );
    expect(result.success).toBe(true);
  });
});

describe("updateClubSchema — whatsappNumber", () => {
  it("allows an omitted whatsappNumber (optional field)", () => {
    const result = updateClubSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("allows an explicit empty string", () => {
    const result = updateClubSchema.safeParse({ whatsappNumber: "" });
    expect(result.success).toBe(true);
  });

  it("rejects a whatsappNumber that's only a country code (zero real digits)", () => {
    const result = updateClubSchema.safeParse({ whatsappNumber: "+54" });
    expect(result.success).toBe(false);
  });

  it("rejects a whatsappNumber with fewer than 8 digits", () => {
    const result = updateClubSchema.safeParse({ whatsappNumber: "+541234" });
    expect(result.success).toBe(false);
  });

  it("accepts a real whatsappNumber (country code + enough digits)", () => {
    const result = updateClubSchema.safeParse({
      whatsappNumber: "+5491123456789",
    });
    expect(result.success).toBe(true);
  });
});
