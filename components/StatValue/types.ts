import type { ReactNode } from "react";

export type StatValueVariant = "pill" | "stacked" | "row" | "inline";

export type StatValueProps = {
  label: string;
  value: string;
  variant?: StatValueVariant;
  /** Escape hatch for value-specific overrides, e.g. keeping `tabular-nums`
   * or swapping a row's default `font-medium` for `font-semibold`. */
  valueClassName?: string;
  /** For `variant="row"`: render this instead of the `value` text, e.g. a
   * `Badge` for a status row. */
  valueSlot?: ReactNode;
};
