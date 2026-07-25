import { startOfDay, endOfDay } from "date-fns";
import { render } from "@react-email/render";
import * as React from "react";
import { prisma } from "@/infrastructure/db/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { dispatch } from "@/lib/notifications/dispatcher";
import { PaymentConfirmed } from "@/lib/email/templates/PaymentConfirmed";
import type {
  Invoice,
  InvoiceItem,
  Payment,
  InvoiceFilters,
  PaginatedInvoices,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  RecordPaymentInput,
  DailyCashSummary,
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

export async function listInvoices(
  clubId: string,
  filters: InvoiceFilters,
  page = 1,
  pageSize = 20,
): Promise<PaginatedInvoices> {
  const skip = (page - 1) * pageSize;

  const where: Prisma.InvoiceWhereInput = {
    clubId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.userId ? { userId: filters.userId } : {}),
    ...(filters.search
      ? { userName: { contains: filters.search, mode: "insensitive" } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { payments: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    invoices: rows.map((r) => toInvoice(r as InvoiceRow)),
    total,
    page,
    pageSize,
  };
}

export async function getInvoice(clubId: string, id: string): Promise<Invoice> {
  const row = await prisma.invoice.findFirst({
    where: { id, clubId },
    include: { payments: true },
  });
  if (!row) throw new Error("Invoice not found");
  return toInvoice(row as InvoiceRow);
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
    total: Math.round(item.quantity * item.unitPrice * 100) / 100,
  }));

  const subtotal =
    Math.round(
      itemsWithTotals.reduce((acc, item) => acc + item.total, 0) * 100,
    ) / 100;
  const tax = Math.round((input.tax ?? 0) * 100) / 100;
  const discount = Math.round((input.discount ?? 0) * 100) / 100;
  const total = Math.round((subtotal + tax - discount) * 100) / 100;

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

export async function updateInvoice(
  clubId: string,
  id: string,
  updatedBy: string,
  input: UpdateInvoiceInput,
): Promise<Invoice> {
  const existing = await prisma.invoice.findFirst({
    where: { id, clubId },
  });
  if (!existing) throw new Error("Invoice not found");
  if (existing.status !== "DRAFT") {
    throw new Error("Only DRAFT invoices can be edited");
  }

  const updateData: Prisma.InvoiceUpdateInput = { updatedBy };

  if (input.items !== undefined) {
    const itemsWithTotals = input.items.map((item) => ({
      ...item,
      total: Math.round(item.quantity * item.unitPrice * 100) / 100,
    }));
    const subtotal =
      Math.round(
        itemsWithTotals.reduce((acc, item) => acc + item.total, 0) * 100,
      ) / 100;
    const tax =
      input.tax !== undefined
        ? Math.round(input.tax * 100) / 100
        : existing.tax;
    const discount =
      input.discount !== undefined
        ? Math.round(input.discount * 100) / 100
        : existing.discount;
    const total = Math.round((subtotal + tax - discount) * 100) / 100;

    updateData.items = itemsWithTotals as unknown as Prisma.InputJsonValue;
    updateData.subtotal = subtotal;
    updateData.tax = tax;
    updateData.discount = discount;
    updateData.total = total;
  } else {
    if (input.tax !== undefined) {
      updateData.tax = Math.round(input.tax * 100) / 100;
    }
    if (input.discount !== undefined) {
      updateData.discount = Math.round(input.discount * 100) / 100;
    }
    // Recompute total if tax or discount changed
    if (input.tax !== undefined || input.discount !== undefined) {
      const tax =
        input.tax !== undefined
          ? Math.round(input.tax * 100) / 100
          : existing.tax;
      const discount =
        input.discount !== undefined
          ? Math.round(input.discount * 100) / 100
          : existing.discount;
      updateData.total =
        Math.round((existing.subtotal + tax - discount) * 100) / 100;
    }
  }

  if (input.notes !== undefined) {
    updateData.notes = input.notes;
  }

  const row = await prisma.invoice.update({
    where: { id, clubId },
    data: updateData,
    include: { payments: true },
  });
  return toInvoice(row as InvoiceRow);
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

export async function voidInvoice(
  clubId: string,
  id: string,
  voidedBy: string,
): Promise<Invoice> {
  const existing = await prisma.invoice.findFirst({
    where: { id, clubId },
  });
  if (!existing) throw new Error("Invoice not found");
  if (existing.status === "PAID") {
    throw new Error("PAID invoices cannot be voided");
  }
  if (existing.status === "VOID") {
    throw new Error("Invoice is already VOID");
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

  const roundedAmount = Math.round(input.amount * 100) / 100;
  const roundedTotal = Math.round(invoice.total * 100) / 100;
  if (roundedAmount !== roundedTotal) {
    throw new Error(
      `Payment amount (${roundedAmount}) must equal invoice total (${roundedTotal})`,
    );
  }

  const paidAt = new Date();

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
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
    }),
    prisma.invoice.update({
      where: { id: input.invoiceId, clubId },
      data: {
        status: "PAID",
        paidAt,
        updatedBy: createdBy,
      },
    }),
  ]);

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

  return toPayment(payment);
}

export async function getDailyCash(clubId: string): Promise<DailyCashSummary> {
  const now = new Date();
  const utcStart = startOfDay(now);
  const utcEnd = endOfDay(now);

  const payments = await prisma.payment.findMany({
    where: {
      clubId,
      status: "COMPLETED",
      paidAt: {
        gte: utcStart,
        lte: utcEnd,
      },
    },
  });

  const byMethod: Partial<Record<PaymentMethod, number>> = {};
  let total = 0;

  for (const p of payments) {
    const method = p.method as PaymentMethod;
    byMethod[method] =
      Math.round(((byMethod[method] ?? 0) + p.amount) * 100) / 100;
    total = Math.round((total + p.amount) * 100) / 100;
  }

  return {
    date: now.toISOString().slice(0, 10),
    total,
    byMethod,
  };
}
