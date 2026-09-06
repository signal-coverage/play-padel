import type { ReactNode } from "react";

export type TabColumnsLayoutProps = {
  // Defaults to "one" — a single flex-col column, visually identical to the
  // plain wrapper most tab panels already use. "two" splits `children` (which
  // must be exactly two nodes) into a pair of columns separated by a
  // vertical Separator, mirroring CourtFormSheet's established two-column
  // drawer pattern (see AGENTS.md's "Forms inside Drawers" convention) — below
  // 809px it instead stacks into one column with a horizontal Separator.
  columns?: "one" | "two";
  children: ReactNode;
};
