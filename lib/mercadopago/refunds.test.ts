import { describe, it, expect, vi, beforeEach } from "vitest";

const totalMock = vi.fn();

vi.mock("mercadopago", () => ({
  PaymentRefund: vi.fn().mockImplementation(function (config: unknown) {
    return { config, total: totalMock };
  }),
}));

vi.mock("./clubMercadoPagoClient", () => ({
  getClubMercadoPagoClient: vi.fn(),
}));

import { getClubMercadoPagoClient } from "./clubMercadoPagoClient";
import { refundMercadoPagoPayment } from "./refunds";

const getClubMercadoPagoClientMock = getClubMercadoPagoClient as ReturnType<
  typeof vi.fn
>;

const FAKE_CLUB_CLIENT = { accessToken: "club-1-access-token" };

beforeEach(() => {
  totalMock.mockReset();
  getClubMercadoPagoClientMock.mockReset();
  getClubMercadoPagoClientMock.mockResolvedValue(FAKE_CLUB_CLIENT);
  totalMock.mockResolvedValue(undefined);
});

describe("refundMercadoPagoPayment", () => {
  it("issues the refund using the club that received the original payment", async () => {
    await refundMercadoPagoPayment("12345", "club_1");

    expect(getClubMercadoPagoClientMock).toHaveBeenCalledWith("club_1");
    const { PaymentRefund } = await import("mercadopago");
    expect(PaymentRefund).toHaveBeenCalledWith(FAKE_CLUB_CLIENT);
    expect(totalMock).toHaveBeenCalledWith({ payment_id: "12345" });
  });

  it("fails explicitly rather than falling back to the platform or a different club's token", async () => {
    getClubMercadoPagoClientMock.mockRejectedValue(
      new Error("Club club_1 does not have a valid Mercado Pago connection"),
    );

    await expect(refundMercadoPagoPayment("12345", "club_1")).rejects.toThrow(
      "does not have a valid Mercado Pago connection",
    );
    expect(totalMock).not.toHaveBeenCalled();
  });
});
