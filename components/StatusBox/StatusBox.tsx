import { cn } from "@/lib/utils/utils";
import type { StatusBoxProps } from "./types";

export function StatusBox({ children, className }: StatusBoxProps) {
  return (
    <div
      className={cn(
        "rounded-sm border p-8 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
