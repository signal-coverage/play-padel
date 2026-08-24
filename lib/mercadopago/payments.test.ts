import { describe, it, expect, vi, beforeEach } from "vitest";

const getMock = vi.fn();

vi.mock("mercadopago", () => ({
  Payment: vi.fn().mockImplementation(function (config: unknown) {
    return { config, get: getMock };
  }),
}));

vi.mock("./clubMercadoPagoClient", () => ({
  getClubMercadoPagoClient: vi.fn(),
}));

import { getClubMercadoPagoClient } from "./clubMercadoPagoClient";
import { getMercadoPagoPayment } from "./payments";

const getClubMercadoPagoClientMock = getClubMercadoPagoClient as ReturnType<
  typeof vi.fn
>;

const FAKE_CLUB_CLIENT = { accessToken: "club-1-access-token" };

beforeEach(() => {
  getMock.mockReset();
  getClubMercadoPagoClientMock.mockReset();
  getClubMercadoPagoClientMock.mockResolvedValue(FAKE_CLUB_CLIENT);
  getMock.mockResolvedValue({
    id: 12345,
    status: "approved",
    external_reference: "res_1",
    transaction_amount: 1000,
  });
});

describe("getMercadoPagoPayment", () => {
  it("resolves and uses the owning club's Mercado Pago client to re-fetch the payment", async () => {
    await getMercadoPagoPayment("12345", "club_1");

    expect(getClubMercadoPagoClientMock).toHaveBeenCalledWith("club_1");
    const { Payment } = await import("mercadopago");
    expect(Payment).toHaveBeenCalledWith(FAKE_CLUB_CLIENT);
    expect(getMock).toHaveBeenCalledWith({ id: "12345" });
  });

  it("maps the SDK response to MercadoPagoPaymentStatus", async () => {
    const result = await getMercadoPagoPayment("12345", "club_1");

    expect(result).toEqual({
      id: 12345,
      status: "approved",
      externalReference: "res_1",
      transactionAmount: 1000,
    });
  });

  it("propagates the club connection error instead of falling back to a different token", async () => {
    getClubMercadoPagoClientMock.mockRejectedValue(
      new Error("Club club_1 does not have a valid Mercado Pago connection"),
    );

    await expect(getMercadoPagoPayment("12345", "club_1")).rejects.toThrow(
      "does not have a valid Mercado Pago connection",
    );
    expect(getMock).not.toHaveBeenCalled();
  });
});
