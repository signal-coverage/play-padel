import { useTranslations } from "next-intl";
import { CircleDollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import type { BookingConfirmPriceTagProps } from "./types";

export function BookingConfirmPriceTag({
  paymentState,
  currency,
}: BookingConfirmPriceTagProps) {
  const t = useTranslations("BookingConfirmDialog");

  if (paymentState.kind === "price-missing") {
    return <Badge variant="destructive">{t("priceNotSet")}</Badge>;
  }

  if (paymentState.kind === "free") {
    return (
      <Badge variant="success">
        <CircleDollarSign aria-hidden="true" />
        {t("freeBadge")}
      </Badge>
    );
  }

  return (
    <Badge variant="default">
      <CircleDollarSign aria-hidden="true" />
      {formatCurrency(paymentState.price, currency)}
      <span className="font-normal opacity-80">· {t("payNowBadge")}</span>
    </Badge>
  );
}
