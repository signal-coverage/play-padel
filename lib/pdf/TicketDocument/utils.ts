// Reused as-is from ReceiptDocument/utils.ts rather than duplicated — same
// date/time formatting rule applies to both documents, and ReceiptDocument is
// off-limits to modify for this feature.
export { formatDateTimeRange } from "@/lib/pdf/ReceiptDocument/utils";

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
};

export function formatReservationStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
