import { render } from "@react-email/render";
import * as React from "react";
import { prisma } from "@/infrastructure/db/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { dispatch } from "@/lib/notifications/dispatcher";
import { PaymentConfirmed } from "@/lib/email/templates/PaymentConfirmed";
import { logAudit } from "@/core/audit/services/audit.service";
import { getClubOwner } from "@/core/clubs/services/clubs.service";
import type {
  Invoice,
  InvoiceItem,
  InvoiceReceiptData,
  Payment,
  CreateInvoiceInput,
  RecordPaymentInput,
  PaymentMethod,
} from "@/core/billing/types";

type InvoiceRow = NonNullable<
  Awaited<ReturnType<typeof prisma.invoice.findUnique>>
> & {
  payments: NonNullable<Awaited<ReturnType<typeof prisma.payment.findMany>>>;
};

type PaymentRow = NonNullable<
  Awaited<ReturnType<typeof prisma.payment.findUnique>>
>;

function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function toInvoiceItem(raw: unknown): InvoiceItem {
  const r = raw as Record<string, unknown>;
  return {
    description: typeof r.description === "string" ? r.description : "",
    quantity: typeof r.quantity === "number" ? r.quantity : 0,
    unitPrice: typeof r.unitPrice === "number" ? r.unitPrice : 0,
    total: typeof r.total === "number" ? r.total : 0,
  };
}

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    clubId: row.clubId,
    invoiceId: row.invoiceId,
    method: row.method as PaymentMethod,
    amount: row.amount,
    currency: row.currency,
    status: row.status as Payment["status"],
    reference: row.reference ?? undefined,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
    createdBy: row.createdBy ?? undefined,
  };
}

function toInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    clubId: row.clubId,
    userId: row.userId,
    userName: row.userName,
    reservationId: row.reservationId ?? undefined,
    number: row.number,
    status: row.status as Invoice["status"],
    currency: row.currency,
    items: Array.isArray(row.items) ? row.items.map(toInvoiceItem) : [],
    subtotal: row.subtotal,
    tax: row.tax,
    discount: row.discount,
    total: row.total,
    notes: row.notes ?? undefined,
    issuedAt: row.issuedAt ?? undefined,
    paidAt: row.paidAt ?? undefined,
    voidedAt: row.voidedAt ?? undefined,
    voidedBy: row.voidedBy ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy ?? undefined,
    updatedBy: row.updatedBy ?? undefined,
    payments: row.payments.map(toPayment),
  };
}

