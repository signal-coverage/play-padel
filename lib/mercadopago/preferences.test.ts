import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const createMock = vi.fn();

vi.mock("mercadopago", () => ({
  Preference: vi.fn().mockImplementation(function (config: unknown) {
    return { config, create: createMock };
  }),
}));

vi.mock("./clubMercadoPagoClient", () => ({
  getClubMercadoPagoClient: vi.fn(),
}));

import { getClubMercadoPagoClient } from "./clubMercadoPagoClient";
import { createCheckoutPreference } from "./preferences";

const getClubMercadoPagoClientMock = getClubMercadoPagoClient as ReturnType<
  typeof vi.fn
>;

const FAKE_CLUB_CLIENT = { accessToken: "club-1-access-token" };

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
  createMock.mockReset();
  getClubMercadoPagoClientMock.mockReset();
  getClubMercadoPagoClientMock.mockResolvedValue(FAKE_CLUB_CLIENT);
  createMock.mockResolvedValue({
    init_point: "https://mp.example.com/checkout/abc",
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createCheckoutPreference", () => {
  it("resolves and uses the owning club's Mercado Pago client, not a platform singleton", async () => {
    await createCheckoutPreference({
      clubId: "club_1",
      clubName: "Alpha Club",
      reservationId: "res_1",
      courtName: "Court 1",
      price: 1000,
      currency: "ARS",
    });

    expect(getClubMercadoPagoClientMock).toHaveBeenCalledWith("club_1");
    const { Preference } = await import("mercadopago");
    expect(Preference).toHaveBeenCalledWith(FAKE_CLUB_CLIENT);
  });

  it("does not set any marketplace_fee on the preference body", async () => {
    await createCheckoutPreference({
      clubId: "club_1",
      clubName: "Alpha Club",
      reservationId: "res_1",
      courtName: "Court 1",
      price: 1000,
      currency: "ARS",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.body).not.toHaveProperty("marketplace_fee");
  });

  it("accepts a forward-compat marketplaceFee param without populating or exposing it", async () => {
    await createCheckoutPreference({
      clubId: "club_1",
      clubName: "Alpha Club",
      reservationId: "res_1",
      courtName: "Court 1",
      price: 1000,
      currency: "ARS",
      marketplaceFee: 50,
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.body).not.toHaveProperty("marketplace_fee");
    expect(JSON.stringify(callArgs.body)).not.toContain("50");
  });

  it("embeds reservationId as a query param on notification_url for webhook club resolution", async () => {
    await createCheckoutPreference({
      clubId: "club_1",
      clubName: "Alpha Club",
      reservationId: "res_1",
      courtName: "Court 1",
      price: 1000,
      currency: "ARS",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.body.notification_url).toBe(
      "https://app.example.com/api/webhooks/mercadopago?reservationId=res_1",
    );
  });

  it("propagates the club connection error instead of silently falling back", async () => {
    getClubMercadoPagoClientMock.mockRejectedValue(
      new Error("Club club_1 does not have a valid Mercado Pago connection"),
    );

    await expect(
      createCheckoutPreference({
        clubId: "club_1",
        clubName: "Alpha Club",
        reservationId: "res_1",
        courtName: "Court 1",
        price: 1000,
        currency: "ARS",
      }),
    ).rejects.toThrow("does not have a valid Mercado Pago connection");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("brands the item title with the club's name and Play Padel, not just the court", async () => {
    await createCheckoutPreference({
      clubId: "club_1",
      clubName: "Alpha Club",
      reservationId: "res_1",
      courtName: "Court 1",
      price: 1000,
      currency: "ARS",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.body.items[0].title).toBe(
      "Court 1 — Alpha Club · Play Padel",
    );
  });

  it("sets a statement_descriptor combining the club's name and Play Padel", async () => {
    await createCheckoutPreference({
      clubId: "club_1",
      clubName: "Alpha Club",
      reservationId: "res_1",
      courtName: "Court 1",
      price: 1000,
      currency: "ARS",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.body.statement_descriptor).toBe("ALPHA CLUB-PLAYPADEL");
  });

  it("truncates a long club name in statement_descriptor to fit the 22-char issuer limit", async () => {
    await createCheckoutPreference({
      clubId: "club_1",
      clubName: "The Extremely Long Padel Club Name",
      reservationId: "res_1",
      courtName: "Court 1",
      price: 1000,
      currency: "ARS",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.body.statement_descriptor.length).toBeLessThanOrEqual(22);
  });

  it("never changes external_reference — the webhook still matches it against the reservationId untouched", async () => {
    await createCheckoutPreference({
      clubId: "club_1",
      clubName: "Alpha Club",
      reservationId: "res_1",
      courtName: "Court 1",
      price: 1000,
      currency: "ARS",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.body.external_reference).toBe("res_1");
  });
});
