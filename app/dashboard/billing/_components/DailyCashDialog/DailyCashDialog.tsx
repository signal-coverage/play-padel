"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils/currency";
import { getDailyCash } from "@/app/actions/billing";
import { PAYMENT_METHOD_LABELS } from "@/core/billing/consts";
import { DEFAULT_CURRENCY } from "./consts";
import type { DailyCashSummary, PaymentMethod } from "@/core/billing/types";
import type { DailyCashDialogProps } from "./types";

export function DailyCashDialog({ open, onOpenChange }: DailyCashDialogProps) {
  const [summary, setSummary] = useState<DailyCashSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setSummary(null);
      const result = await getDailyCash().catch(() => null);
      if (cancelled) return;
      if (!result || !result.success) {
        setError(result?.error ?? "Failed to load summary");
      } else {
        setSummary(result.data);
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const currency = summary
    ? Object.keys(summary.byMethod).length > 0
      ? DEFAULT_CURRENCY
      : DEFAULT_CURRENCY
    : DEFAULT_CURRENCY;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Daily Cash Summary</DialogTitle>
          <DialogDescription>
            {summary ? `Date: ${summary.date}` : "Today's collected payments"}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {summary && !loading && (
          <div className="flex flex-col gap-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Method</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(
                  (method) => {
                    const amount = summary.byMethod[method] ?? 0;
                    return (
                      <tr key={method} className="border-b border-dashed">
                        <td className="py-1.5">
                          {PAYMENT_METHOD_LABELS[method]}
                        </td>
                        <td className="py-1.5 text-right">
                          {formatCurrency(amount, currency)}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td className="py-2 font-semibold">Total</td>
                  <td className="py-2 text-right font-semibold">
                    {formatCurrency(summary.total, currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
