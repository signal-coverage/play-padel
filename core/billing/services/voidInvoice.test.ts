import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    invoice: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from "@/infrastructure/db/client";
import { voidInvoice } from "./billing.service";

const findFirstMock = prisma.invoice.findFirst as ReturnType<typeof vi.fn>;
const updateMock = prisma.invoice.update as ReturnType<typeof vi.fn>;

// Used by app/api/player/reservations/route.ts to void a dangling invoice
// when a later step (issueInvoice/createCheckoutPreference) fails after the
// invoice was already created — otherwise it's left ISSUED and pointing at
// a cancelled reservation forever.
describe("voidInvoice", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    updateMock.mockReset();
  });

  it("voids an ISSUED invoice", async () => {
    findFirstMock.mockResolvedValue({ id: "invoice_1", status: "ISSUED" });
    updateMock.mockResolvedValue({
      id: "invoice_1",
      clubId: "club_1",
      userId: "user_1",
      userName: "Player One",
      reservationId: "res_1",
      number: 1,
      status: "VOID",
      currency: "ARS",
      items: [],
      subtotal: 1000,
      tax: 0,
      discount: 0,
      total: 1000,
      notes: null,
      issuedAt: new Date(),
      paidAt: null,
      voidedAt: new Date(),
      voidedBy: "user_1",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "user_1",
      updatedBy: "user_1",
      payments: [],
    });

    const result = await voidInvoice("club_1", "invoice_1", "user_1");

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invoice_1", clubId: "club_1" },
        data: expect.objectContaining({
          status: "VOID",
          voidedBy: "user_1",
        }),
      }),
    );
    expect(result.status).toBe("VOID");
  });

  it("voids a DRAFT invoice", async () => {
    findFirstMock.mockResolvedValue({ id: "invoice_1", status: "DRAFT" });
    updateMock.mockResolvedValue({
      id: "invoice_1",
      clubId: "club_1",
      userId: "user_1",
      userName: "Player One",
      reservationId: "res_1",
      number: 1,
      status: "VOID",
      currency: "ARS",
      items: [],
      subtotal: 1000,
      tax: 0,
      discount: 0,
      total: 1000,
      notes: null,
      issuedAt: null,
      paidAt: null,
      voidedAt: new Date(),
      voidedBy: "user_1",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "user_1",
      updatedBy: "user_1",
      payments: [],
    });

    const result = await voidInvoice("club_1", "invoice_1", "user_1");
    expect(result.status).toBe("VOID");
  });

  it("throws when the invoice is already PAID rather than silently voiding a real payment", async () => {
    findFirstMock.mockResolvedValue({ id: "invoice_1", status: "PAID" });

    await expect(voidInvoice("club_1", "invoice_1", "user_1")).rejects.toThrow(
      "Only DRAFT or ISSUED invoices can be voided",
    );
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("throws when the invoice doesn't exist", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(
      voidInvoice("club_1", "invoice_missing", "user_1"),
    ).rejects.toThrow("Invoice not found");
    expect(updateMock).not.toHaveBeenCalled();
  });
});
