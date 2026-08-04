"use client";

import { formatSlotTime, isSlotInteractive } from "../../utils";
import { emptySlotClassName, getSlotClassName } from "./styles";
import type { SlotCellProps } from "./types";

export function SlotCell({
  slot,
  courtId,
  courtName,
  variant,
  onSlotClick,
}: SlotCellProps) {
  if (!slot) {
    return <div className={emptySlotClassName} aria-hidden="true" />;
  }

  const label = slot.status === "free" ? "Free" : "Locked";
  const interactive = isSlotInteractive(slot, variant, Boolean(onSlotClick));

  if (!interactive) {
    return <div className={getSlotClassName(slot.status, false)}>{label}</div>;
  }

  const startTime = formatSlotTime(slot.start);
  const endTime = formatSlotTime(slot.end);
  const ariaLabel =
    slot.status === "free"
      ? `Book ${courtName}, ${startTime}–${endTime}`
      : `${courtName}, ${startTime}–${endTime}, unavailable`;

  return (
    <button
      type="button"
      className={getSlotClassName(slot.status, true)}
      aria-label={ariaLabel}
      onClick={() => onSlotClick?.(courtId, slot)}
    >
      {label}
    </button>
  );
}
