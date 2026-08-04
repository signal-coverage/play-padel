"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";
import type { GuardedActionButtonProps } from "./types";

/**
 * A `Button` that disables itself (visually and to pointer events) while
 * `isPending` is true, and refuses to invoke `onClick` in that state. This
 * consolidates the `aria-disabled` + guarded-click pattern shared by every
 * confirmation dialog's action button.
 */
export function GuardedActionButton({
  isPending,
  onClick,
  className,
  ...props
}: GuardedActionButtonProps) {
  return (
    <Button
      aria-disabled={isPending}
      className={cn(
        "aria-disabled:pointer-events-none aria-disabled:opacity-50",
        className,
      )}
      onClick={() => {
        if (isPending) return;
        onClick();
      }}
      {...props}
    />
  );
}
