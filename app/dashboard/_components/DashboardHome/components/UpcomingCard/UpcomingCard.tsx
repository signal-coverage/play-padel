import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/utils";
import type { SystemRole } from "@/providers/auth-provider";
import { OwnerUpcoming } from "./components/OwnerUpcoming";
import { PlayerUpcoming } from "./components/PlayerUpcoming";

export function UpcomingCard({
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
        "animate-fade-up shrink-0 overflow-hidden rounded-sm px-3 py-5 border-primary [--card-spacing:--spacing(4)]",
        className,
      )}
      style={{ animationDelay: "380ms" }}
    >
      <CardHeader>
        <CardTitle className="label-mono!">Upcoming</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col overflow-y-auto">
        {role === "owner" ? <OwnerUpcoming /> : <PlayerUpcoming />}
      </CardContent>
    </Card>
  );
}
