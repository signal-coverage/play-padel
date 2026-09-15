"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";
import type { PaymentMethodPickerProps } from "./types";

/** Only renders when there's an actual choice — a club with just one
 * configured method uses it directly, with zero UI change from before this
 * feature existed. */
export function PaymentMethodPicker({
  availableMethods,
  selectedMethod,
  onSelectMethod,
}: PaymentMethodPickerProps) {
  const t = useTranslations("PaymentMethodPicker");
  // "Mercado Pago" is a brand name and is never translated.
  const methodLabels: Record<
    PaymentMethodPickerProps["availableMethods"][number],
    string
  > = {
    MERCADOPAGO: "Mercado Pago",
    TRANSFER: t("bankTransfer"),
  };

  if (availableMethods.length < 2) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">
        {t("payWith")}
      </p>
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
            {methodLabels[method]}
          </Button>
        ))}
      </div>
    </div>
  );
}
