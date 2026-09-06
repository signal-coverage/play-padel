"use client";

import { Children } from "react";
import { Separator } from "@/components/ui/separator";
import { useShouldStackTabColumns } from "@/hooks/use-should-stack-tab-columns";
import type { TabColumnsLayoutProps } from "./types";

// Generalizes CourtFormSheet's ad-hoc two-column layout (widened container,
// vertical Separator, two `flex-1 flex-col` columns) into a shared primitive
// for any tab/panel that needs the same split — e.g. ClubSettingsView's
// Basic information / Legal information columns. Below 809px the split
// collapses to a single stacked column (first on top, second below) with a
// horizontal Separator instead — the columns get too cramped otherwise.
export function TabColumnsLayout({
  columns = "one",
  children,
}: TabColumnsLayoutProps) {
  const stacked = useShouldStackTabColumns();

  if (columns === "two") {
    const [first, second] = Children.toArray(children);

    if (stacked) {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-4">{first}</div>
          <Separator orientation="horizontal" />
          <div className="flex min-w-0 flex-col gap-4">{second}</div>
        </div>
      );
    }

    return (
      <div className="flex flex-1 gap-4">
        {/* Explicit w-1/2 (not flex-1) so the split is always exactly half
            and half regardless of how much content either column holds —
            flex-1's equal-grow-from-zero-basis happens to produce the same
            result in the common case, but an explicit width is unambiguous. */}
        <div className="flex w-1/2 min-w-0 flex-col gap-4">{first}</div>
        <Separator orientation="vertical" />
        <div className="flex w-1/2 min-w-0 flex-col gap-4">{second}</div>
      </div>
    );
  }

  return <div className="flex flex-col gap-4">{children}</div>;
}
