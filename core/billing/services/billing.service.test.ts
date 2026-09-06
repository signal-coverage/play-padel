import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    invoice: { findFirst: vi.fn(), update: vi.fn() },
    payment: { create: vi.fn() },
    userProfile: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<p>rendered</p>"),
}));

vi.mock("@/lib/email/templates/PaymentConfirmed", () => ({
  PaymentConfirmed: () => null,
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatch: vi.fn(),
}));

vi.mock("@/core/clubs/services/clubs.service", () => ({
  getClubOwner: vi.fn(),
}));

import { prisma } from "@/infrastructure/db/client";
import { logAudit } from "@/core/audit/services/audit.service";
import { dispatch } from "@/lib/notifications/dispatcher";
import { getClubOwner } from "@/core/clubs/services/clubs.service";
import { recordPayment } from "./billing.service";

const findFirstMock = prisma.invoice.findFirst as ReturnType<typeof vi.fn>;
const invoiceUpdateMock = prisma.invoice.update as ReturnType<typeof vi.fn>;
const paymentCreateMock = prisma.payment.create as ReturnType<typeof vi.fn>;
const transactionMock = prisma.$transaction as ReturnType<typeof vi.fn>;
const userProfileFindUniqueMock = prisma.userProfile.findUnique as ReturnType<
  typeof vi.fn
>;
const logAuditMock = logAudit as ReturnType<typeof vi.fn>;
const dispatchMock = dispatch as ReturnType<typeof vi.fn>;
const getClubOwnerMock = getClubOwner as ReturnType<typeof vi.fn>;

describe("recordPayment", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    invoiceUpdateMock.mockReset();
    paymentCreateMock.mockReset();
    transactionMock.mockReset();
    userProfileFindUniqueMock.mockReset();
    logAuditMock.mockReset();
    dispatchMock.mockReset();
    getClubOwnerMock.mockReset();

    findFirstMock.mockResolvedValue({
      id: "invoice_1",
      number: 42,
      status: "ISSUED",
      total: 1000,
      userId: "user_payer",
      userName: "Payer Name",
    });

    const paymentRow = {
      id: "payment_1",
      clubId: "club_1",
      invoiceId: "invoice_1",
      method: "DIGITAL",
      amount: 1000,
      currency: "ARS",
      status: "COMPLETED",
      reference: null,
      paidAt: new Date(),
      createdAt: new Date(),
      createdBy: "user_1",
    };
    const invoiceRow = { id: "invoice_1", status: "PAID" };

    paymentCreateMock.mockReturnValue(Promise.resolve(paymentRow));
    invoiceUpdateMock.mockReturnValue(Promise.resolve(invoiceRow));
    transactionMock.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );

    userProfileFindUniqueMock.mockResolvedValue({
      email: "payer@example.com",
      displayName: "Payer Name",
    });
    dispatchMock.mockResolvedValue(undefined);
    getClubOwnerMock.mockResolvedValue({
      id: "user_owner",
      displayName: "Owner Person",
      photoURL: null,
      email: "owner@example.com",
    });
  });

  it("dispatches PAYMENT_CONFIRMED to the payer as before", async () => {
    await recordPayment("club_1", "user_1", {
      invoiceId: "invoice_1",
      method: "DIGITAL",
      amount: 1000,
      currency: "ARS",
    });

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PAYMENT_CONFIRMED",
        clubId: "club_1",
        recipientId: "user_payer",
        recipientEmail: "payer@example.com",
        recipientName: "Payer Name",
      }),
    );
  });

  it("also dispatches PAYMENT_RECEIVED to the club owner, in addition to PAYMENT_CONFIRMED to the payer", async () => {
    await recordPayment("club_1", "user_1", {
      invoiceId: "invoice_1",
      method: "DIGITAL",
      amount: 1000,
      currency: "ARS",
    });

    expect(dispatchMock).toHaveBeenCalledTimes(2);
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PAYMENT_RECEIVED",
        clubId: "club_1",
        recipientId: "user_owner",
        recipientEmail: "owner@example.com",
        recipientName: "Owner Person",
        sendEmail: false,
      }),
    );
  });

  it("does not dispatch PAYMENT_RECEIVED when the club has no owner row", async () => {
    getClubOwnerMock.mockResolvedValue(null);

    await recordPayment("club_1", "user_1", {
      invoiceId: "invoice_1",
      method: "DIGITAL",
      amount: 1000,
      currency: "ARS",
    });

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "PAYMENT_CONFIRMED" }),
    );
  });

  it("still returns the recorded payment even if notification dispatch throws", async () => {
    dispatchMock.mockRejectedValue(new Error("dispatch failed"));

    const result = await recordPayment("club_1", "user_1", {
      invoiceId: "invoice_1",
      method: "DIGITAL",
      amount: 1000,
      currency: "ARS",
    });

    expect(result.id).toBe("payment_1");
  });
});
