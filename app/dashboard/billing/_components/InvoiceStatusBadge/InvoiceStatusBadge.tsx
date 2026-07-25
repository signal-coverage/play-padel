import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/utils";
import {
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_VARIANT,
  INVOICE_STATUS_CLASS,
} from "./consts";
import type { InvoiceStatusBadgeProps } from "./types";

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  return (
    <Badge
      variant={INVOICE_STATUS_VARIANT[status]}
      className={cn(INVOICE_STATUS_CLASS[status])}
    >
      {INVOICE_STATUS_LABEL[status]}
    </Badge>
  );
}
