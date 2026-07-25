import { startOfDay, endOfDay } from "date-fns";
import { render } from "@react-email/render";
import * as React from "react";
import { prisma } from "@/infrastructure/db/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { dispatch } from "@/lib/notifications/dispatcher";
import { InvoicePaid } from "@/lib/email/templates/InvoicePaid";
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
    organizationId: row.organizationId,
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
    organizationId: row.organizationId,
    patientId: row.patientId,
    patientName: row.patientName,
    appointmentId: row.appointmentId ?? undefined,
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
  orgId: string,
  filters: InvoiceFilters,
  page = 1,
  pageSize = 20,
): Promise<PaginatedInvoices> {
  const skip = (page - 1) * pageSize;

  const where: Prisma.InvoiceWhereInput = {
    organizationId: orgId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.patientId ? { patientId: filters.patientId } : {}),
    ...(filters.search
      ? { patientName: { contains: filters.search, mode: "insensitive" } }
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

export async function getInvoice(orgId: string, id: string): Promise<Invoice> {
  const row = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId },
    include: { payments: true },
  });
  if (!row) throw new Error("Invoice not found");
  return toInvoice(row as InvoiceRow);
}

export async function createInvoice(
  orgId: string,
  createdBy: string,
  input: CreateInvoiceInput,
): Promise<Invoice> {
  const patient = await prisma.patient.findFirst({
    where: { id: input.patientId, organizationId: orgId },
  });
  if (!patient) throw new Error("Patient not found");

  const patientName = `${patient.firstName} ${patient.lastName}`.trim();

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
    organizationId: orgId,
    patientId: input.patientId,
    patientName,
    appointmentId: input.appointmentId ?? null,
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
        where: { organizationId: orgId },
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
  orgId: string,
  id: string,
  updatedBy: string,
  input: UpdateInvoiceInput,
): Promise<Invoice> {
  const existing = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId },
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
    where: { id, organizationId: orgId },
    data: updateData,
    include: { payments: true },
  });
  return toInvoice(row as InvoiceRow);
}

export async function issueInvoice(
  orgId: string,
  id: string,
  updatedBy: string,
): Promise<Invoice> {
  const existing = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) throw new Error("Invoice not found");
  if (existing.status !== "DRAFT") {
    throw new Error("Only DRAFT invoices can be issued");
  }

  const row = await prisma.invoice.update({
    where: { id, organizationId: orgId },
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
  orgId: string,
  id: string,
  voidedBy: string,
): Promise<Invoice> {
  const existing = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId },
  });
  if (!existing) throw new Error("Invoice not found");
  if (existing.status === "PAID") {
    throw new Error("PAID invoices cannot be voided");
  }
  if (existing.status === "VOID") {
    throw new Error("Invoice is already VOID");
  }

  const row = await prisma.invoice.update({
    where: { id, organizationId: orgId },
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
  orgId: string,
  createdBy: string,
  input: RecordPaymentInput,
): Promise<Payment> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: input.invoiceId, organizationId: orgId },
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
        organizationId: orgId,
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
      where: { id: input.invoiceId, organizationId: orgId },
      data: {
        status: "PAID",
        paidAt,
        updatedBy: createdBy,
      },
    }),
  ]);

  // Dispatch paid notification — non-throwing, does not affect return value
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: invoice.patientId },
      select: { email: true, firstName: true, lastName: true },
    });

    const patientName = patient
      ? `${patient.firstName} ${patient.lastName}`.trim()
      : invoice.patientName;

    const html = await render(
      React.createElement(InvoicePaid, {
        patientName,
        invoiceNumber: invoice.number,
        total: roundedAmount,
        currency: input.currency,
      }),
    );

    await dispatch({
      type: "INVOICE_PAID",
      organizationId: orgId,
      recipientId: invoice.patientId,
      recipientEmail: patient?.email ?? null,
      recipientName: patientName,
      subject: `Payment received for invoice #${invoice.number}`,
      html,
    });
  } catch {
    // notification failure must not affect payment recording
  }

  return toPayment(payment);
}

export async function getDailyCash(orgId: string): Promise<DailyCashSummary> {
  const now = new Date();
  const utcStart = startOfDay(now);
  const utcEnd = endOfDay(now);

  const payments = await prisma.payment.findMany({
    where: {
      organizationId: orgId,
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
