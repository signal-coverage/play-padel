import { cn } from "@/lib/utils/utils";

export function getNetTypeOptionClassName(selected: boolean) {
  return cn(
    "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200 has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
    selected
      ? "border-primary bg-primary/10 text-primary"
      : "border-border bg-transparent text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
  );
}
