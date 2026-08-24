import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    invoice: { findFirst: vi.fn() },
    payment: { update: vi.fn() },
    userProfile: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/mercadopago/refunds", () => ({
  refundMercadoPagoPayment: vi.fn(),
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

import { prisma } from "@/infrastructure/db/client";
import { refundMercadoPagoPayment } from "@/lib/mercadopago/refunds";
import { logAudit } from "@/core/audit/services/audit.service";
import { refundPayment } from "./billing.service";

const findFirstMock = prisma.invoice.findFirst as ReturnType<typeof vi.fn>;
const updateMock = prisma.payment.update as ReturnType<typeof vi.fn>;
const findUniqueMock = prisma.userProfile.findUnique as ReturnType<
  typeof vi.fn
>;
const refundMercadoPagoPaymentMock = refundMercadoPagoPayment as ReturnType<
  typeof vi.fn
>;
const logAuditMock = logAudit as ReturnType<typeof vi.fn>;

describe("refundPayment", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    updateMock.mockReset();
    findUniqueMock.mockReset();
    refundMercadoPagoPaymentMock.mockReset();
    logAuditMock.mockReset();

    findFirstMock.mockResolvedValue({
      id: "invoice_1",
      total: 1000,
      payments: [
        {
          id: "payment_1",
          status: "COMPLETED",
          reference: "mp_payment_123",
          amount: 1000,
        },
      ],
    });
    updateMock.mockResolvedValue({
      id: "payment_1",
      clubId: "club_1",
      invoiceId: "invoice_1",
      method: "DIGITAL",
      amount: 1000,
      currency: "ARS",
      status: "REFUNDED",
      reference: "mp_payment_123",
      paidAt: new Date(),
      createdAt: new Date(),
      createdBy: "user_1",
    });
    findUniqueMock.mockResolvedValue({ displayName: "Owner" });
    refundMercadoPagoPaymentMock.mockResolvedValue(undefined);
  });

  it("refunds using the club that received the original payment", async () => {
    await refundPayment("club_1", "invoice_1", "owner_1");

    expect(refundMercadoPagoPaymentMock).toHaveBeenCalledWith(
      "mp_payment_123",
      "club_1",
    );
  });
});
