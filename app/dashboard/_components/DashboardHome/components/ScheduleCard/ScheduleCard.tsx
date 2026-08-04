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
        "overflow-hidden rounded-2xl [--card-spacing:--spacing(4)]",
        className,
      )}
    >
      <CardHeader>
        <CardTitle>Schedule</CardTitle>
        <CardDescription>
          {role === "owner" ? <OwnerTodayCaption /> : <PlayerTodayCaption />}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 overflow-y-auto sm:grid-cols-[auto_1fr]">
        {role === "owner" ? <OwnerSchedule /> : <PlayerSchedule />}
      </CardContent>
    </Card>
  );
}
