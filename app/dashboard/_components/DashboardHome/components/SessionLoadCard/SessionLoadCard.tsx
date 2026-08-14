import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import type { SystemRole } from "@/providers/auth-provider";
import { OwnerSessionLoad } from "./components/OwnerSessionLoad";
import { PlayerSessionLoad } from "./components/PlayerSessionLoad";

export function SessionLoadCard({
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
      style={{ animationDelay: "160ms" }}
    >
      <CardHeader>
        <CardTitle className="label-mono!">
          {role === "owner" ? "Cancellation rate" : "Session load"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col justify-center gap-3">
        {role === "owner" ? <OwnerSessionLoad /> : <PlayerSessionLoad />}
      </CardContent>
    </Card>
  );
}
