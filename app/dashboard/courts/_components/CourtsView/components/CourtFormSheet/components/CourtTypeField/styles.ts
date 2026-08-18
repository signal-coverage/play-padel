import { cn } from "@/lib/utils/utils";

export function getCourtTypeOptionClassName(selected: boolean) {
  return cn(
    "flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-sm border-2 p-2.5 text-xs font-medium transition-colors duration-200 has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
    selected
      ? "border-primary bg-primary/5 text-foreground"
      : "border-border text-muted-foreground hover:border-muted-foreground/30",
  );
}