export async function createInvoice(
  clubId: string,
  createdBy: string,
  input: CreateInvoiceInput,
): Promise<Invoice> {
  const user = await prisma.userProfile.findFirst({
    where: { id: input.userId },
  });
  if (!user) throw new Error("User not found");

  const userName = user.displayName;

  const itemsWithTotals = input.items.map((item) => ({
    ...item,
    total: roundCurrency(item.quantity * item.unitPrice),
  }));

  const subtotal = roundCurrency(
    itemsWithTotals.reduce((acc, item) => acc + item.total, 0),
  );
  const tax = roundCurrency(input.tax ?? 0);
  const discount = roundCurrency(input.discount ?? 0);
  const total = roundCurrency(subtotal + tax - discount);

  const invoiceData = {
    clubId,
    userId: input.userId,
    userName,
    reservationId: input.reservationId ?? null,
    currency: input.currency,
    items: itemsWithTotals as unknown as Prisma.InputJsonValue,
    subtotal,
    tax,
    discount,
    total,
    notes: input.notes ?? null,
    status: "DRAFT" as const,
    createdBy,
    updatedBy: createdBy,
  };

  const createWithRetry = async () => {
    return await prisma.$transaction(async (tx) => {
      const last = await tx.invoice.findFirst({
        where: { clubId },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      const number = (last?.number ?? 0) + 1;
      return await tx.invoice.create({
        data: { ...invoiceData, number },
        include: { payments: true },
      });
    });
  };

  try {
    const row = await createWithRetry();
    return toInvoice(row as InvoiceRow);
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const row = await createWithRetry();
      return toInvoice(row as InvoiceRow);
    }
    throw e;
  }
}

export async function issueInvoice(
  clubId: string,
  id: string,
  updatedBy: string,
): Promise<Invoice> {
  const existing = await prisma.invoice.findFirst({
    where: { id, clubId },
  });
  if (!existing) throw new Error("Invoice not found");
  if (existing.status !== "DRAFT") {
    throw new Error("Only DRAFT invoices can be issued");
  }

  const row = await prisma.invoice.update({
    where: { id, clubId },
    data: {
      status: "ISSUED",
      issuedAt: new Date(),
      updatedBy,
    },
    include: { payments: true },
  });
  return toInvoice(row as InvoiceRow);
}

// Compensating action for a reservation/invoice creation flow that fails
// partway through (e.g. app/api/player/reservations/route.ts: issueInvoice
// or createCheckoutPreference throws after createInvoice already
// succeeded) — without this, the invoice is left DRAFT/ISSUED and pointing
// at a reservation that the same rollback path cancels, with nothing left
// to ever revisit it. Mirrors issueInvoice's own not-found/status-guard
// shape. Deliberately refuses to void a PAID invoice — voiding a real,
// already-recorded payment is never the right response to an unrelated
// failure and must go through an explicit refund flow instead.
export async function voidInvoice(
  clubId: string,
  id: string,
  voidedBy: string,
): Promise<Invoice> {
  const existing = await prisma.invoice.findFirst({
    where: { id, clubId },
  });
  if (!existing) throw new Error("Invoice not found");
  if (existing.status !== "DRAFT" && existing.status !== "ISSUED") {
    throw new Error("Only DRAFT or ISSUED invoices can be voided");
  }

  const row = await prisma.invoice.update({
    where: { id, clubId },
    data: {
      status: "VOID",
      voidedAt: new Date(),
      voidedBy,
      updatedBy: voidedBy,
    },
    include: { payments: true },
  });
  return toInvoice(row as InvoiceRow);
}

export async function recordPayment(
  clubId: string,
  createdBy: string,
  input: RecordPaymentInput,
): Promise<Payment> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: input.invoiceId, clubId },
  });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "ISSUED") {
    throw new Error("Only ISSUED invoices can receive payments");
  }

  const roundedAmount = roundCurrency(input.amount);
  const roundedTotal = roundCurrency(invoice.total);
  if (roundedAmount !== roundedTotal) {
    throw new Error(
      `Payment amount (${roundedAmount}) must equal invoice total (${roundedTotal})`,
    );
  }

  const paidAt = new Date();

  // The findFirst above is a best-effort pre-check only — it runs outside
  // any transaction, so two concurrent recordPayment calls for the same
  // invoice can both read ISSUED and both pass it (TOCTOU). The real guard
  // is this updateMany's own `status: "ISSUED"` clause, evaluated and
  // applied atomically by Postgres inside this transaction: only the call
  // that actually flips the row gets count === 1, so only it proceeds to
  // create the Payment. A concurrent loser sees count === 0 and throws
  // before ever creating a duplicate Payment row. The `payments_invoiceId_key`
  // unique constraint (prisma/schema.prisma) is a second, DB-level backstop
  // behind this for the same scenario — see its P2002 handling below.
  let payment: PaymentRow;
  try {
    payment = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.invoice.updateMany({
        where: { id: input.invoiceId, clubId, status: "ISSUED" },
        data: {
          status: "PAID",
          paidAt,
          updatedBy: createdBy,
        },
      });
      if (updateResult.count === 0) {
        throw new Error("Only ISSUED invoices can receive payments");
      }
      return tx.payment.create({
        data: {
          clubId,
          invoiceId: input.invoiceId,
          method: input.method,
          amount: roundedAmount,
          currency: input.currency,
          status: "COMPLETED",
          reference: input.reference ?? null,
          paidAt,
          createdBy,
        },
      });
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new Error("Only ISSUED invoices can receive payments");
    }
    throw e;
  }

  logAudit({
    clubId,
    userId: createdBy,
    userDisplayName: createdBy,
    action: "payment.confirmed",
    entity: "Payment",
    entityId: payment.id,
    metadata: { invoiceId: input.invoiceId, amount: roundedAmount },
  });

  // Dispatch payment-confirmed notification — non-throwing, does not affect return value
  try {
    const user = await prisma.userProfile.findUnique({
      where: { id: invoice.userId },
      select: { email: true, displayName: true },
    });

    const userName = user?.displayName ?? invoice.userName;

    const html = await render(
      React.createElement(PaymentConfirmed, {
        userName,
        invoiceNumber: invoice.number,
        total: roundedAmount,
        currency: input.currency,
      }),
    );

    await dispatch({
      type: "PAYMENT_CONFIRMED",
      clubId,
      recipientId: invoice.userId,
      recipientEmail: user?.email ?? null,
      recipientName: userName,
      subject: `Payment received for invoice #${invoice.number}`,
      html,
    });
  } catch {
    // notification failure must not affect payment recording
  }

  // Notify the club owner as well — non-throwing, does not affect return value
  try {
    const owner = await getClubOwner(clubId);
    if (owner) {
      await dispatch({
        type: "PAYMENT_RECEIVED",
        clubId,
        recipientId: owner.id,
        recipientEmail: owner.email,
        recipientName: owner.displayName,
        subject: "Payment received",
        html: `A payment of ${input.currency} ${roundedAmount} was received.`,
        sendEmail: false,
      });
    }
  } catch {
    // notification failure must not affect payment recording
  }

  return toPayment(payment);
}

