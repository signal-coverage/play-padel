import type { Invoice } from "@/core/billing/types";

export interface PaymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onSuccess: () => void;
}
