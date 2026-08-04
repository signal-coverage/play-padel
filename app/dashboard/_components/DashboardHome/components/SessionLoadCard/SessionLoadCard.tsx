import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import type { SystemRole } from "@/providers/auth-provider";
import { OwnerUtilization } from "./components/OwnerUtilization";
import { PlayerUtilization } from "./components/PlayerUtilization";
import {
  OWNER_UTILIZATION_RANGE_DAYS,
  PLAYER_CONSISTENCY_WEEKS,
} from "./consts";

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
      className={cn("rounded-xl [--card-spacing:--spacing(4)]", className)}
    >
      <CardHeader>
        <CardTitle>Session Load</CardTitle>
        <CardDescription>
          Last{" "}
          {role === "owner"
            ? `${OWNER_UTILIZATION_RANGE_DAYS} days`
            : `${PLAYER_CONSISTENCY_WEEKS} weeks`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center gap-1.5">
        {role === "owner" ? <OwnerUtilization /> : <PlayerUtilization />}
      </CardContent>
    </Card>
  );
}
