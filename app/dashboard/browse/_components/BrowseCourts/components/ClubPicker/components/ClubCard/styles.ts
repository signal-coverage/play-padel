import { cn } from "@/lib/utils/utils";

export function getClubCardClassName(selected: boolean) {
  return cn(
    "flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors duration-200 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    selected
      ? "border-primary bg-primary/5"
      : "border-border hover:border-muted-foreground/30",
  );
}
