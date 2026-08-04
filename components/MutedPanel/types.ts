import type { ReactNode } from "react";

export type MutedPanelProps = {
  children: ReactNode;
  /** Renders a visible border and switches to the slightly lighter muted background used in bordered contexts. */
  bordered?: boolean;
  /** Controls the panel's padding scale. Defaults to "sm" (compact, e.g. inline insights). */
  size?: "sm" | "md";
  className?: string;
};
