import { Spinner } from "@/components/ui/spinner";

export function DashboardLoader() {
  return (
    <div className="h-svh w-full flex flex-col items-center justify-center gap-3">
      <Spinner className="size-8 text-primary" />
      <p className="text-sm text-muted-foreground">Loading your workspace…</p>
    </div>
  );
}
