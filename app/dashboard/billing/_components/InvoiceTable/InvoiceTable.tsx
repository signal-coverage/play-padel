"use client";

import { PencilIcon, SendIcon, BanIcon, CreditCardIcon } from "lucide-react";
import { DownloadReceiptButton } from "./DownloadReceiptButton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceStatusBadge } from "@/app/dashboard/billing/_components/InvoiceStatusBadge";
import { formatCurrency } from "@/lib/utils/currency";
import { INVOICE_TABLE_COLUMNS } from "./consts";
import { formatInvoiceNumber } from "./utils";
import type { InvoiceTableProps } from "./types";

function formatDate(date: Date | undefined): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function InvoiceTable({
  invoices,
  isLoading,
  onEdit,
  onIssue,
  onVoid,
  onPay,
}: InvoiceTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {INVOICE_TABLE_COLUMNS.map((col) => (
            <TableHead key={col.key}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              {INVOICE_TABLE_COLUMNS.map((col) => (
                <TableCell key={col.key}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : invoices.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={INVOICE_TABLE_COLUMNS.length}
              className="h-24 text-center text-muted-foreground"
            >
              No invoices found.
            </TableCell>
          </TableRow>
        ) : (
          invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-mono font-medium">
                {formatInvoiceNumber(invoice.number)}
              </TableCell>
              <TableCell>{invoice.patientName}</TableCell>
              <TableCell>
                <InvoiceStatusBadge status={invoice.status} />
              </TableCell>
              <TableCell className="font-medium">
                {formatCurrency(invoice.total, invoice.currency)}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {formatDate(invoice.issuedAt)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {invoice.status === "DRAFT" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(invoice)}
                      aria-label="Edit invoice"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  )}
                  {invoice.status === "DRAFT" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onIssue(invoice)}
                      aria-label="Issue invoice"
                    >
                      <SendIcon className="h-4 w-4" />
                    </Button>
                  )}
                  {invoice.status === "ISSUED" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onPay(invoice)}
                      aria-label="Record payment"
                    >
                      <CreditCardIcon className="h-4 w-4" />
                    </Button>
                  )}
                  {(invoice.status === "DRAFT" ||
                    invoice.status === "ISSUED") && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onVoid(invoice)}
                      aria-label="Void invoice"
                    >
                      <BanIcon className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                  {invoice.status === "PAID" && (
                    <DownloadReceiptButton
                      invoiceId={invoice.id}
                      invoiceNumber={formatInvoiceNumber(invoice.number)}
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
