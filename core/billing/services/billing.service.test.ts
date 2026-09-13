import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    invoice: { findFirst: vi.fn(), updateMany: vi.fn() },
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
import { Prisma } from "@/lib/generated/prisma/client";
import { logAudit } from "@/core/audit/services/audit.service";
import { dispatch } from "@/lib/notifications/dispatcher";
import { getClubOwner } from "@/core/clubs/services/clubs.service";
import { recordPayment } from "./billing.service";

const findFirstMock = prisma.invoice.findFirst as ReturnType<typeof vi.fn>;
const invoiceUpdateManyMock = prisma.invoice.updateMany as ReturnType<
  typeof vi.fn
>;
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
    invoiceUpdateManyMock.mockReset();
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

    invoiceUpdateManyMock.mockResolvedValue({ count: 1 });
    paymentCreateMock.mockResolvedValue(paymentRow);
    // Mirrors the real interactive-transaction shape recordPayment now uses:
    // the callback receives a `tx` client, which here is just `prisma`
    // itself so every mock above (invoiceUpdateManyMock, paymentCreateMock)
    // is exercised exactly as in production, just without a real DB.
    transactionMock.mockImplementation(
      (
        cb: (tx: {
          invoice: { updateMany: typeof invoiceUpdateManyMock };
          payment: { create: typeof paymentCreateMock };
        }) => unknown,
      ) =>
        cb({
          invoice: { updateMany: invoiceUpdateManyMock },
          payment: { create: paymentCreateMock },
        }),
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

// The pre-check findFirstMock above always answers "ISSUED" — these tests
// verify the SECOND, race-safe guard: the atomic updateMany executed inside
// prisma.$transaction, which is what actually protects against a concurrent
// recordPayment call for the same invoice (see billing.service.ts's
// recordPayment doc comment).
describe("recordPayment — race-safe idempotency", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    invoiceUpdateManyMock.mockReset();
    paymentCreateMock.mockReset();
    transactionMock.mockReset();

    findFirstMock.mockResolvedValue({
      id: "invoice_1",
      number: 42,
      status: "ISSUED",
      total: 1000,
      userId: "user_payer",
      userName: "Payer Name",
    });
    invoiceUpdateManyMock.mockResolvedValue({ count: 1 });
    paymentCreateMock.mockResolvedValue({
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
    });
    transactionMock.mockImplementation(
      (
        cb: (tx: {
          invoice: { updateMany: typeof invoiceUpdateManyMock };
          payment: { create: typeof paymentCreateMock };
        }) => unknown,
      ) =>
        cb({
          invoice: { updateMany: invoiceUpdateManyMock },
          payment: { create: paymentCreateMock },
        }),
    );
  });

  it("guards the ISSUED->PAID transition with an atomic updateMany inside the transaction, not a separate read before it", async () => {
    await recordPayment("club_1", "user_1", {
      invoiceId: "invoice_1",
      method: "DIGITAL",
      amount: 1000,
      currency: "ARS",
    });

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(invoiceUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "invoice_1", clubId: "club_1", status: "ISSUED" },
      }),
    );
  });

  it("rejects a concurrent double-payment: when another call already flipped the invoice to PAID inside its own transaction, this call's updateMany affects zero rows and it must not create a duplicate Payment", async () => {
    // The pre-check findFirst above still (staleley) reports ISSUED — a
    // concurrent call's transaction already committed PAID in between. Only
    // the in-transaction updateMany can see the up-to-date row.
    invoiceUpdateManyMock.mockResolvedValue({ count: 0 });

    await expect(
      recordPayment("club_1", "user_1", {
        invoiceId: "invoice_1",
        method: "DIGITAL",
        amount: 1000,
        currency: "ARS",
      }),
    ).rejects.toThrow("Only ISSUED invoices can receive payments");

    expect(paymentCreateMock).not.toHaveBeenCalled();
  });

  it("translates a DB-level unique constraint violation on Payment.invoiceId (payments_invoiceId_key) into the same domain error instead of leaking a raw Prisma error", async () => {
    transactionMock.mockImplementation(async () => {
      throw new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on the fields: (`invoiceId`)",
        {
          code: "P2002",
          clientVersion: "7.9.1",
          meta: { modelName: "Payment", target: ["invoiceId"] },
        },
      );
    });

    await expect(
      recordPayment("club_1", "user_1", {
        invoiceId: "invoice_1",
        method: "DIGITAL",
        amount: 1000,
        currency: "ARS",
      }),
    ).rejects.toThrow("Only ISSUED invoices can receive payments");
  });

  it("rethrows an unrelated transaction error unchanged", async () => {
    transactionMock.mockImplementation(async () => {
      throw new Error("connection terminated unexpectedly");
    });

    await expect(
      recordPayment("club_1", "user_1", {
        invoiceId: "invoice_1",
        method: "DIGITAL",
        amount: 1000,
        currency: "ARS",
      }),
    ).rejects.toThrow("connection terminated unexpectedly");
  });
});
