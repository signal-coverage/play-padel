"use client";

import { isSlotInteractive } from "../../utils";
import { emptySlotClassName, getSlotClassName } from "./styles";
import type { SlotCellProps } from "./types";

export function SlotCell({ slot, courtId, variant, onSlotClick }: SlotCellProps) {
  if (!slot) {
    return <div className={emptySlotClassName} aria-hidden="true" />;
  }

  const label = slot.status === "free" ? "Free" : "Locked";
  const interactive = isSlotInteractive(slot, variant, Boolean(onSlotClick));

  if (!interactive) {
    return (
      <div className={getSlotClassName(slot.status, false)}>{label}</div>
    );
  }

  return (
    <button
      type="button"
      className={getSlotClassName(slot.status, true)}
      onClick={() => onSlotClick?.(courtId, slot)}
    >
      {label}
    </button>
  );
}
