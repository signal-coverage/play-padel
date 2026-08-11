import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import type { SystemRole } from "@/providers/auth-provider";
import { OwnerOverview } from "./components/OwnerOverview";
import { PlayerOverview } from "./components/PlayerOverview";

export function SkillOverviewCard({
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
        "animate-fade-up rounded-2xl [--card-spacing:--spacing(4)]",
        className,
      )}
      style={{ animationDelay: "80ms" }}
    >
      <CardHeader>
        <CardTitle className="label-mono!">Skill Overview</CardTitle>
        <CardAction>
          <span className="size-2 rounded-full bg-primary" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center gap-3">
        {role === "owner" ? <OwnerOverview /> : <PlayerOverview />}
      </CardContent>
    </Card>
  );
}
