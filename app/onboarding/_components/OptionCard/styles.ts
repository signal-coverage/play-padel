import { cn } from "@/lib/utils/utils";

export function getOptionCardClassName(selected: boolean) {
  return cn(
    "items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors duration-200",
    selected
      ? "border-primary bg-primary/5"
      : "border-border hover:border-muted-foreground/30",
  );
}
