import { cn } from "@/lib/utils/utils";
import type { NavBadgeProps } from "./types";

const LABEL_TEXT: Record<NavBadgeProps["label"], string> = {
  new: "New",
  open: "Open",
};

export function NavBadge({
  label,
  variant = "pill",
  className,
}: NavBadgeProps) {
  const text = LABEL_TEXT[label];

  if (variant === "dot") {
    return (
      <span className={cn("absolute -top-0.5 -right-0.5", className)}>
        <span className="sr-only">{text}</span>
        <span
          aria-hidden="true"
          className="block h-2 w-2 rounded-full bg-destructive"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "ml-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground",
        className,
      )}
    >
      {text}
    </span>
  );
}
