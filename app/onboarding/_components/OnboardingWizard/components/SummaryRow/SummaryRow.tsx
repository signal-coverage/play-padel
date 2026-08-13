import type { SummaryRowProps } from "./types";

export function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right">{value}</span>
    </div>
  );
}
