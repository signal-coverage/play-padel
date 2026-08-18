import { SLOT_DURATION_OPTIONS } from "./consts";

/** Keeps a legacy slot duration that predates the fixed option list
 * selectable instead of silently discarding it. */
export function slotDurationOptionsWith(value: number): readonly number[] {
  return (SLOT_DURATION_OPTIONS as readonly number[]).includes(value)
    ? SLOT_DURATION_OPTIONS
    : [...SLOT_DURATION_OPTIONS, value].sort((a, b) => a - b);
}
