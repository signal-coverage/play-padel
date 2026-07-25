"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/core/permissions/hooks/use-permission";
import { getInvoices, issueInvoice, voidInvoice } from "@/app/actions/billing";
import { InvoiceFilters } from "@/app/dashboard/billing/_components/InvoiceFilters";
import { InvoiceTable } from "@/app/dashboard/billing/_components/InvoiceTable";
import { InvoiceSheet } from "@/app/dashboard/billing/_components/InvoiceSheet";
import { PaymentSheet } from "@/app/dashboard/billing/_components/PaymentSheet";
import { DailyCashDialog } from "@/app/dashboard/billing/_components/DailyCashDialog";
import type {
  Invoice,
  InvoiceFilters as InvoiceFiltersType,
} from "@/core/billing/types";
import type { SheetMode } from "./types";

export function BillingPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("billing.create");
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<InvoiceFiltersType>({
    page: 1,
    pageSize: 20,
  });
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null);
  const [cashDialogOpen, setCashDialogOpen] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ["invoices", filters],
    queryFn: () => getInvoices(filters),
    placeholderData: (prev) => prev,
  });

  const invoices = data?.success ? data.data.invoices : [];
  const total = data?.success ? data.data.total : 0;

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  }

  function handleNewInvoice() {
    setSelectedInvoice(null);
    setSheetMode("create");
  }

  function handleEdit(invoice: Invoice) {
    setSelectedInvoice(invoice);
    setSheetMode("edit");
  }

  async function handleIssue(invoice: Invoice) {
    const result = await issueInvoice(invoice.id).catch(() => null);
    if (!result || !result.success) {
      toast.error(result?.error ?? "Failed to issue invoice");
      return;
    }
    toast.success("Invoice issued");
    refresh();
  }

  async function handleVoid(invoice: Invoice) {
    const result = await voidInvoice(invoice.id).catch(() => null);
    if (!result || !result.success) {
      toast.error(result?.error ?? "Failed to void invoice");
      return;
    }
    toast.success("Invoice voided");
    refresh();
  }

  function handlePay(invoice: Invoice) {
    setPaymentTarget(invoice);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage invoices and payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCashDialogOpen(true)}>
            Daily Cash
          </Button>
          {canCreate && <Button onClick={handleNewInvoice}>New Invoice</Button>}
        </div>
      </div>

      <InvoiceFilters filters={filters} onFiltersChange={setFilters} />

      <InvoiceTable
        invoices={invoices}
        isLoading={isFetching}
        onEdit={handleEdit}
        onIssue={handleIssue}
        onVoid={handleVoid}
        onPay={handlePay}
      />

      <InvoiceSheet
        open={sheetMode !== null}
        onOpenChange={(open) => {
          if (!open) setSheetMode(null);
        }}
        mode={sheetMode ?? "create"}
        invoice={selectedInvoice ?? undefined}
        onSuccess={refresh}
      />

      <PaymentSheet
        open={paymentTarget !== null}
        onOpenChange={(open) => {
          if (!open) setPaymentTarget(null);
        }}
        invoice={paymentTarget}
        onSuccess={refresh}
      />

      <DailyCashDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} />
    </div>
  );
}