export async function getInvoiceByReservationId(
  reservationId: string,
): Promise<Invoice | null> {
  const row = await prisma.invoice.findFirst({
    where: { reservationId },
    include: { payments: true },
    orderBy: { createdAt: "desc" },
  });
  return row ? toInvoice(row as InvoiceRow) : null;
}

// Batch check for "list" screens (e.g. my-reservations) so each row can show
// a "Download receipt" action without an N+1 query per reservation — a
// receipt only makes sense once a reservation actually has a COMPLETED
// payment behind it (PENDING/FAILED/REFUNDED invoices have nothing to
// receipt).
export async function getReservationIdsWithReceipt(
  reservationIds: string[],
): Promise<Set<string>> {
  if (reservationIds.length === 0) return new Set();

  const rows = await prisma.invoice.findMany({
    where: { reservationId: { in: reservationIds } },
    include: { payments: true },
  });

  const result = new Set<string>();
  for (const row of rows) {
    if (
      row.reservationId &&
      row.payments.some((p) => p.status === "COMPLETED")
    ) {
      result.add(row.reservationId);
    }
  }
  return result;
}

// Assembles the data needed to render a receipt PDF for a single
// reservation. Returns null when there is no invoice for this reservation,
// or the invoice has no COMPLETED payment yet — a reservation that was
// never prepaid (or whose payment never completed) has nothing to receipt.
export async function getReceiptData(
  reservationId: string,
): Promise<InvoiceReceiptData | null> {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
  });
  if (!reservation) return null;

  const invoiceRow = await prisma.invoice.findFirst({
    where: { reservationId },
    include: { payments: true, club: true },
    orderBy: { createdAt: "desc" },
  });
  if (!invoiceRow) return null;

  const completedPayments = invoiceRow.payments.filter(
    (p) => p.status === "COMPLETED",
  );
  if (completedPayments.length === 0) return null;

  return {
    id: invoiceRow.id,
    invoiceNumber: String(invoiceRow.number),
    createdAt: invoiceRow.createdAt,
    issuedAt: invoiceRow.issuedAt,
    paidAt: invoiceRow.paidAt,
    status: invoiceRow.status,
    total: invoiceRow.total,
    subtotal: invoiceRow.subtotal,
    tax: invoiceRow.tax,
    discount: invoiceRow.discount,
    currency: invoiceRow.currency,
    userName: invoiceRow.userName,
    clubName: invoiceRow.club.name,
    clubEmail: invoiceRow.club.email,
    courtName: reservation.courtName,
    scheduledStart: reservation.scheduledStart,
    scheduledEnd: reservation.scheduledEnd,
    items: Array.isArray(invoiceRow.items)
      ? invoiceRow.items.map(toInvoiceItem)
      : [],
    payments: completedPayments.map((p) => ({
      date: p.paidAt,
      method: p.method,
      amount: p.amount,
      reference: p.reference ?? undefined,
    })),
  };
}
