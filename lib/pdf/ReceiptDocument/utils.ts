import { format } from "date-fns";

// Reused (not reimplemented) so a PDF receipt always shows the exact same
// es-AR formatting as the live UI for the same amount — this file used to
// carry its own hardcoded-en-US copy, which could disagree with the UI's
// formatting for the same number.
export { formatCurrency } from "@/lib/utils/currency";

export function formatDate(date: Date | null): string {
  return date ? format(date, "MMM d, yyyy") : "—";
}

export function formatDateTimeRange(start: Date, end: Date): string {
  return `${format(start, "EEE, MMM d, yyyy · h:mmaaa")} – ${format(end, "h:mmaaa")}`;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  TRANSFER: "Transfer",
  DIGITAL: "Digital",
};

export function formatPaymentMethod(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}
