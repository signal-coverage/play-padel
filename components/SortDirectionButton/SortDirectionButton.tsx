"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SortDirectionButtonProps } from "./types";

export function SortDirectionButton({
  direction,
  onToggle,
}: SortDirectionButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={
        direction === "asc"
          ? "Sort ascending, click to sort descending"
          : "Sort descending, click to sort ascending"
      }
      onClick={onToggle}
    >
      {direction === "asc" ? <ArrowUp /> : <ArrowDown />}
    </Button>
  );
}
