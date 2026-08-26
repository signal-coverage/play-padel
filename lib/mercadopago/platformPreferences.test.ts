import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createMock = vi.fn();
const paymentGetMock = vi.fn();

vi.mock("mercadopago", () => ({
  Preference: vi.fn().mockImplementation(function (config: unknown) {
    return { config, create: createMock };
  }),
  Payment: vi.fn().mockImplementation(function (config: unknown) {
    return { config, get: paymentGetMock };
  }),
}));

vi.mock("./platformClient", () => ({
  getPlatformMercadoPagoClient: vi.fn(),
}));

import { Preference, Payment } from "mercadopago";
import { getPlatformMercadoPagoClient } from "./platformClient";
import {
  createMembershipPreference,
  getMembershipPayment,
} from "./platformPreferences";

const getPlatformMercadoPagoClientMock =
  getPlatformMercadoPagoClient as ReturnType<typeof vi.fn>;

const FAKE_PLATFORM_CLIENT = { accessToken: "platform-token" };

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
  createMock.mockReset();
  paymentGetMock.mockReset();
  getPlatformMercadoPagoClientMock.mockReset();
  getPlatformMercadoPagoClientMock.mockReturnValue(FAKE_PLATFORM_CLIENT);
  createMock.mockResolvedValue({
    id: "pref_annual_1",
    init_point: "https://mp.example.com/checkout/annual-1",
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createMembershipPreference", () => {
  it("uses the platform-scoped Mercado Pago client, never the club-OAuth-scoped one", async () => {
    await createMembershipPreference({
      clubId: "club_1",
      plan: "PRO",
      price: 500000,
      currency: "ARS",
    });

    expect(getPlatformMercadoPagoClientMock).toHaveBeenCalledWith();
    expect(Preference).toHaveBeenCalledWith(FAKE_PLATFORM_CLIENT);
  });

  it("creates a single one-time item for the full annual amount, no recurring object", async () => {
    await createMembershipPreference({
      clubId: "club_1",
      plan: "PRO",
      price: 500000,
      currency: "ARS",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.body.items).toHaveLength(1);
    expect(callArgs.body.items[0].unit_price).toBe(500000);
    expect(callArgs.body).not.toHaveProperty("auto_recurring");
  });

  it("threads currency as an explicit parameter, never a hardcoded literal", async () => {
    await createMembershipPreference({
      clubId: "club_1",
      plan: "PRO",
      price: 500000,
      currency: "USD",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.body.items[0].currency_id).toBe("USD");
  });

  it("sets external_reference to the clubId for webhook resolution", async () => {
    await createMembershipPreference({
      clubId: "club_77",
      plan: "PRO",
      price: 500000,
      currency: "ARS",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.body.external_reference).toBe("club_77");
  });

  it("points notification_url at the base (consolidated) webhook route with a clubId query param, since Mercado Pago only ever calls the one URL registered per environment", async () => {
    await createMembershipPreference({
      clubId: "club_77",
      plan: "PRO",
      price: 500000,
      currency: "ARS",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.body.notification_url).toBe(
      "https://app.example.com/api/webhooks/mercadopago?clubId=club_77",
    );
  });

  it("returns the checkout URL and preference id", async () => {
    const result = await createMembershipPreference({
      clubId: "club_1",
      plan: "PRO",
      price: 500000,
      currency: "ARS",
    });

    expect(result).toEqual({
      checkoutUrl: "https://mp.example.com/checkout/annual-1",
      preferenceId: "pref_annual_1",
    });
  });

  it("throws when Mercado Pago does not return a checkout URL", async () => {
    createMock.mockResolvedValue({ id: "pref_1", init_point: undefined });

    await expect(
      createMembershipPreference({
        clubId: "club_1",
        plan: "PRO",
        price: 500000,
        currency: "ARS",
      }),
    ).rejects.toThrow("Mercado Pago did not return a checkout URL");
  });
});

// Re-fetches an ANNUAL membership's one-time Checkout Pro payment. Deliberately
// PLATFORM-scoped (unlike `lib/mercadopago/payments.ts`'s club-OAuth-scoped
// `getMercadoPagoPayment`, used for reservation payments) — ANNUAL membership
// money belongs to the platform, never a club's own OAuth token (see
// design.md's "MP client for membership" decision). Consumed by the
// membership webhook route's `payment`-type branch (Phase 9 gap fix — the
// preference's own `notification_url` already embeds `?clubId=`, but nothing
// previously read it).
describe("getMembershipPayment", () => {
  beforeEach(() => {
    paymentGetMock.mockResolvedValue({
      id: 555,
      status: "approved",
      external_reference: "club_1",
    });
  });

  it("uses the platform-scoped Mercado Pago client, never the club-OAuth-scoped one", async () => {
    await getMembershipPayment("555");

    expect(getPlatformMercadoPagoClientMock).toHaveBeenCalledWith();
    expect(Payment).toHaveBeenCalledWith(FAKE_PLATFORM_CLIENT);
    expect(paymentGetMock).toHaveBeenCalledWith({ id: "555" });
  });

  it("maps the SDK response to id/status/externalReference", async () => {
    const result = await getMembershipPayment("555");

    expect(result).toEqual({
      id: 555,
      status: "approved",
      externalReference: "club_1",
    });
  });

  it('defaults status to "unknown" and externalReference to null when the SDK omits them', async () => {
    paymentGetMock.mockResolvedValue({ id: 555 });

    const result = await getMembershipPayment("555");

    expect(result).toEqual({
      id: 555,
      status: "unknown",
      externalReference: null,
    });
  });
});
