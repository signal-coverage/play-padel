"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";
import type { PaymentMethodPickerProps } from "./types";

const METHOD_LABELS: Record<
  PaymentMethodPickerProps["availableMethods"][number],
  string
> = {
  MERCADOPAGO: "Mercado Pago",
  TRANSFER: "Bank transfer",
};

/** Only renders when there's an actual choice — a club with just one
 * configured method uses it directly, with zero UI change from before this
 * feature existed. */
export function PaymentMethodPicker({
  availableMethods,
  selectedMethod,
  onSelectMethod,
}: PaymentMethodPickerProps) {
  if (availableMethods.length < 2) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">Pay with</p>
      <div className="flex gap-2">
        {availableMethods.map((method) => (
          <Button
            key={method}
            type="button"
            variant={selectedMethod === method ? "default" : "outline"}
            size="sm"
            className={cn("flex-1")}
            onClick={() => onSelectMethod(method)}
          >
            {METHOD_LABELS[method]}
          </Button>
        ))}
      </div>
    </div>
  );
}
