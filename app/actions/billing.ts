"use server";

import { prisma } from "@/infrastructure/db/client";
import { checkPermission } from "@/core/permissions/utils";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  recordPaymentSchema,
} from "@/core/billing/schemas/billing.schema";
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  RecordPaymentInput,
} from "@/core/billing/types";
import {
  listInvoices as _listInvoices,
  getInvoice as _getInvoice,
  createInvoice as _createInvoice,
  updateInvoice as _updateInvoice,
  issueInvoice as _issueInvoice,
  voidInvoice as _voidInvoice,
  recordPayment as _recordPayment,
  getDailyCash as _getDailyCash,
} from "@/core/billing/services/billing.service";
import type {
  Invoice,
  Payment,
  InvoiceFilters,
  InvoiceItem,
  InvoiceReceiptData,
  PaginatedInvoices,
  DailyCashSummary,
  ActionResult,
} from "@/core/billing/types";
import { requireOrgProfile } from "@/lib/auth/require-org-profile";
import { logAudit } from "@/core/audit/services/audit.service";
import { eventBus } from "@/core/events/event-bus";

export async function getInvoices(
  filters?: InvoiceFilters,
): Promise<ActionResult<PaginatedInvoices>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "billing.read",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const f = filters ?? {};
    const data = await _listInvoices(
      profile.organizationId,
      f,
      f.page,
      f.pageSize,
    );
    return { success: true, data };
  } catch (error) {
    console.error("getInvoices error:", error);
    return { success: false, error: "Failed to fetch invoices" };
  }
}

export async function getInvoice(id: string): Promise<ActionResult<Invoice>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "billing.read",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const data = await _getInvoice(profile.organizationId, id);
    return { success: true, data };
  } catch (error) {
    console.error("getInvoice error:", error);
    return { success: false, error: "Failed to fetch invoice" };
  }
}

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<ActionResult<Invoice>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "billing.create",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const parsed = createInvoiceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Validation error",
      };
    }
    const data = await _createInvoice(
      profile.organizationId,
      profile.id,
      parsed.data as CreateInvoiceInput,
    );
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "invoice.created",
      entity: "invoice",
      entityId: data.id,
    });
    return { success: true, data };
  } catch (error) {
    console.error("createInvoice error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create invoice",
    };
  }
}

export async function updateInvoice(
  id: string,
  input: UpdateInvoiceInput,
): Promise<ActionResult<Invoice>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "billing.update",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const parsed = updateInvoiceSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Validation error",
      };
    }
    const data = await _updateInvoice(
      profile.organizationId,
      id,
      profile.id,
      parsed.data as UpdateInvoiceInput,
    );
    return { success: true, data };
  } catch (error) {
    console.error("updateInvoice error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update invoice",
    };
  }
}

export async function issueInvoice(id: string): Promise<ActionResult<Invoice>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "billing.update",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const data = await _issueInvoice(profile.organizationId, id, profile.id);
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "invoice.issued",
      entity: "invoice",
      entityId: id,
    });
    eventBus
      .emit("invoice.issued", {
        invoiceId: data.id,
        organizationId: profile.organizationId,
        patientId: data.patientId,
        amount: data.total,
      })
      .catch(() => null);
    return { success: true, data };
  } catch (error) {
    console.error("issueInvoice error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to issue invoice",
    };
  }
}

export async function voidInvoice(id: string): Promise<ActionResult<Invoice>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "billing.update",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const data = await _voidInvoice(profile.organizationId, id, profile.id);
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "invoice.voided",
      entity: "invoice",
      entityId: id,
    });
    return { success: true, data };
  } catch (error) {
    console.error("voidInvoice error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to void invoice",
    };
  }
}

export async function recordPayment(
  input: RecordPaymentInput,
): Promise<ActionResult<Payment>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "billing.update",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const parsed = recordPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Validation error",
      };
    }
    const data = await _recordPayment(
      profile.organizationId,
      profile.id,
      parsed.data as RecordPaymentInput,
    );
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "invoice.paid",
      entity: "invoice",
      entityId: data.invoiceId,
    });
    prisma.invoice
      .findUnique({
        where: { id: data.invoiceId },
        select: { patientId: true },
      })
      .then((invoice) => {
        if (!invoice) return;
        eventBus
          .emit("invoice.paid", {
            invoiceId: data.invoiceId,
            organizationId: data.organizationId,
            patientId: invoice.patientId,
            amount: data.amount,
            method: data.method,
          })
          .catch(() => null);
      })
      .catch(() => null);
    return { success: true, data };
  } catch (error) {
    console.error("recordPayment error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to record payment",
    };
  }
}

export async function getInvoiceForReceipt(
  invoiceId: string,
): Promise<ActionResult<InvoiceReceiptData>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "billing.read",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: profile.organizationId },
      include: {
        payments: {
          where: { status: "COMPLETED" },
          orderBy: { paidAt: "asc" },
        },
        organization: { select: { name: true, email: true } },
      },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    const rawItems = Array.isArray(invoice.items)
      ? (invoice.items as unknown as InvoiceItem[])
      : [];

    const items =
      rawItems.length > 0
        ? rawItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          }))
        : [
            {
              description: "Professional services",
              quantity: 1,
              unitPrice: invoice.total,
              total: invoice.total,
            },
          ];

    const data: InvoiceReceiptData = {
      id: invoice.id,
      invoiceNumber: String(invoice.number).padStart(4, "0"),
      createdAt: invoice.createdAt,
      issuedAt: invoice.issuedAt,
      paidAt: invoice.paidAt,
      status: invoice.status,
      total: invoice.total,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      discount: invoice.discount,
      currency: invoice.currency,
      patientName: invoice.patientName,
      organizationName: invoice.organization.name,
      organizationEmail: invoice.organization.email,
      items,
      payments: invoice.payments.map((p) => ({
        date: p.paidAt,
        method: p.method,
        amount: p.amount,
      })),
    };

    return { success: true, data };
  } catch (error) {
    console.error("getInvoiceForReceipt error:", error);
    return { success: false, error: "Failed to fetch invoice for receipt" };
  }
}

export async function getDailyCash(): Promise<ActionResult<DailyCashSummary>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "billing.read",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const data = await _getDailyCash(profile.organizationId);
    return { success: true, data };
  } catch (error) {
    console.error("getDailyCash error:", error);
    return { success: false, error: "Failed to fetch daily cash summary" };
  }
}
