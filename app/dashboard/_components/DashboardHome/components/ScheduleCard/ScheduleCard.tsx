import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import type { SystemRole } from "@/providers/auth-provider";
import { OwnerTodayCaption } from "./components/OwnerTodayCaption";
import { PlayerTodayCaption } from "./components/PlayerTodayCaption";
import { OwnerSchedule } from "./components/OwnerSchedule";
import { PlayerSchedule } from "./components/PlayerSchedule";

export function ScheduleCard({
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
        "animate-fade-up overflow-hidden rounded-xl border-0 [--card-spacing:--spacing(4)]",
        className,
      )}
      style={{ animationDelay: "280ms" }}
    >
      <CardHeader>
        <CardTitle className="label-mono!">Schedule</CardTitle>
        <CardDescription>
          {role === "owner" ? <OwnerTodayCaption /> : <PlayerTodayCaption />}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-y-auto">
        {role === "owner" ? <OwnerSchedule /> : <PlayerSchedule />}
      </CardContent>
    </Card>
  );
}
