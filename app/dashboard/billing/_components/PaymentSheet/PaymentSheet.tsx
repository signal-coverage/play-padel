"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  recordPaymentSchema,
  type RecordPaymentSchemaInput,
} from "@/core/billing/schemas/billing.schema";
import { recordPayment } from "@/app/actions/billing";
import { PAYMENT_METHOD_LABELS } from "./consts";
import type { PaymentSheetProps } from "./types";

export function PaymentSheet({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: PaymentSheetProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecordPaymentSchemaInput>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      invoiceId: "",
      method: "CASH",
      amount: 0,
      currency: "USD",
    },
  });

  useEffect(() => {
    if (open && invoice) {
      reset({
        invoiceId: invoice.id,
        method: "CASH",
        amount: invoice.total,
        currency: invoice.currency,
        reference: "",
      });
    }
  }, [open, invoice, reset]);

  async function onSubmit(data: RecordPaymentSchemaInput) {
    try {
      const result = await recordPayment(data);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Payment recorded");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("An unexpected error occurred");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Record Payment</SheetTitle>
          <SheetDescription>
            {invoice
              ? `Invoice ${`INV-${String(invoice.number).padStart(4, "0")}`} — ${invoice.patientName}`
              : "Record payment for invoice"}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-4 py-2"
        >
          <input type="hidden" {...register("invoiceId")} />
          <input type="hidden" {...register("currency")} />

          <div className="flex flex-col gap-1">
            <Label htmlFor="method">Payment method *</Label>
            <Select
              defaultValue="CASH"
              onValueChange={(v) =>
                setValue("method", v as RecordPaymentSchemaInput["method"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="method">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(PAYMENT_METHOD_LABELS) as [
                    keyof typeof PAYMENT_METHOD_LABELS,
                    string,
                  ][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.method && (
              <p className="text-xs text-destructive">
                {errors.method.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step={0.01}
              readOnly
              {...register("amount", { valueAsNumber: true })}
              className="bg-muted"
            />
            {errors.amount && (
              <p className="text-xs text-destructive">
                {errors.amount.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="reference">Reference (optional)</Label>
            <Input
              id="reference"
              placeholder="Transaction ID, check number..."
              {...register("reference")}
            />
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Recording..." : "Record payment"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
