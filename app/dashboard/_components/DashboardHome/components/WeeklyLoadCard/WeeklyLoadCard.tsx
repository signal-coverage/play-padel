import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import type { SystemRole } from "@/providers/auth-provider";
import { OwnerWeeklyLoad } from "./components/OwnerWeeklyLoad";
import { PlayerWeeklyLoad } from "./components/PlayerWeeklyLoad";

export function WeeklyLoadCard({
  role,
  className,
}: {
  role: SystemRole;
  className?: string;
}) {
  return (
    <Card
      size="sm"
      className={cn(
        "animate-fade-up rounded-sm border-primary px-2 py-5 [--card-spacing:--spacing(4)]",
        className,
      )}
      style={{ animationDelay: "80ms" }}
    >
      <CardHeader>
        <CardTitle className="label-mono!">
          {role === "owner" ? "Daily volume" : "Weekly load"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col justify-center gap-3">
        {role === "owner" ? <OwnerWeeklyLoad /> : <PlayerWeeklyLoad />}
      </CardContent>
    </Card>
  );
}
