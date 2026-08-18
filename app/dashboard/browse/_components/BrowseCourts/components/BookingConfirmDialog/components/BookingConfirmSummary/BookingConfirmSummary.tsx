import { formatSlotDate, formatSlotTimeRange } from "../../utils";
import { BookingConfirmPriceTag } from "../BookingConfirmPriceTag";
import type { BookingConfirmSummaryProps } from "./types";

export function BookingConfirmSummary({
  courtName,
  slot,
  paymentState,
  currency,
}: BookingConfirmSummaryProps) {
  return (
    <div className="flex flex-col gap-3 rounded-sm border bg-muted/40 p-4">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-foreground">{courtName}</p>
        {slot && (
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatSlotDate(slot.start)} ·{" "}
            {formatSlotTimeRange(slot.start, slot.end)}
          </p>
        )}
      </div>

      <BookingConfirmPriceTag paymentState={paymentState} currency={currency} />
    </div>
  );
}
