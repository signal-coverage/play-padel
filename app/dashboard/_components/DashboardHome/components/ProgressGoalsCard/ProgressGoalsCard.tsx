import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import type { SystemRole } from "@/providers/auth-provider";
import { OwnerActivity } from "./components/OwnerActivity";
import { PlayerActivity } from "./components/PlayerActivity";

export function ProgressGoalsCard({
  role,
  className,
}: {
  role: SystemRole;
  className?: string;
}) {
  return (
    <Card
      size="sm"
      className={cn("rounded-2xl [--card-spacing:--spacing(4)]", className)}
    >
      <CardHeader>
        <CardTitle>Progress &amp; Goals</CardTitle>
      </CardHeader>
      <CardContent>
        {role === "owner" ? <OwnerActivity /> : <PlayerActivity />}
      </CardContent>
    </Card>
  );
}
