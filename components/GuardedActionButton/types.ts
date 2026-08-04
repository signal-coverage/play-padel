import type { ComponentProps } from "react";
import type { Button } from "@/components/ui/button";

export type GuardedActionButtonProps = Omit<
  ComponentProps<typeof Button>,
  "onClick" | "aria-disabled"
> & {
  /** Whether the action this button triggers is currently in flight. */
  isPending: boolean;
  /** The guarded action. Ignored while `isPending` is true. */
  onClick: () => void;
};
