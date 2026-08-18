import { format } from "date-fns";

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

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
