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
  onJoinWaitlist,
}: SlotCellProps) {
  if (!slot) {
    return <div className={emptySlotClassName} aria-hidden="true" />;
  }

  const startTime = formatSlotTime(slot.start);
  const endTime = formatSlotTime(slot.end);

  // A locked slot with a wired-up onJoinWaitlist handler gets its own
  // dedicated rendering branch, deliberately separate from the
  // free/closed/interactive logic below: this is not "booking" (onSlotClick
  // stays exclusively that), it's a completely different action with its
  // own two states (offer to join / already joined). Any caller that
  // doesn't pass onJoinWaitlist (including every owner-side consumer) never
  // enters this branch, so its behavior is byte-identical to before this
  // feature existed.
  if (slot.status === "locked" && variant === "player" && onJoinWaitlist) {
    if (slot.waitlisted) {
      return (
        <div
          className={getSlotClassName(slot.status, false)}
          aria-label={`${courtName}, ${startTime}–${endTime}, you're on the waitlist`}
        >
          Waitlisted
        </div>
      );
    }
    return (
      <button
        type="button"
        className={getSlotClassName(slot.status, true)}
        aria-label={`Get notified if ${courtName}, ${startTime}–${endTime} frees up`}
        onClick={() => onJoinWaitlist(courtId, slot)}
      >
        Notify me
      </button>
    );
  }

  const label =
    slot.status === "free"
      ? "Free"
      : slot.status === "closed"
        ? "Closed"
        : "Locked";
  const interactive = isSlotInteractive(slot, variant, Boolean(onSlotClick));

  if (!interactive) {
    return (
      <div
        className={getSlotClassName(slot.status, false)}
        title={slot.status === "closed" ? slot.closureReason : undefined}
        aria-label={
          slot.status === "closed" && slot.closureReason
            ? `Closed: ${slot.closureReason}`
            : undefined
        }
      >
        {label}
      </div>
    );
  }

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
